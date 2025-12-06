// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracleWithFTSO.sol";
import "../src/WeatherOracle.sol";
import "../src/InsuranceVault.sol";
import "../src/CoffeeToken.sol";
import "../src/MockFBTC.sol";
import "../src/AgriHook.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployCoston2
 * @notice Deployment script for Agri-Hook contracts on Flare Coston2 testnet
 * @dev Deploys all core contracts with FTSO integration and FAsset Bitcoin (FBTC)
 */
contract DeployCoston2 is Script {
    // Coston2 System Addresses
    address constant FTSO_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    address constant FDC_VERIFICATION = 0x89D20A10a3014B2023023F01d9337583B9273c52;
    
    // Uniswap V4 PoolManager (if deployed on Coston2, otherwise use mock)
    address constant POOL_MANAGER = address(0); // Set to actual address if available
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=================================================================");
        console.log("AGRI-HOOK DEPLOYMENT TO FLARE COSTON2 TESTNET");
        console.log("=================================================================");
        console.log("Deployer:", deployer);
        console.log("FTSO Registry:", FTSO_REGISTRY);
        console.log("FDC Verification:", FDC_VERIFICATION);
        console.log("=================================================================\n");
        
        // ============================================
        // STEP 1: DEPLOY TOKENS
        // ============================================
        console.log("STEP 1: DEPLOYING TOKENS");
        console.log("-----------------------------------------------------------------");
        
        // Deploy MockFBTC (FAsset Bitcoin)
        console.log("1.1 Deploying MockFBTC (FAsset Bitcoin)...");
        MockFBTC fbtc = new MockFBTC();
        console.log("    Address:", address(fbtc));
        console.log("    Name:", fbtc.name());
        console.log("    Symbol:", fbtc.symbol());
        console.log("    Decimals:", fbtc.decimals());
        
        // Mint initial supply to deployer
        fbtc.mint(deployer, 1_000_000 * 10**18);
        console.log("    Minted: 1,000,000 FBTC to deployer");
        
        // Deploy CoffeeToken
        console.log("\n1.2 Deploying CoffeeToken...");
        CoffeeToken coffee = new CoffeeToken();
        console.log("    Address:", address(coffee));
        console.log("    Name:", coffee.name());
        console.log("    Symbol:", coffee.symbol());
        console.log("    Initial Supply:", coffee.totalSupply() / 10**18, "COFFEE");
        
        // ============================================
        // STEP 2: DEPLOY WEATHER ORACLE WITH FTSO
        // ============================================
        console.log("\n\nSTEP 2: DEPLOYING WEATHER ORACLE WITH FTSO");
        console.log("-----------------------------------------------------------------");
        
        uint256 initialBasePrice = 5 * 10**18; // $5 in 18 decimals (FBTC)
        console.log("2.1 Deploying WeatherOracleWithFTSO...");
        WeatherOracleWithFTSO weatherOracleWithFTSO = new WeatherOracleWithFTSO(initialBasePrice);
        console.log("    Address:", address(weatherOracleWithFTSO));
        console.log("    Initial Base Price:", initialBasePrice / 10**18, "FBTC");
        
        // Configure FTSO (use BTC as proxy for coffee prices)
        console.log("\n2.2 Configuring FTSO integration...");
        weatherOracleWithFTSO.configureFTSO(
            "BTC",      // Use BTC as proxy asset
            10000,      // 1 BTC = 10,000 bags of coffee
            true        // Enable FTSO updates
        );
        console.log("    FTSO Symbol: BTC (proxy)");
        console.log("    Conversion Ratio: 1 BTC = 10,000 bags");
        console.log("    FTSO Enabled: true");
        
        // Update price from FTSO immediately
        console.log("\n2.3 Fetching initial price from FTSO...");
        try weatherOracleWithFTSO.updatePriceFromFTSO() {
            console.log("    SUCCESS: Price updated from FTSO");
            uint256 currentPrice = weatherOracleWithFTSO.basePrice();
            console.log("    Current Price:", currentPrice / 10**18, "FBTC");
        } catch {
            console.log("    WARNING: FTSO update failed (may need to wait for FTSO data)");
            console.log("    Using initial price:", initialBasePrice / 10**18, "FBTC");
        }
        
        // ============================================
        // STEP 3: DEPLOY INSURANCE VAULT
        // ============================================
        console.log("\n\nSTEP 3: DEPLOYING INSURANCE VAULT");
        console.log("-----------------------------------------------------------------");
        
        // Cast WeatherOracleWithFTSO to WeatherOracle interface
        WeatherOracle oracleInterface = WeatherOracle(address(weatherOracleWithFTSO));
        
        console.log("3.1 Deploying InsuranceVault...");
        InsuranceVault vault = new InsuranceVault(oracleInterface);
        console.log("    Address:", address(vault));
        console.log("    Oracle:", address(weatherOracleWithFTSO));
        
        // Fund vault treasury
        console.log("\n3.2 Funding InsuranceVault treasury...");
        uint256 initialFunding = 10 ether; // 10 CFLR
        vault.fundTreasury{value: initialFunding}();
        console.log("    Treasury funded with:", initialFunding / 10**18, "CFLR");
        
        // ============================================
        // STEP 4: DEPLOY AGRI HOOK
        // ============================================
        console.log("\n\nSTEP 4: DEPLOYING AGRI HOOK");
        console.log("-----------------------------------------------------------------");
        
        if (POOL_MANAGER == address(0)) {
            console.log("WARNING: PoolManager not set - skipping AgriHook deployment");
            console.log("         Deploy Uniswap V4 PoolManager first or use mock");
            console.log("         Then update POOL_MANAGER constant and redeploy");
        } else {
            console.log("4.1 Deploying AgriHook...");
            AgriHook hook = new AgriHook(
                IPoolManager(POOL_MANAGER),
                oracleInterface
            );
            console.log("    Address:", address(hook));
            console.log("    PoolManager:", POOL_MANAGER);
            console.log("    Oracle:", address(weatherOracleWithFTSO));
        }
        
        vm.stopBroadcast();
        
        // ============================================
        // DEPLOYMENT SUMMARY
        // ============================================
        console.log("\n\n=================================================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("=================================================================");
        console.log("\nCONTRACT ADDRESSES:");
        console.log("-----------------------------------------------------------------");
        console.log("MockFBTC:              ", address(fbtc));
        console.log("CoffeeToken:           ", address(coffee));
        console.log("WeatherOracleWithFTSO: ", address(weatherOracleWithFTSO));
        console.log("InsuranceVault:        ", address(vault));
        if (POOL_MANAGER != address(0)) {
            // Hook address would be printed here if deployed
        }
        console.log("-----------------------------------------------------------------");
        
        console.log("\nFRONTEND CONFIGURATION:");
        console.log("-----------------------------------------------------------------");
        console.log("Copy these addresses to your frontend .env file:");
        console.log("");
        console.log("NEXT_PUBLIC_FBTC_ADDRESS=", address(fbtc));
        console.log("NEXT_PUBLIC_COFFEE_ADDRESS=", address(coffee));
        console.log("NEXT_PUBLIC_ORACLE_ADDRESS=", address(weatherOracleWithFTSO));
        console.log("NEXT_PUBLIC_VAULT_ADDRESS=", address(vault));
        console.log("NEXT_PUBLIC_FTSO_REGISTRY=", FTSO_REGISTRY);
        console.log("NEXT_PUBLIC_FDC_VERIFICATION=", FDC_VERIFICATION);
        console.log("-----------------------------------------------------------------");
        
        console.log("\nQUICK START COMMANDS:");
        console.log("-----------------------------------------------------------------");
        console.log("# Get test tokens:");
        console.log("cast send", address(fbtc), '"mint(address,uint256)" <YOUR_ADDRESS> 1000000000000000000000 --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Update price from FTSO:");
        console.log("cast send", address(weatherOracleWithFTSO), '"updatePriceFromFTSO()" --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Check current price:");
        console.log("cast call", address(weatherOracleWithFTSO), '"basePrice()(uint256)" --rpc-url coston2');
        console.log("");
        console.log("# Create insurance policy:");
        console.log("cast send", address(vault), '"createPolicy(int256,int256,uint256)" -18512200 -44555000 5000000000 --value 1ether --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Simulate drought:");
        console.log("cast send", address(weatherOracleWithFTSO), '"updateWeatherSimple(uint256,int256,int256)" 0 -18512200 -44555000 --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("");
        console.log("# Claim payout:");
        console.log("cast send", address(vault), '"claimPayout()" --rpc-url coston2 --private-key $PRIVATE_KEY');
        console.log("-----------------------------------------------------------------");
        
        console.log("\nFTSO INTEGRATION:");
        console.log("-----------------------------------------------------------------");
        console.log("Status: ENABLED");
        console.log("Proxy Asset: BTC");
        console.log("Conversion: 1 BTC = 10,000 bags of coffee");
        console.log("");
        console.log("Available FTSO symbols:");
        console.log("cast call", address(weatherOracleWithFTSO), '"getAvailableFTSOSymbols()(string[])" --rpc-url coston2');
        console.log("-----------------------------------------------------------------");
        
        console.log("\nNEXT STEPS:");
        console.log("-----------------------------------------------------------------");
        console.log("1. Copy contract addresses to your frontend");
        console.log("2. Test FTSO price updates");
        console.log("3. Create test insurance policies");
        console.log("4. Simulate weather events");
        console.log("5. Test claim payouts");
        console.log("6. Deploy Uniswap V4 PoolManager (if needed)");
        console.log("7. Deploy AgriHook with PoolManager");
        console.log("-----------------------------------------------------------------");
        
        console.log("\n[SUCCESS] Deployment complete!");
        console.log("=================================================================\n");
    }
}
