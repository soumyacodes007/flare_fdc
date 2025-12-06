// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WeatherOracleWithFTSO} from "../src/WeatherOracleWithFTSO.sol";
import {InsuranceVault} from "../src/InsuranceVault.sol";
import {WeatherOracle} from "../src/WeatherOracle.sol";
import {MockFBTC} from "../src/MockFBTC.sol";
import {CoffeeToken} from "../src/CoffeeToken.sol";
import {MockPoolManager} from "../test/mocks/MockPoolManager.sol";

contract DeploySimple is Script {
    uint256 constant INITIAL_BASE_PRICE = 5 * 10**18; // $5 in 18 decimals

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying to Coston2...");
        console.log("Deployer:", deployer);
        console.log("");

        // Deploy tokens
        MockFBTC fbtc = new MockFBTC();
        console.log("MockFBTC:", address(fbtc));
        
        CoffeeToken coffee = new CoffeeToken();
        console.log("CoffeeToken:", address(coffee));

        // Deploy oracle
        WeatherOracleWithFTSO oracle = new WeatherOracleWithFTSO(INITIAL_BASE_PRICE);
        console.log("WeatherOracleWithFTSO:", address(oracle));

        // Deploy vault
        InsuranceVault vault = new InsuranceVault(WeatherOracle(address(oracle)));
        console.log("InsuranceVault:", address(vault));

        // Deploy pool manager
        MockPoolManager poolManager = new MockPoolManager();
        console.log("MockPoolManager:", address(poolManager));

        console.log("");
        console.log("Deployment complete!");
        console.log("");
        console.log("Add to .env:");
        console.log("FBTC_ADDRESS=%s", address(fbtc));
        console.log("COFFEE_ADDRESS=%s", address(coffee));
        console.log("WEATHER_ORACLE_ADDRESS=%s", address(oracle));
        console.log("INSURANCE_VAULT_ADDRESS=%s", address(vault));
        console.log("POOL_MANAGER_ADDRESS=%s", address(poolManager));

        vm.stopBroadcast();
    }
}
