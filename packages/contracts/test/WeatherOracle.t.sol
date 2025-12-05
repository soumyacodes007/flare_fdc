// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/WeatherOracle.sol";

contract WeatherOracleTest is Test {
    WeatherOracle public oracle;
    address public owner;
    address public user;

    uint256 constant INITIAL_BASE_PRICE = 5 * 10**18; // $5.00 in 18 decimals (FBTC)

    event BasePriceUpdated(uint256 newPrice, uint256 timestamp);
    event DisruptionUpdated(
        WeatherOracle.WeatherEventType indexed eventType,
        int256 priceImpactPercent,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        
        oracle = new WeatherOracle(INITIAL_BASE_PRICE);
    }

    // ============ BASE PRICE TESTS ============

    function test_InitialState() public {
        assertEq(oracle.basePrice(), INITIAL_BASE_PRICE);
        assertEq(oracle.owner(), owner);
        assertEq(oracle.getTheoreticalPrice(), INITIAL_BASE_PRICE);
    }

    function test_UpdateBasePrice() public {
        uint256 newPrice = 6_000_000; // $6.00
        
        vm.expectEmit(true, true, true, true);
        emit BasePriceUpdated(newPrice, block.timestamp);
        
        oracle.updateBasePrice(newPrice);
        
        assertEq(oracle.basePrice(), newPrice);
        assertEq(oracle.getTheoreticalPrice(), newPrice);
    }

    function test_UpdateBasePriceOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only owner can call");
        oracle.updateBasePrice(6_000_000);
    }

    function test_UpdateBasePriceZeroReverts() public {
        vm.expectRevert("Base price must be positive");
        oracle.updateBasePrice(0);
    }

    // ============ WEATHER MULTIPLIER TESTS ============

    function test_CalculateWeatherMultiplier_SevereDrought() public {
        uint256 multiplier = oracle.calculateWeatherMultiplier(0);
        assertEq(multiplier, 150); // 150% for 0mm rainfall
    }

    function test_CalculateWeatherMultiplier_ModerateDrought() public {
        uint256 multiplier = oracle.calculateWeatherMultiplier(3);
        assertEq(multiplier, 130); // 130% for 1-5mm rainfall
    }

    function test_CalculateWeatherMultiplier_MildDrought() public {
        uint256 multiplier = oracle.calculateWeatherMultiplier(7);
        assertEq(multiplier, 115); // 115% for 5-10mm rainfall
    }

    function test_CalculateWeatherMultiplier_Normal() public {
        uint256 multiplier = oracle.calculateWeatherMultiplier(15);
        assertEq(multiplier, 100); // 100% for 10mm+ rainfall
    }

    // ============ WEATHER UPDATE TESTS ============

    function test_UpdateWeatherSimple_SevereDrought() public {
        uint256 rainfall = 0; // Severe drought
        int256 latitude = -18512200; // -18.5122 × 1e6
        int256 longitude = -44555000; // -44.555 × 1e6
        
        oracle.updateWeatherSimple(rainfall, latitude, longitude);
        
        // Check weather event
        (
            WeatherOracle.WeatherEventType eventType,
            int256 priceImpact,
            uint256 timestamp,
            bool active
        ) = oracle.getCurrentWeatherEvent();
        
        assertEq(uint8(eventType), uint8(WeatherOracle.WeatherEventType.DROUGHT));
        assertEq(priceImpact, 50); // 150% - 100% = +50%
        assertTrue(active);
        assertEq(timestamp, block.timestamp);
    }

    function test_UpdateWeatherSimple_Normal() public {
        uint256 rainfall = 20; // Normal conditions
        int256 latitude = -18512200;
        int256 longitude = -44555000;
        
        oracle.updateWeatherSimple(rainfall, latitude, longitude);
        
        (
            WeatherOracle.WeatherEventType eventType,
            ,
            ,
            bool active
        ) = oracle.getCurrentWeatherEvent();
        
        assertEq(uint8(eventType), uint8(WeatherOracle.WeatherEventType.NONE));
        assertFalse(active);
    }

    function test_UpdateWeatherSimpleOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only owner can call");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
    }

    // ============ THEORETICAL PRICE TESTS ============

    function test_GetTheoreticalPrice_NoWeatherEvent() public {
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        assertEq(theoreticalPrice, INITIAL_BASE_PRICE);
    }

    function test_GetTheoreticalPrice_WithSevereDrought() public {
        // Update weather to severe drought
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        
        // Expected: $5.00 × 150% = $7.50
        uint256 expectedPrice = (INITIAL_BASE_PRICE * 150) / 100;
        assertEq(theoreticalPrice, expectedPrice);
        assertEq(theoreticalPrice, 7.5 * 10**18); // $7.50 in 18 decimals
    }

    function test_GetTheoreticalPrice_WithModerateDrought() public {
        // Update weather to moderate drought
        oracle.updateWeatherSimple(3, -18512200, -44555000);
        
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        
        // Expected: $5.00 × 130% = $6.50
        uint256 expectedPrice = (INITIAL_BASE_PRICE * 130) / 100;
        assertEq(theoreticalPrice, expectedPrice);
        assertEq(theoreticalPrice, 6.5 * 10**18); // $6.50 in 18 decimals
    }

    function test_GetTheoreticalPrice_WithMildDrought() public {
        // Update weather to mild drought
        oracle.updateWeatherSimple(7, -18512200, -44555000);
        
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        
        // Expected: $5.00 × 115% = $5.75
        uint256 expectedPrice = (INITIAL_BASE_PRICE * 115) / 100;
        assertEq(theoreticalPrice, expectedPrice);
        assertEq(theoreticalPrice, 5.75 * 10**18); // $5.75 in 18 decimals
    }

    // ============ CLEAR DISRUPTION TESTS ============

    function test_ClearDisruption() public {
        // Set a drought
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        
        // Verify it's active
        (, , , bool activeBefore) = oracle.getCurrentWeatherEvent();
        assertTrue(activeBefore);
        
        // Clear it
        oracle.clearDisruption();
        
        // Verify it's cleared
        (, , , bool activeAfter) = oracle.getCurrentWeatherEvent();
        assertFalse(activeAfter);
        
        // Price should return to base
        assertEq(oracle.getTheoreticalPrice(), INITIAL_BASE_PRICE);
    }

    function test_ClearDisruptionOnlyOwner() public {
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        
        vm.prank(user);
        vm.expectRevert("Only owner can call");
        oracle.clearDisruption();
    }

    // ============ OWNERSHIP TESTS ============

    function test_TransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        
        oracle.transferOwnership(newOwner);
        
        assertEq(oracle.owner(), newOwner);
    }

    function test_TransferOwnershipOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only owner can call");
        oracle.transferOwnership(user);
    }

    function test_TransferOwnershipZeroAddressReverts() public {
        vm.expectRevert("Invalid address");
        oracle.transferOwnership(address(0));
    }

    // ============ INTEGRATION TESTS ============

    function test_FullDroughtScenario() public {
        // Initial state
        assertEq(oracle.getTheoreticalPrice(), 5 * 10**18);
        
        // Day 1: Severe drought detected
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        assertEq(oracle.getTheoreticalPrice(), 7.5 * 10**18); // +50%
        
        // Day 7: Some rain, moderate drought
        oracle.updateWeatherSimple(3, -18512200, -44555000);
        assertEq(oracle.getTheoreticalPrice(), 6.5 * 10**18); // +30%
        
        // Day 14: More rain, mild drought
        oracle.updateWeatherSimple(7, -18512200, -44555000);
        assertEq(oracle.getTheoreticalPrice(), 5.75 * 10**18); // +15%
        
        // Day 21: Normal conditions return
        oracle.updateWeatherSimple(15, -18512200, -44555000);
        assertEq(oracle.getTheoreticalPrice(), 5 * 10**18); // 0%
    }

    function test_PriceUpdateDuringDrought() public {
        // Set drought
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        assertEq(oracle.getTheoreticalPrice(), 7.5 * 10**18);
        
        // Market price increases
        oracle.updateBasePrice(6 * 10**18); // $6.00
        
        // Theoretical price should reflect both
        // $6.00 × 150% = $9.00
        assertEq(oracle.getTheoreticalPrice(), 9 * 10**18);
    }

    // ============ FUZZ TESTS ============

    function testFuzz_CalculateWeatherMultiplier(uint256 rainfall) public {
        rainfall = bound(rainfall, 0, 1000);
        
        uint256 multiplier = oracle.calculateWeatherMultiplier(rainfall);
        
        // Multiplier should always be between 100% and 150%
        assertGe(multiplier, 100);
        assertLe(multiplier, 150);
    }

    function testFuzz_UpdateBasePrice(uint256 newPrice) public {
        newPrice = bound(newPrice, 1, type(uint128).max);
        
        oracle.updateBasePrice(newPrice);
        
        assertEq(oracle.basePrice(), newPrice);
        assertEq(oracle.getTheoreticalPrice(), newPrice);
    }

    function testFuzz_TheoreticalPriceAlwaysPositive(
        uint256 basePrice,
        uint256 rainfall
    ) public {
        basePrice = bound(basePrice, 1, type(uint128).max);
        rainfall = bound(rainfall, 0, 1000);
        
        oracle.updateBasePrice(basePrice);
        oracle.updateWeatherSimple(rainfall, -18512200, -44555000);
        
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        
        assertGt(theoreticalPrice, 0);
        assertGe(theoreticalPrice, basePrice); // Should never be less than base
    }
}
