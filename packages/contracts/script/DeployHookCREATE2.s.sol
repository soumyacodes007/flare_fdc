// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {AgriHook} from "../src/AgriHook.sol";
import {WeatherOracle} from "../src/WeatherOracle.sol";

contract DeployHookCREATE2 is Script {
    // Standard CREATE2 deployer address (same across all EVM chains)
    address constant CREATE2_DEPLOYER = address(0x4e59b44847b379578588920cA78FbF26c0B4956C);

    function run() public returns (AgriHook) {
        address poolManager = vm.envOr("POOL_MANAGER", address(0));
        address oracle = vm.envOr("ORACLE", address(0));
        bytes32 salt = vm.envOr("HOOK_SALT", bytes32(0));

        require(poolManager != address(0), "POOL_MANAGER not set");
        require(oracle != address(0), "ORACLE not set");
        require(salt != bytes32(0), "HOOK_SALT not set - run MineHookSalt.s.sol first");

        console.log("=================================================================");
        console.log("DEPLOYING AGRI HOOK WITH CREATE2");
        console.log("=================================================================");
        console.log("Deploying AgriHook with CREATE2");
        console.log("  poolManager:", poolManager);
        console.log("  oracle:", oracle);
        console.log("  salt: 0x%x", uint256(salt));
        console.log("");

        vm.startBroadcast();
        AgriHook hook = new AgriHook{salt: salt}(
            IPoolManager(poolManager),
            WeatherOracle(oracle)
        );
        vm.stopBroadcast();

        // Verify the hook address has correct flags
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
        );

        uint160 addressFlags = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;

        console.log("=================================================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("=================================================================");
        console.log("Hook deployed to:", address(hook));
        console.log("Address flags: 0x%x", addressFlags);
        console.log("Required flags: 0x%x", flags);
        console.log("Flags match:", addressFlags == flags);
        console.log("");

        require(addressFlags == flags, "Hook address does not have correct flags");

        // Validate hook permissions
        Hooks.validateHookPermissions(IHooks(address(hook)), hook.getHookPermissions());
        console.log("Hook permissions validated successfully!");
        console.log("");

        console.log("VERIFICATION COMMANDS:");
        console.log("-----------------------------------------------------------------");
        console.log("# Check hook oracle:");
        console.log("cast call", address(hook), '"oracle()(address)" --rpc-url coston2');
        console.log("");
        console.log("# Check cached price:");
        console.log("cast call", address(hook), '"cachedOraclePrice()(uint256)" --rpc-url coston2');
        console.log("");
        console.log("# Update price:");
        console.log("cast send", address(hook), '"updatePriceFromOracle(uint256,uint256)" \\');
        console.log("  5000000000000000000 $(date +%s) \\");
        console.log("  --rpc-url coston2 --private-key $PRIVATE_KEY");
        console.log("=================================================================");

        return hook;
    }
}
