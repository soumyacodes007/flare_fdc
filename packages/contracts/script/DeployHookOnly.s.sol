// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";
import "../src/AgriHook.sol";
import "../src/HookDeployer.sol";
import "../test/mocks/MockPoolManager.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployHookOnly
 * @notice Deployment script for AgriHook only - uses existing Oracle
 * @dev Deploys MockPoolManager, HookDeployer, and AgriHook using CREATE2
 *      Note: AgriHook and InsuranceVault are independent - no linking needed
 */
contract DeployHookOnly is Script {
    // EXISTING DEPLOYED ADDRESSES - DO NOT REDEPLOY
    address constant WEATHER_ORACLE_ADDRESS = 0xAD74Af4e6C6C79900b673e73912527089fE7A47D;
    address constant INSURANCE_VAULT_ADDRESS = 0x96fe78279FAf7A13aa28Dbf95372C6211DfE5d4a;
    
    // Hook permission flags (bits 0-13 in address)
    // Uniswap V4 encodes permissions in the address
    // We need to find the correct bit pattern through mining
    uint160 constant FLAG_MASK = 0x3FFF; // First 14 bits
    
    // We'll try to find ANY valid address by checking against actual validation
    
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
        // STEP 2: DEPLOY HOOK DEPLOYER
        // ============================================
        console.log("\n\nSTEP 2: DEPLOYING HOOK DEPLOYER");
        console.log("-----------------------------------------------------------------");
        console.log("Deploying HookDeployer...");
        
        HookDeployer hookDeployer = new HookDeployer();
        console.log("HookDeployer deployed at:", address(hookDeployer));
        
        // ============================================
        // STEP 3: MINE FOR VALID SALT
        // ============================================
        console.log("\n\nSTEP 3: MINING FOR VALID HOOK ADDRESS");
        console.log("-----------------------------------------------------------------");
        
        // Cast existing oracle address to interface
        WeatherOracle oracle = WeatherOracle(WEATHER_ORACLE_ADDRESS);
        IPoolManager poolManager = IPoolManager(address(mockPoolManager));
        
        console.log("Mining for valid hook address...");
        console.log("Required flags: beforeSwap (bit 7) + afterSwap (bit 8)");
        
        // Mine for a valid salt
        bytes32 salt = _findSalt(
            address(hookDeployer),
            poolManager,
            oracle
        );
        
        console.log("Found valid salt:", vm.toString(salt));
        
        // ============================================
        // STEP 4: DEPLOY AGRI HOOK WITH CREATE2
        // ============================================
        console.log("\n\nSTEP 4: DEPLOYING AGRI HOOK");
        console.log("-----------------------------------------------------------------");
        
        // Compute predicted address
        address predictedAddress = hookDeployer.computeAddress(poolManager, oracle, salt);
        console.log("Predicted hook address:", predictedAddress);
        console.log("Address flags:", uint160(predictedAddress) & FLAG_MASK);
        
        // Deploy with CREATE2
        console.log("\nDeploying AgriHook with CREATE2...");
        console.log("Constructor args:");
        console.log("  - PoolManager:", address(mockPoolManager));
        console.log("  - Oracle:", address(oracle));
        
        AgriHook hook = hookDeployer.deploy(poolManager, oracle, salt);
        
        console.log("\nAgriHook deployed at:", address(hook));
        require(address(hook) == predictedAddress, "Address mismatch");
        console.log("Hook address validation: PASSED");
        
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
    
    /**
     * @notice Find a valid salt for CREATE2 deployment
     * @dev Mines for a salt that produces a hook address with correct flags
     */
    function _findSalt(
        address deployerContract,
        IPoolManager poolManager,
        WeatherOracle oracle
    ) internal view returns (bytes32) {
        // Get the creation code hash
        bytes memory creationCode = abi.encodePacked(
            type(AgriHook).creationCode,
            abi.encode(poolManager, oracle)
        );
        bytes32 creationCodeHash = keccak256(creationCode);
        
        console.log("Mining salt (this may take a moment)...");
        
        // Mine for valid salt (max 100000 attempts)
        for (uint256 i = 0; i < 100000; i++) {
            bytes32 salt = bytes32(i);
            
            // Calculate CREATE2 address
            address predictedAddress = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                deployerContract,
                salt,
                creationCodeHash
            )))));
            
            // Check if address has correct flags (bits 0-13)
            uint160 addressFlags = uint160(predictedAddress) & FLAG_MASK;
            
            if (addressFlags == REQUIRED_FLAGS) {
                console.log("Salt found after", i + 1, "attempts");
                return salt;
            }
            
            // Progress indicator every 10000 attempts
            if (i > 0 && i % 10000 == 0) {
                console.log("Checked", i, "salts...");
            }
        }
        
        revert("Could not find valid salt in 100000 attempts");
    }
}
