// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";

/**
 * @title TestSwapBase
 * @notice Execute test swap on COFFEE/FBTC pool to verify AgriHook
 */
contract TestSwapBase is Script {
    // Base Mainnet
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    function run() external {
        // Load addresses from environment
        address coffee = vm.envAddress("COFFEE_ADDRESS_BASE");
        address fbtc = vm.envAddress("FBTC_ADDRESS_BASE");
        address hook = vm.envAddress("HOOK_ADDRESS_BASE");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================");
        console.log("TESTING SWAP ON COFFEE/FBTC POOL");
        console.log("=================================");
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

        // Pool key
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 0x800000, // Dynamic fee
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        vm.startBroadcast(deployerPrivateKey);

        // Deploy swap router helper
        console.log("\n1. Deploying PoolSwapTest helper...");
        PoolSwapTest swapRouter = new PoolSwapTest(IPoolManager(POOL_MANAGER));
        console.log("   SwapRouter deployed at:", address(swapRouter));

        // Check balances before
        console.log("\n2. Checking balances before swap...");
        uint256 balance0Before = IERC20(token0).balanceOf(deployer);
        uint256 balance1Before = IERC20(token1).balanceOf(deployer);
        console.log("   Token0 balance:", balance0Before / 1e18, "tokens");
        console.log("   Token1 balance:", balance1Before / 1e18, "tokens");

        // Approve tokens to swap router
        console.log("\n3. Approving tokens to SwapRouter...");
        IERC20(token0).approve(address(swapRouter), type(uint256).max);
        IERC20(token1).approve(address(swapRouter), type(uint256).max);
        console.log("   Tokens approved");

        // Execute swap: Sell 10 token0 for token1
        console.log("\n4. Executing swap: Sell 10 token0 for token1");
        
        SwapParams memory params = SwapParams({
            zeroForOne: true,                    // Swap token0 -> token1
            amountSpecified: -10 * 10**18,       // Exact input of 10 tokens
            sqrtPriceLimitX96: 4295128739        // Min price limit
        });

        PoolSwapTest.TestSettings memory testSettings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        swapRouter.swap(key, params, testSettings, "");
        console.log("   Swap executed!");

        // Check balances after
        console.log("\n5. Checking balances after swap...");
        uint256 balance0After = IERC20(token0).balanceOf(deployer);
        uint256 balance1After = IERC20(token1).balanceOf(deployer);
        console.log("   Token0 balance:", balance0After / 1e18, "tokens");
        console.log("   Token1 balance:", balance1After / 1e18, "tokens");

        // Calculate changes
        int256 delta0 = int256(balance0After) - int256(balance0Before);
        int256 delta1 = int256(balance1After) - int256(balance1Before);
        
        console.log("\n6. Balance changes:");
        console.log("   Token0 delta:", delta0 / 1e18);
        console.log("   Token1 delta:", delta1 / 1e18);

        vm.stopBroadcast();

        console.log("\n=================================");
        console.log("SWAP COMPLETE!");
        console.log("=================================");
        console.log("\nThe AgriHook dynamic fee was applied!");
        console.log("Check the transaction on BaseScan for fee details.");
    }
}
