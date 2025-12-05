// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";
import "../src/InsuranceVault.sol";
import "../src/CoffeeToken.sol";
import "../src/MockFBTC.sol";

/**
 * @title DeployCoston2
 * @notice Deployment script for Agri-Hook contracts on Flare Coston2 testnet
 * @dev Deploys all core contracts with FAsset Bitcoin (FBTC) as quote asset
 */
contract DeployCoston2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Agri-Hook contracts to Coston2...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        
        // 1. Deploy MockFBTC (FAsset Bitcoin)
        console.log("\n1. Deploying MockFBTC (FAsset Bitcoin)...");
        MockFBTC fbtc = new MockFBTC();
        console.log("   MockFBTC deployed at:", address(fbtc));
        console.log("   Name:", fbtc.name());
        console.log("   Symbol:", fbtc.symbol());
        console.log("   Decimals:", fbtc.decimals());
        
        // 2. Deploy CoffeeToken
        console.log("\n2. Deploying CoffeeToken...");
        CoffeeToken coffee = new CoffeeToken();
        console.log("   CoffeeToken deployed at:", address(coffee));
        console.log("   Name:", coffee.name());
        console.log("   Symbol:", coffee.symbol());
        
        // 3. Deploy WeatherOracle
        console.log("\n3. Deploying WeatherOracle...");
        uint256 initialBasePrice = 5 * 10**18; // $5 in 18 decimals (FBTC)
        WeatherOracle oracle = new WeatherOracle(initialBasePrice);
        console.log("   WeatherOracle deployed at:", address(oracle));
        console.log("   Initial Base Price:", initialBasePrice / 10**18, "FBTC");
        
        // 4. Deploy InsuranceVault
        console.log("\n4. Deploying InsuranceVault...");
        InsuranceVault vault = new InsuranceVault(oracle);
        console.log("   InsuranceVault deployed at:", address(vault));
        
        // 5. Fund vault treasury with initial capital
        console.log("\n5. Funding InsuranceVault treasury...");
        uint256 initialFunding = 10 ether; // 10 CFLR
        vault.fundTreasury{value: initialFunding}();
        console.log("   Treasury funded with:", initialFunding / 10**18, "CFLR");
        
        vm.stopBroadcast();
        
        // Print deployment summary
        console.log("\n" + unicode"═══════════════════════════════════════════════════════════");
        console.log(unicode"📊 DEPLOYMENT SUMMARY");
        console.log(unicode"═══════════════════════════════════════════════════════════");
        console.log("\nContract Addresses:");
        console.log("-----------------------------------------------------------");
        console.log("MockFBTC:        ", address(fbtc));
        console.log("CoffeeToken:     ", address(coffee));
        console.log("WeatherOracle:   ", address(oracle));
        console.log("InsuranceVault:  ", address(vault));
        console.log("-----------------------------------------------------------");
        
        console.log("\nEnvironment Variables (add to .env):");
        console.log("-----------------------------------------------------------");
        console.log("MOCK_FBTC_ADDRESS=", address(fbtc));
        console.log("COFFEE_TOKEN_ADDRESS=", address(coffee));
        console.log("WEATHER_ORACLE_ADDRESS=", address(oracle));
        console.log("INSURANCE_VAULT_ADDRESS=", address(vault));
        console.log("-----------------------------------------------------------");
        
        console.log("\nNext Steps:");
        console.log("1. Update .env with contract addresses above");
        console.log("2. Test weather oracle: python scripts/test-contracts-e2e.py");
        console.log("3. Create insurance policy: Call vault.createPolicy()");
        console.log("4. Simulate drought: Call oracle.updateWeatherSimple(0, lat, lon)");
        console.log("5. Claim payout: Call vault.claimPayout()");
        
        console.log("\nFaucet Commands:");
        console.log("cast send", address(fbtc), '"faucet()"', "--rpc-url coston2 --private-key $PRIVATE_KEY");
        console.log("cast send", address(coffee), '"faucet()"', "--rpc-url coston2 --private-key $PRIVATE_KEY");
        
        console.log(unicode"\n✅ Deployment complete!");
    }
}
