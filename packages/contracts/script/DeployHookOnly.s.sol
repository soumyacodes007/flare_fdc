// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";
import "../src/AgriHook.sol";
import "../test/mocks/MockPoolManager.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployHookOnly
 * @notice Deployment script for AgriHook only - uses existing Oracle
 * @dev Deploys MockPoolManager and AgriHook
 *      Note: AgriHook and InsuranceVault are independent - no linking needed
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
        console.log("Existing Vault (independent):", INSURANCE_VAULT_ADDRESS);
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
        
        // Cast existing oracle address to interface
        WeatherOracle oracle = WeatherOracle(WEATHER_ORACLE_ADDRESS);
        
        console.log("Deploying AgriHook...");
        console.log("Constructor args:");
        console.log("  - PoolManager:", address(mockPoolManager));
        console.log("  - Oracle:", address(oracle));
        
        // AgriHook constructor: (IPoolManager _poolManager, WeatherOracle _oracle)
        AgriHook hook = new AgriHook(
            IPoolManager(address(mockPoolManager)),
            oracle
        );
        console.log("\nAgriHook deployed at:", address(hook));
        
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
        console.log("# Check hook configuration:");
        console.log("cast call", address(hook), '"oracle()(address)" --rpc-url coston2');
        console.log("cast call", address(hook), '"cachedOraclePrice()(uint256)" --rpc-url coston2');
        console.log("");
        console.log("# Check pool manager:");
        console.log("cast call", address(mockPoolManager), '"owner()(address)" --rpc-url coston2');
        console.log("");
        console.log("# Test hook price update:");
        console.log("cast send", address(hook), '"updatePriceFromOracle(uint256,uint256)" 5000000000000000000 $(date +%s) --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("-----------------------------------------------------------------");
        
        console.log("\nARCHITECTURE NOTES:");
        console.log("-----------------------------------------------------------------");
        console.log("AgriHook and InsuranceVault are INDEPENDENT contracts:");
        console.log("  - AgriHook: Manages Uniswap V4 pool fees/bonuses");
        console.log("  - InsuranceVault: Manages farmer insurance policies");
        console.log("  - Both use WeatherOracle for weather data");
        console.log("  - No direct connection needed between Hook and Vault");
        console.log("-----------------------------------------------------------------");
        
        console.log("\nNEXT STEPS:");
        console.log("-----------------------------------------------------------------");
        console.log("1. Update frontend with new hook address");
        console.log("2. Test hook with mock pool manager");
        console.log("3. Update hook price from oracle");
        console.log("4. Test dynamic fee calculation");
        console.log("5. Fund hook treasury for bonuses");
        console.log("-----------------------------------------------------------------");
        
        console.log("\n[SUCCESS] Hook deployment complete!");
        console.log("=================================================================\n");
    }
}
