// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "../src/WeatherOracle.sol";
import "../src/AgriHook.sol";

contract RedeployAgriHook is Script {
    address constant NEW_POOL_MANAGER = 0x85400B0619c353Af5554357e4D6bAf9d393701c0;
    address constant WEATHER_ORACLE = 0x223163b9109e43BdA9d719DF1e7E584d781b93fd;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        bytes32 hookSalt = vm.envOr("HOOK_SALT", bytes32(uint256(0x39b8)));

        console.log("Redeploying AgriHook with new PoolManager...");
        console.log("Deployer:", deployer);
        console.log("New PoolManager:", NEW_POOL_MANAGER);
        console.log("WeatherOracle:", WEATHER_ORACLE);

        vm.startBroadcast(deployerPrivateKey);

        AgriHook hook = new AgriHook{salt: hookSalt}(
            IPoolManager(NEW_POOL_MANAGER),
            WeatherOracle(WEATHER_ORACLE)
        );

        console.log("New AgriHook:", address(hook));

        // Verify hook address flags
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 addressFlags = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;
        
        console.log("Address flags match:", addressFlags == requiredFlags);

        vm.stopBroadcast();

        console.log("\nUpdate scripts with:");
        console.log("AGRI_HOOK=", address(hook));
    }
}
