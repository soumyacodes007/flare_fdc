// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";
import "../src/InsuranceVault.sol";
import "../src/AgriHook.sol";
import "../test/mocks/MockPoolManager.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployHookOnly
 * @notice Deployment script for AgriHook only - uses existing Oracle and Vault
 * @dev Deploys MockPoolManager and AgriHook, then links hook to existing vault
 */
contract DeployHookOnly is Script {
    // EXISTING DEPLOYED ADDRESSES - DO NOT REDEPLOY
    address constant WEATHER_ORACLE_ADDRESS = 0xAD74Af4e6C6C79900b673e73912527089fE7A47D;
    address constant INSURANCE_VAULT_ADDRESS = 0x96fe78279FAf7A13aa28Dbf95372C6211DfE5d4a;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=================================================================");
        console.log("AGRI-HOOK ONLY DEPLOYMENT");
        console.log("=================================================================");
        console.log("Deployer:", deployer);
        console.log("Using Existing Oracle:", WEATHER_ORACLE_ADDRESS);
        console.log("Using Existing Vault:", INSURANCE_VAULT_ADDRESS);
        console.log("=================================================================\n");
        
        // ============================================
        // STEP 1: DEPLOY MOCK POOL MANAGER
        // ============================================
        console.log("STEP 1: DEPLOYING MOCK POOL MANAGER");
        console.log("-----------------------------------------------------------------");
        console.log("Deploying MockPoolManager...");
        console.log("(For testing - replace with real Uniswap V4 PoolManager in production)");
        
        MockPoolManager mockPoolManager = new MockPoolManager();
        console.log("MockPoolManager deployed at:", address(mockPoolManager));
        
        // ============================================
        // STEP 2: DEPLOY AGRI HOOK
        // ============================================
        console.log("\n\nSTEP 2: DEPLOYING AGRI HOOK");
        console.log("-----------------------------------------------------------------");
        
        // Cast existing addresses to interfaces
        WeatherOracle oracle = WeatherOracle(WEATHER_ORACLE_ADDRESS);
        InsuranceVault vault = InsuranceVault(INSURANCE_VAULT_ADDRESS);
        
        console.log("Deploying AgriHook...");
        console.log("Constructor args:");
        console.log("  - PoolManager:", address(mockPoolManager));
        console.log("  - Oracle:", address(oracle));
        console.log("  - Vault:", address(vault));
        
        // AgriHook constructor: (IPoolManager _poolManager, WeatherOracle _oracle, InsuranceVault _vault)
        AgriHook hook = new AgriHook(
            IPoolManager(address(mockPoolManager)),
            oracle,
            vault
        );
        console.log("\nAgriHook deployed at:", address(hook));
        
        // ============================================
        // STEP 3: LINK HOOK TO EXISTING VAULT
        // ============================================
        console.log("\n\nSTEP 3: LINKING HOOK TO EXISTING VAULT");
        console.log("-----------------------------------------------------------------");
        console.log("Calling vault.setAuthorizedHook()...");
        
        vault.setAuthorizedHook(address(hook));
        console.log("SUCCESS: Hook authorized in vault");
        console.log("Authorized Hook:", address(hook));
        
        vm.stopBroadcast();
        
        // ============================================
        // DEPLOYMENT SUMMARY
        // ============================================
        console.log("\n\n=================================================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("=================================================================");
        console.log("\nNEW CONTRACT ADDRESSES:");
        console.log("-----------------------------------------------------------------");
        console.log("MockPoolManager:", address(mockPoolManager));
        console.log("AgriHook:       ", address(hook));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nEXISTING CONTRACT ADDRESSES (NOT REDEPLOYED):");
        console.log("-----------------------------------------------------------------");
        console.log("WeatherOracle:  ", WEATHER_ORACLE_ADDRESS);
        console.log("InsuranceVault: ", INSURANCE_VAULT_ADDRESS);
        console.log("-----------------------------------------------------------------");
        
        console.log("\nFRONTEND CONFIGURATION:");
        console.log("-----------------------------------------------------------------");
        console.log("Add these NEW addresses to your frontend .env file:");
        console.log("");
        console.log("NEXT_PUBLIC_POOL_MANAGER_ADDRESS=", address(mockPoolManager));
        console.log("NEXT_PUBLIC_HOOK_ADDRESS=", address(hook));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nVERIFICATION COMMANDS:");
        console.log("-----------------------------------------------------------------");
        console.log("# Verify hook is authorized:");
        console.log("cast call", INSURANCE_VAULT_ADDRESS, '"authorizedHook()(address)" --rpc-url coston2');
        console.log("");
        console.log("# Check hook configuration:");
        console.log("cast call", address(hook), '"poolManager()(address)" --rpc-url coston2');
        console.log("cast call", address(hook), '"weatherOracle()(address)" --rpc-url coston2');
        console.log("cast call", address(hook), '"insuranceVault()(address)" --rpc-url coston2');
        console.log("-----------------------------------------------------------------");
        
        console.log("\nNEXT STEPS:");
        console.log("-----------------------------------------------------------------");
        console.log("1. Verify hook authorization in vault");
        console.log("2. Test hook integration with pool manager");
        console.log("3. Update frontend with new hook address");
        console.log("4. Test end-to-end flow with existing oracle and vault");
        console.log("-----------------------------------------------------------------");
        
        console.log("\n[SUCCESS] Hook deployment complete!");
        console.log("=================================================================\n");
    }
}
