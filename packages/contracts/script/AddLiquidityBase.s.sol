// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
}

interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/**
 * @title AddLiquidityBase
 * @notice Add liquidity to COFFEE/FBTC pool on Base Mainnet
 */
contract AddLiquidityBase is Script {
    // Base Mainnet addresses
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // Action constants for PositionManager
    uint256 constant MINT_POSITION = 0x02;
    uint256 constant CLOSE_CURRENCY = 0x12;

    function run() external {
        // Load addresses from environment
        address coffee = vm.envAddress("COFFEE_ADDRESS_BASE");
        address fbtc = vm.envAddress("FBTC_ADDRESS_BASE");
        address hook = vm.envAddress("HOOK_ADDRESS_BASE");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=====================================");
        console.log("Adding Liquidity to COFFEE/FBTC Pool");
        console.log("=====================================");
        console.log("Deployer:", deployer);

        // Determine token order
        Currency currency0;
        Currency currency1;
        address token0;
        address token1;

        if (uint160(coffee) < uint160(fbtc)) {
            currency0 = Currency.wrap(coffee);
            currency1 = Currency.wrap(fbtc);
            token0 = coffee;
            token1 = fbtc;
        } else {
            currency0 = Currency.wrap(fbtc);
            currency1 = Currency.wrap(coffee);
            token0 = fbtc;
            token1 = coffee;
        }

        console.log("Token0:", token0);
        console.log("Token1:", token1);

        // Pool key
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 0x800000, // Dynamic fee
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        // Liquidity parameters
        int24 tickLower = -120;  // Wide range
        int24 tickUpper = 120;
        uint256 liquidity = 100000 * 10**18; // 100k liquidity units
        uint128 amount0Max = type(uint128).max;
        uint128 amount1Max = type(uint128).max;

        console.log("\nLiquidity Parameters:");
        console.log("  tickLower:", tickLower);
        console.log("  tickUpper:", tickUpper);
        console.log("  liquidity:", liquidity);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Approve tokens to Permit2
        console.log("\n1. Approving tokens to Permit2...");
        IERC20(token0).approve(PERMIT2, type(uint256).max);
        IERC20(token1).approve(PERMIT2, type(uint256).max);
        console.log("   Tokens approved to Permit2");

        // Step 2: Set Permit2 allowance for PositionManager
        console.log("\n2. Setting Permit2 allowance for PositionManager...");
        IPermit2(PERMIT2).approve(token0, POSITION_MANAGER, type(uint160).max, type(uint48).max);
        IPermit2(PERMIT2).approve(token1, POSITION_MANAGER, type(uint160).max, type(uint48).max);
        console.log("   Permit2 allowances set");

        // Step 3: Encode mint position parameters
        bytes memory mintParams = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            deployer,
            bytes("")
        );

        // Step 4: Build actions array
        bytes memory actions = new bytes(3);
        actions[0] = bytes1(uint8(MINT_POSITION));
        actions[1] = bytes1(uint8(CLOSE_CURRENCY));
        actions[2] = bytes1(uint8(CLOSE_CURRENCY));

        bytes[] memory params = new bytes[](3);
        params[0] = mintParams;
        params[1] = abi.encode(currency0);
        params[2] = abi.encode(currency1);

        bytes memory unlockData = abi.encode(actions, params);
        uint256 deadline = block.timestamp + 3600;

        // Step 5: Add liquidity
        console.log("\n3. Minting liquidity position...");
        IPositionManager(POSITION_MANAGER).modifyLiquidities(unlockData, deadline);

        vm.stopBroadcast();

        console.log("\n=====================================");
        console.log("Liquidity added successfully!");
        console.log("=====================================");
        console.log("\nNext: Test swap with script/TestSwapBase.s.sol");
    }
}
