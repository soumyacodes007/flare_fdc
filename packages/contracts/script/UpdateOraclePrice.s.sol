// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";

/**
 * @title UpdateOraclePrice
 * @notice Script to update oracle price on Coston2
 * @dev Usage: NEW_PRICE=5000000000000000000 forge script script/UpdateOraclePrice.s.sol --rpc-url $COSTON2_RPC --broadcast --legacy
 */
contract UpdateOraclePrice is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("WEATHER_ORACLE_ADDRESS");
        uint256 newPrice = vm.envOr("NEW_PRICE", uint256(5 * 10**18)); // Default: 5 FBTC

        vm.startBroadcast(deployerPrivateKey);

        WeatherOracle oracle = WeatherOracle(oracleAddress);
        
        console.log("=================================================================");
        console.log("UPDATE ORACLE PRICE");
        console.log("=================================================================");
        console.log("Oracle Address:", oracleAddress);
        console.log("Current Price:", oracle.basePrice());
        console.log("New Price:", newPrice);
        
        oracle.updateBasePrice(newPrice);
        
        console.log("Updated Price:", oracle.basePrice());
        console.log("=================================================================");

        vm.stopBroadcast();
    }
}
