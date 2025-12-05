// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { BaseHook } from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { PoolId, PoolIdLibrary } from "@uniswap/v4-core/src/types/PoolId.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { Currency, CurrencyLibrary } from "@uniswap/v4-core/src/types/Currency.sol";
import { BeforeSwapDelta, BeforeSwapDeltaLibrary } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { WeatherOracle } from "./WeatherOracle.sol";
import { FeeCurve } from "./libraries/FeeCurve.sol";
import { BonusCurve } from "./libraries/BonusCurve.sol";

/**
 * @title AgriHook
 * @notice Uniswap V4 Hook for agricultural commodity protection
 * @dev Implements dynamic fees and bonuses based on weather-adjusted oracle prices
 * 
 * CORE INNOVATIONS:
 * 1. Arbitrage Capture: Fees = exact arbitrage gap (bots pay fair value)
 * 2. Weather-Adjusted Pricing: Oracle combines market price + weather data
 * 3. Quadratic Bonuses: Exponential rewards for fixing large deviations
 * 4. Circuit Breaker: Three-tier protection (Normal/Recovery/Frozen)
 * 5. Self-Funding: Bot fees fund farmer protection
 */
contract AgriHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    WeatherOracle public immutable oracle;

    // Circuit Breaker Thresholds (Innovation #4)
    uint256 public constant RECOVERY_THRESHOLD = 50;      // 50% gap triggers recovery mode
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 100; // 100% gap freezes pool
    
    // Fee Configuration (Innovation #1)
    uint24 public constant ALIGNED_FEE = 10;              // 0.01% for aligned traders
    uint24 public constant BASE_FEE = 3000;               // 0.3% base fee
    uint24 public constant MAX_MISALIGNED_FEE = 100000;   // 10% max fee (100% gap)
    uint256 public constant FEE_MULTIPLIER = 10;          // Quadratic fee scaling
    
    // Bonus Configuration (Innovation #3)
    uint256 public constant MAX_BONUS_RATE = 500;         // 5% max bonus
    uint256 public constant BONUS_MULTIPLIER = 5;         // Quadratic bonus scaling
    uint256 public constant BONUS_SCALE_FACTOR = 10000;   // Basis points
    
    // Pool State
    mapping(PoolId => uint256) public poolPrice;          // Current pool price
    mapping(PoolId => uint256) public treasuryBalance;    // Treasury for bonuses
    mapping(PoolId => bool) public circuitBreakerActive;  // Pool frozen status
    mapping(PoolId => uint256) public lastRebalanceTime;  // Last rebalancing timestamp
    
    // Oracle Cache (Innovation #2)
    uint256 public cachedOraclePrice;                     // Weather-adjusted price
    uint256 public lastPriceUpdate;

    // Events
    event PriceReceivedFromOracle(uint256 price, uint256 timestamp);
    event BonusPaid(PoolId indexed poolId, address indexed trader, uint256 amount);
    event TreasuryFunded(PoolId indexed poolId, uint256 amount);
    event CircuitBreakerTriggered(PoolId indexed poolId, uint256 deviation);
    event CircuitBreakerCleared(PoolId indexed poolId);
    event PoolRebalanced(PoolId indexed poolId, address indexed rebalancer, uint256 amount, uint256 bonus);
    event ArbitrageCaptured(PoolId indexed poolId, address indexed trader, uint256 fee);

    constructor(
        IPoolManager _poolManager,
        WeatherOracle _oracle
    ) BaseHook(_poolManager) {
        oracle = _oracle;
        cachedOraclePrice = _oracle.getTheoreticalPrice();
        lastPriceUpdate = block.timestamp;
    }

    /**
     * @notice Update oracle price cache (called by oracle or keeper)
     * @param price New weather-adjusted price
     * @param timestamp Price timestamp
     */
    function updatePriceFromOracle(uint256 price, uint256 timestamp) external {
        require(price > 0, "Invalid price");
        require(timestamp <= block.timestamp, "Future timestamp");

        cachedOraclePrice = price;
        lastPriceUpdate = timestamp;

        emit PriceReceivedFromOracle(price, timestamp);
    }

    /**
     * @notice Set pool price manually (for testing/emergency)
     * @param key Pool key
     * @param price New pool price
     */
    function setPoolPrice(PoolKey calldata key, uint256 price) external {
        PoolId poolId = key.toId();
        poolPrice[poolId] = price;
    }

    /**
     * @notice Fund treasury for bonus payments
     * @param key Pool key
     */
    function fundTreasury(PoolKey calldata key) external payable {
        PoolId poolId = key.toId();
        treasuryBalance[poolId] += msg.value;
        emit TreasuryFunded(poolId, msg.value);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Calculate price deviation percentage (Innovation #1)
     * @param currentPoolPrice Current pool price
     * @param theoreticalPrice Weather-adjusted oracle price
     * @return Deviation as percentage (e.g., 50 = 50%)
     */
    function calculateDeviation(
        uint256 currentPoolPrice,
        uint256 theoreticalPrice
    ) public pure returns (uint256) {
        if (currentPoolPrice > theoreticalPrice) {
            return ((currentPoolPrice - theoreticalPrice) * 100) / theoreticalPrice;
        } else {
            return ((theoreticalPrice - currentPoolPrice) * 100) / theoreticalPrice;
        }
    }

    /**
     * @notice Check if trader is aligned (helping fix price) or misaligned (exploiting)
     * @param currentPoolPrice Current pool price
     * @param theoreticalPrice Oracle price
     * @param isBuying True if trader is buying the commodity token
     * @return True if trader is aligned (helping convergence)
     */
    function isTraderAligned(
        uint256 currentPoolPrice,
        uint256 theoreticalPrice,
        bool isBuying
    ) public pure returns (bool) {
        if (currentPoolPrice == theoreticalPrice) {
            return true; // At equilibrium, all trades are aligned
        }
        
        if (currentPoolPrice > theoreticalPrice) {
            // Pool price too high, need sellers to push it down
            return !isBuying; // Sellers are aligned
        } else {
            // Pool price too low, need buyers to push it up
            return isBuying; // Buyers are aligned
        }
    }

    /**
     * @notice Get current operating mode based on deviation (Innovation #4)
     * @param deviation Price deviation percentage
     * @return mode 0=Normal, 1=Recovery, 2=CircuitBreaker
     */
    function getOperatingMode(uint256 deviation) public pure returns (uint8) {
        if (deviation >= CIRCUIT_BREAKER_THRESHOLD) {
            return 2; // Circuit Breaker Mode
        } else if (deviation >= RECOVERY_THRESHOLD) {
            return 1; // Recovery Mode
        } else {
            return 0; // Normal Mode
        }
    }

    /**
     * @notice Hook called before swap - implements dynamic fee logic
     * @dev Innovation #1: Arbitrage Capture Fee
     *      Innovation #4: Circuit Breaker checks
     */
    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();

        // Get current pool price (or use oracle as fallback)
        uint256 currentPoolPrice = poolPrice[poolId];
        if (currentPoolPrice == 0) {
            currentPoolPrice = cachedOraclePrice;
        }

        // Get weather-adjusted theoretical price (Innovation #2)
        uint256 theoreticalPrice = cachedOraclePrice;

        // Calculate deviation percentage
        uint256 deviation = calculateDeviation(currentPoolPrice, theoreticalPrice);

        // Check operating mode (Innovation #4)
        uint8 mode = getOperatingMode(deviation);

        // CIRCUIT BREAKER MODE: Block all swaps if gap >= 100%
        if (mode == 2) {
            if (!circuitBreakerActive[poolId]) {
                circuitBreakerActive[poolId] = true;
                emit CircuitBreakerTriggered(poolId, deviation);
            }
            revert("Circuit breaker active - use rebalancePool()");
        }

        // Determine if trader is buying the commodity token
        bool isBuyingCommodity = params.zeroForOne == (Currency.unwrap(key.currency0) < Currency.unwrap(key.currency1));
        
        // Check if trader is aligned (helping fix price)
        bool isAligned = isTraderAligned(currentPoolPrice, theoreticalPrice, isBuyingCommodity);

        uint24 fee;
        
        if (isAligned) {
            // ALIGNED TRADER: Pay minimal fee (0.01%)
            fee = ALIGNED_FEE;
        } else {
            // MISALIGNED TRADER: Pay arbitrage capture fee (Innovation #1)
            // Fee = Gap percentage (quadratic scaling)
            fee = FeeCurve.quadraticFee(
                deviation,
                BASE_FEE,
                FEE_MULTIPLIER,
                MAX_MISALIGNED_FEE
            );
            
            emit ArbitrageCaptured(poolId, msg.sender, fee);
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }

    /**
     * @notice Hook called after swap - implements bonus payment logic
     * @dev Innovation #3: Quadratic Bonus System
     *      Pays bonuses to aligned traders from treasury
     */
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();

        // Get current prices
        uint256 currentPoolPrice = poolPrice[poolId];
        if (currentPoolPrice == 0) {
            currentPoolPrice = cachedOraclePrice;
        }

        uint256 theoreticalPrice = cachedOraclePrice;
        uint256 deviation = calculateDeviation(currentPoolPrice, theoreticalPrice);

        // Only pay bonuses in RECOVERY MODE (50-100% gap)
        uint8 mode = getOperatingMode(deviation);
        if (mode != 1) {
            return (BaseHook.afterSwap.selector, 0);
        }

        // Determine if trader is buying commodity
        bool isBuyingCommodity = params.zeroForOne == (Currency.unwrap(key.currency0) < Currency.unwrap(key.currency1));
        
        // Check if trader is aligned
        bool isAligned = isTraderAligned(currentPoolPrice, theoreticalPrice, isBuyingCommodity);

        // ALIGNED TRADERS GET BONUSES (Innovation #3)
        if (isAligned && deviation > 0) {
            // Calculate swap amount
            uint256 swapAmount = uint256(int256(delta.amount0() > 0 ? delta.amount0() : -delta.amount0()));

            // Calculate quadratic bonus rate
            // Formula: bonus = (deviation² × multiplier) / 10000
            // Capped at MAX_BONUS_RATE (5%)
            uint256 bonusRate = BonusCurve.quadraticBonus(
                deviation,
                BONUS_MULTIPLIER,
                MAX_BONUS_RATE
            );

            // Calculate bonus amount
            uint256 bonusAmount = (swapAmount * bonusRate) / BONUS_SCALE_FACTOR;

            // Pay bonus if treasury has funds
            if (treasuryBalance[poolId] >= bonusAmount && bonusAmount > 0) {
                treasuryBalance[poolId] -= bonusAmount;
                
                // TODO: Transfer bonus to sender
                // This requires additional logic to handle token transfers
                
                emit BonusPaid(poolId, sender, bonusAmount);
            }
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    /**
     * @notice Rebalance pool when circuit breaker is active (Innovation #5)
     * @param key Pool key
     * @dev Allows large capital deposits to unfreeze the pool
     *      Rebalancer receives quadratic bonus for providing liquidity
     */
    function rebalancePool(PoolKey calldata key) external payable {
        PoolId poolId = key.toId();
        
        require(circuitBreakerActive[poolId], "Circuit breaker not active");
        require(msg.value > 0, "Must provide capital");

        uint256 currentPoolPrice = poolPrice[poolId];
        if (currentPoolPrice == 0) {
            currentPoolPrice = cachedOraclePrice;
        }

        uint256 theoreticalPrice = cachedOraclePrice;
        uint256 deviation = calculateDeviation(currentPoolPrice, theoreticalPrice);

        // Calculate rebalancing bonus (capped at 5%)
        uint256 bonusRate = BonusCurve.quadraticBonus(
            deviation,
            BONUS_MULTIPLIER,
            MAX_BONUS_RATE
        );

        uint256 bonusAmount = (msg.value * bonusRate) / BONUS_SCALE_FACTOR;

        // Add capital to treasury
        treasuryBalance[poolId] += msg.value;

        // Pay bonus to rebalancer
        if (bonusAmount > 0) {
            treasuryBalance[poolId] -= bonusAmount;
            // TODO: Transfer bonus
        }

        // Clear circuit breaker if deviation now < 100%
        // (This would happen after liquidity is actually added to pool)
        uint256 newDeviation = calculateDeviation(currentPoolPrice, theoreticalPrice);
        if (newDeviation < CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreakerActive[poolId] = false;
            emit CircuitBreakerCleared(poolId);
        }

        lastRebalanceTime[poolId] = block.timestamp;
        emit PoolRebalanced(poolId, msg.sender, msg.value, bonusAmount);
    }

    /**
     * @notice Get pool status information
     * @param key Pool key
     * @return currentPrice Current pool price
     * @return oraclePrice Weather-adjusted oracle price
     * @return deviation Deviation percentage
     * @return mode Operating mode (0=Normal, 1=Recovery, 2=CircuitBreaker)
     * @return treasury Treasury balance
     */
    function getPoolStatus(PoolKey calldata key) external view returns (
        uint256 currentPrice,
        uint256 oraclePrice,
        uint256 deviation,
        uint8 mode,
        uint256 treasury
    ) {
        PoolId poolId = key.toId();
        
        currentPrice = poolPrice[poolId];
        if (currentPrice == 0) {
            currentPrice = cachedOraclePrice;
        }
        
        oraclePrice = cachedOraclePrice;
        deviation = calculateDeviation(currentPrice, oraclePrice);
        mode = getOperatingMode(deviation);
        treasury = treasuryBalance[poolId];
    }
}
