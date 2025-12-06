// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/WeatherOracle.sol";

/**
 * @title SimulateDrought
 * @notice Script to simulate drought conditions on Coston2
 * @dev Usage: RAINFALL=0 forge script script/SimulateDrought.s.sol --rpc-url $COSTON2_RPC --broadcast --legacy
 */
contract SimulateDrought is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("WEATHER_ORACLE_ADDRESS");
        
        // Weather parameters (defaults: Minas Gerais, Brazil - severe drought)
        uint256 rainfall = vm.envOr("RAINFALL", uint256(0)); // 0 = severe drought
        int256 latitude = vm.envOr("LATITUDE", int256(-18512200)); // -18.5122 * 1e6
        int256 longitude = vm.envOr("LONGITUDE", int256(-44555000)); // -44.555 * 1e6

        vm.startBroadcast(deployerPrivateKey);

        WeatherOracle oracle = WeatherOracle(oracleAddress);
        
        console.log("=================================================================");
        console.log("SIMULATE DROUGHT CONDITIONS");
        console.log("=================================================================");
        console.log("Oracle Address:", oracleAddress);
        console.log("Rainfall (mm):", rainfall);
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);
        console.log("");
        
        // Determine drought status
        if (rainfall == 0) {
            console.log("Status: SEVERE DROUGHT (+50% price impact)");
        } else if (rainfall < 5) {
            console.log("Status: MODERATE DROUGHT (+30% price impact)");
        } else if (rainfall < 10) {
            console.log("Status: MILD DROUGHT (+15% price impact)");
        } else {
            console.log("Status: NORMAL CONDITIONS (no impact)");
        }
        console.log("");
        
        // Get current state
        console.log("Before Update:");
        console.log("  Base Price:", oracle.basePrice());
        console.log("  Theoretical Price:", oracle.getTheoreticalPrice());
        
        // Update weather
        oracle.updateWeatherSimple(rainfall, latitude, longitude);
        
        console.log("");
        console.log("After Update:");
        console.log("  Base Price:", oracle.basePrice());
        console.log("  Theoretical Price:", oracle.getTheoreticalPrice());
        
        // Get weather event
        (
            WeatherOracle.WeatherEventType eventType,
            int256 priceImpact,
            uint256 timestamp,
            bool active
        ) = oracle.getCurrentWeatherEvent();
        
        console.log("");
        console.log("Weather Event:");
        console.log("  Event Type:", uint8(eventType));
        console.log("  Price Impact:", priceImpact, "%");
        console.log("  Active:", active);
        console.log("=================================================================");

        vm.stopBroadcast();
    }
}
