// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "../src/WeatherOracleWithFTSO.sol";
import "../src/WeatherOracle.sol";
import "../src/InsuranceVault.sol";
import "../src/CoffeeToken.sol";
import "../src/MockFBTC.sol";
import "../src/AgriHook.sol";
import "../test/mocks/MockPoolManager.sol";

/**
 * @title DeployAllCoston2
 * @notice Complete deployment script with CREATE2 hook deployment
 * @dev Deploys all contracts including AgriHook with proper address flags
 */
contract DeployAllCoston2 is Script {
    // Coston2 System Addresses
    address constant FTSO_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    address constant FDC_VERIFICATION = 0x89D20A10A3014b2023023f01D9337583B9273c52;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get hook salt (must be pre-mined)
        bytes32 hookSalt = vm.envOr("HOOK_SALT", bytes32(uint256(0x24e8)));
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=================================================================");
        console.log("AGRI-HOOK COMPLETE DEPLOYMENT TO FLARE COSTON2");
        console.log("=================================================================");
        console.log("Deployer:", deployer);
        console.log("FTSO Registry:", FTSO_REGISTRY);
        console.log("FDC Verification:", FDC_VERIFICATION);
        console.log("Hook Salt: 0x%x", uint256(hookSalt));
        console.log("=================================================================\n");
        
        // ============================================
        // STEP 1: DEPLOY TOKENS
        // ============================================
        console.log("STEP 1: DEPLOYING TOKENS");
        console.log("-----------------------------------------------------------------");
        
        MockFBTC fbtc = new MockFBTC();
        console.log("MockFBTC:", address(fbtc));
        fbtc.mint(deployer, 1_000_000 * 10**18);
        
        CoffeeToken coffee = new CoffeeToken();
        console.log("CoffeeToken:", address(coffee));
        
        // ============================================
        // STEP 2: DEPLOY WEATHER ORACLE WITH FTSO
        // ============================================
        console.log("\nSTEP 2: DEPLOYING WEATHER ORACLE WITH FTSO");
        console.log("-----------------------------------------------------------------");
        
        uint256 initialBasePrice = 5 * 10**18;
        WeatherOracleWithFTSO weatherOracle = new WeatherOracleWithFTSO(initialBasePrice);
        console.log("WeatherOracleWithFTSO:", address(weatherOracle));
        
        // FTSO configuration skipped during deployment
        // Configure manually after deployment if needed
        console.log("FTSO configuration: SKIPPED (configure manually after deployment)");
        console.log("Initial base price:", initialBasePrice / 10**18, "FBTC");
        
        // ============================================
        // STEP 3: DEPLOY INSURANCE VAULT
        // ============================================
        console.log("\nSTEP 3: DEPLOYING INSURANCE VAULT");
        console.log("-----------------------------------------------------------------");
        
        WeatherOracle oracleInterface = WeatherOracle(address(weatherOracle));
        InsuranceVault vault = new InsuranceVault(oracleInterface);
        console.log("InsuranceVault:", address(vault));
        
        vault.fundTreasury{value: 10 ether}();
        console.log("Treasury funded: 10 CFLR");
        
        // ============================================
        // STEP 4: DEPLOY MOCK POOL MANAGER
        // ============================================
        console.log("\nSTEP 4: DEPLOYING MOCK POOL MANAGER");
        console.log("-----------------------------------------------------------------");
        
        MockPoolManager poolManager = new MockPoolManager();
        console.log("MockPoolManager:", address(poolManager));
        
        // ============================================
        // STEP 5: DEPLOY AGRI HOOK WITH CREATE2
        // ============================================
        console.log("\nSTEP 5: DEPLOYING AGRI HOOK WITH CREATE2");
        console.log("-----------------------------------------------------------------");
        
        // Deploy with CREATE2 using pre-mined salt
        AgriHook hook = new AgriHook{salt: hookSalt}(
            IPoolManager(address(poolManager)),
            oracleInterface
        );
        
        console.log("AgriHook:", address(hook));
        
        // Verify hook address flags
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 addressFlags = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;
        
        console.log("Address flags: 0x%x", addressFlags);
        console.log("Required flags: 0x%x", requiredFlags);
        console.log("Flags match:", addressFlags == requiredFlags);
        
        require(addressFlags == requiredFlags, "Hook address invalid");
        
        // Validate permissions
        Hooks.validateHookPermissions(IHooks(address(hook)), hook.getHookPermissions());
        console.log("Hook permissions validated!");
        
        vm.stopBroadcast();
        
        // ============================================
        // DEPLOYMENT SUMMARY
        // ============================================
        console.log("\n=================================================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("=================================================================");
        console.log("\nCONTRACT ADDRESSES:");
        console.log("-----------------------------------------------------------------");
        console.log("MockFBTC:              ", address(fbtc));
        console.log("CoffeeToken:           ", address(coffee));
        console.log("WeatherOracleWithFTSO: ", address(weatherOracle));
        console.log("InsuranceVault:        ", address(vault));
        console.log("MockPoolManager:       ", address(poolManager));
        console.log("AgriHook:              ", address(hook));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nENVIRONMENT VARIABLES (.env):");
        console.log("-----------------------------------------------------------------");
        console.log("WEATHER_ORACLE_ADDRESS=", address(weatherOracle));
        console.log("AGRI_HOOK_ADDRESS=", address(hook));
        console.log("INSURANCE_VAULT_ADDRESS=", address(vault));
        console.log("FBTC_ADDRESS=", address(fbtc));
        console.log("COFFEE_ADDRESS=", address(coffee));
        console.log("POOL_MANAGER_ADDRESS=", address(poolManager));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nQUICK TEST COMMANDS:");
        console.log("-----------------------------------------------------------------");
        console.log("# Test FTSO:");
        console.log("cast send", address(weatherOracle), '"updatePriceFromFTSO()" --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Test FDC:");
        console.log("npm run fdc:test minas_gerais");
        console.log("");
        console.log("# Simulate drought:");
        console.log("cast send", address(weatherOracle), '"updateWeatherSimple(uint256,int256,int256)" 0 -18512200 -44555000 --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Create policy:");
        console.log("cast send", address(vault), '"createPolicy(int256,int256,uint256)" -18512200 -44555000 5000000000 --value 1ether --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("-----------------------------------------------------------------");
        
        console.log("\n[SUCCESS] All contracts deployed!");
        console.log("=================================================================\n");
    }
}
