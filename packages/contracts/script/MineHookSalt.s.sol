// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {AgriHook} from "../src/AgriHook.sol";
import {WeatherOracle} from "../src/WeatherOracle.sol";

contract MineHookSalt is Script {
    // Standard CREATE2 deployer address (same across all EVM chains)
    address constant CREATE2_DEPLOYER = address(0x4e59b44847b379578588920cA78FbF26c0B4956C);

    function run() public {
        address poolManager = vm.envOr("POOL_MANAGER", address(0));
        address oracle = vm.envOr("ORACLE", address(0));

        require(poolManager != address(0), "POOL_MANAGER not set");
        require(oracle != address(0), "ORACLE not set");

        // AgriHook uses beforeSwap + afterSwap
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
        );

        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), WeatherOracle(oracle));

        console.log("=================================================================");
        console.log("MINING SALT FOR AGRI HOOK");
        console.log("=================================================================");
        console.log("Mining salt for hook with flags:");
        console.log("  beforeSwap: true");
        console.log("  afterSwap: true");
        console.log("  Required flag bits: 0x%x", flags);
        console.log("");
        console.log("Constructor args:");
        console.log("  poolManager:", poolManager);
        console.log("  oracle:", oracle);
        console.log("");
        console.log("This may take a few moments...");
        console.log("");

        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(AgriHook).creationCode, constructorArgs);

        console.log("=================================================================");
        console.log("SUCCESS!");
        console.log("=================================================================");
        console.log("Hook address:", hookAddress);
        console.log("Salt: 0x%x", uint256(salt));
        console.log("");
        console.log("NEXT STEPS:");
        console.log("-----------------------------------------------------------------");
        console.log("1. Add to your .env file:");
        console.log("   HOOK_SALT=%s", vm.toString(salt));
        console.log("");
        console.log("2. Deploy with this salt:");
        console.log("   forge script script/DeployHookCREATE2.s.sol \\");
        console.log("     --rpc-url $COSTON2_RPC \\");
        console.log("     --broadcast \\");
        console.log("     --private-key $PRIVATE_KEY");
        console.log("=================================================================");
    }
}
