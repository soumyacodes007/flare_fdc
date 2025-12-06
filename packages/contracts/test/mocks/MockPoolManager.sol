// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, toBalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockPoolManager
 * @notice Simulated PoolManager for demo on Coston2 (where V4 doesn't exist)
 */
contract MockPoolManager {
    using PoolIdLibrary for PoolKey;

    struct Pool {
        bool initialized;
        uint160 sqrtPriceX96;
        int24 tick;
        uint128 liquidity;
    }

    mapping(PoolId => Pool) public pools;
    mapping(PoolId => uint256) public reserve0;
    mapping(PoolId => uint256) public reserve1;

    uint24 public lastFeeSet;
    bool public unlocked;

    event Initialize(PoolId indexed id, Currency currency0, Currency currency1, uint24 fee, int24 tickSpacing, IHooks hooks, uint160 sqrtPriceX96, int24 tick);
    event Swap(PoolId indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee);
    event ModifyLiquidity(PoolId indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt);

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick) {
        require(Currency.unwrap(key.currency0) < Currency.unwrap(key.currency1), "Currencies out of order");
        
        PoolId id = key.toId();
        require(!pools[id].initialized, "Already initialized");

        tick = _getTickFromSqrtPrice(sqrtPriceX96);
        
        pools[id] = Pool({
            initialized: true,
            sqrtPriceX96: sqrtPriceX96,
            tick: tick,
            liquidity: 0
        });

        emit Initialize(id, key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks, sqrtPriceX96, tick);
    }


    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata
    ) external returns (BalanceDelta, BalanceDelta) {
        PoolId id = key.toId();
        require(pools[id].initialized, "Not initialized");

        if (params.liquidityDelta > 0) {
            pools[id].liquidity += uint128(int128(params.liquidityDelta));
        } else if (params.liquidityDelta < 0) {
            pools[id].liquidity -= uint128(int128(-params.liquidityDelta));
        }

        emit ModifyLiquidity(id, msg.sender, params.tickLower, params.tickUpper, params.liquidityDelta, params.salt);
        
        return (toBalanceDelta(0, 0), toBalanceDelta(0, 0));
    }

    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata
    ) external returns (BalanceDelta) {
        PoolId id = key.toId();
        Pool storage pool = pools[id];
        require(pool.initialized, "Not initialized");

        // Use base fee (skip hook calls for demo - hook was deployed with different pool manager)
        uint24 fee = key.fee;

        // Simulate swap (simplified 1:1)
        int128 amount0;
        int128 amount1;
        
        if (params.zeroForOne) {
            amount0 = int128(params.amountSpecified);
            amount1 = -int128(params.amountSpecified);
        } else {
            amount0 = -int128(params.amountSpecified);
            amount1 = int128(params.amountSpecified);
        }

        emit Swap(id, msg.sender, amount0, amount1, pool.sqrtPriceX96, pool.liquidity, pool.tick, fee);
        
        lastFeeSet = fee;
        return toBalanceDelta(amount0, amount1);
    }

    function updateDynamicLPFee(PoolKey calldata, uint24 newFee) external {
        lastFeeSet = newFee;
    }

    function take(Currency, address, uint256) external {}
    function settle() external payable returns (uint256) { return msg.value; }
    function sync(Currency) external {}

    function getPool(PoolKey memory key) external view returns (Pool memory) {
        return pools[key.toId()];
    }

    function _getTickFromSqrtPrice(uint160 sqrtPriceX96) internal pure returns (int24) {
        // Simplified tick calculation
        if (sqrtPriceX96 < 79228162514264337593543950336) return -1;
        if (sqrtPriceX96 > 79228162514264337593543950336) return 1;
        return 0;
    }
}
