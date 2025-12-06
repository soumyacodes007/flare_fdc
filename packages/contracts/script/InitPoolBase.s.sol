// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";

/**
 * @title InitPoolBase
 * @notice Initialize COFFEE/FBTC pool on Base Mainnet with AgriHook
 */
contract InitPoolBase is Script {
    using PoolIdLibrary for PoolKey;

    // Base Mainnet Uniswap V4
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    function run() external {
        // Load addresses from environment
        address coffee = vm.envAddress("COFFEE_ADDRESS_BASE");
        address fbtc = vm.envAddress("FBTC_ADDRESS_BASE");
        address hook = vm.envAddress("HOOK_ADDRESS_BASE");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=====================================");
        console.log("Initializing COFFEE/FBTC Pool on Base");
        console.log("=====================================");
        console.log("Deployer:", deployer);
        console.log("PoolManager:", POOL_MANAGER);
        console.log("COFFEE:", coffee);
        console.log("FBTC:", fbtc);
        console.log("Hook:", hook);

        // Determine token order (currency0 must be < currency1)
        Currency currency0;
        Currency currency1;

        if (uint160(coffee) < uint160(fbtc)) {
            currency0 = Currency.wrap(coffee);
            currency1 = Currency.wrap(fbtc);
            console.log("\nToken order: COFFEE (currency0) / FBTC (currency1)");
        } else {
            currency0 = Currency.wrap(fbtc);
            currency1 = Currency.wrap(coffee);
            console.log("\nToken order: FBTC (currency0) / COFFEE (currency1)");
        }

        // Pool configuration
        // fee = 0 means dynamic fee (hook controls it)
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 0x800000, // Dynamic fee flag
            tickSpacing: 60,
            hooks: IHooks(hook)
        });

        // Initial price: 1:1 ratio
        // sqrtPriceX96 = sqrt(1) * 2^96 = 2^96
        uint160 sqrtPriceX96 = 79228162514264337593543950336;

        console.log("\nPool Key:");
        console.log("  currency0:", Currency.unwrap(key.currency0));
        console.log("  currency1:", Currency.unwrap(key.currency1));
        console.log("  fee: 0x800000 (dynamic)");
        console.log("  tickSpacing:", key.tickSpacing);
        console.log("  hooks:", address(key.hooks));
        console.log("  sqrtPriceX96:", sqrtPriceX96, "(1:1 price)");

        vm.startBroadcast(deployerPrivateKey);

        IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96);

        vm.stopBroadcast();

        PoolId poolId = key.toId();
        console.log("\n=====================================");
        console.log("Pool initialized successfully!");
        console.log("=====================================");
        console.log("Pool ID:");
        console.logBytes32(PoolId.unwrap(poolId));

        console.log("\nNext: Add liquidity with script/AddLiquidityBase.s.sol");
    }
}
