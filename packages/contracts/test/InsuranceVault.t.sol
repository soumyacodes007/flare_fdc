// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/InsuranceVault.sol";
import "../src/WeatherOracle.sol";

contract InsuranceVaultTest is Test {
    InsuranceVault public vault;
    WeatherOracle public oracle;
    
    address public owner;
    address public farmer1;
    
    int256 constant LATITUDE = -18512200;
    int256 constant LONGITUDE = -44555000;
    uint256 constant COVERAGE_AMOUNT = 5_000_000_000;
    uint256 constant INITIAL_BASE_PRICE = 5_000_000;

    function setUp() public {
        owner = address(this);
        farmer1 = makeAddr("farmer1");
        
        oracle = new WeatherOracle(INITIAL_BASE_PRICE);
        vault = new InsuranceVault(oracle);
        
        vm.deal(farmer1, 100 ether);
        vm.deal(owner, 100 ether);
    }

    function test_CreatePolicy() public {
        bytes32 regionHash = vault.calculateRegionHash(LATITUDE, LONGITUDE);
        uint256 premium = vault.calculatePremium(COVERAGE_AMOUNT, regionHash);
        
        vm.prank(farmer1);
        vault.createPolicy{value: premium}(LATITUDE, LONGITUDE, COVERAGE_AMOUNT);
        
        (, , , uint256 coverage, , , , bool active, ) = vault.getPolicy(farmer1);
        
        assertEq(coverage, COVERAGE_AMOUNT);
        assertTrue(active);
    }

    function test_ClaimPayout() public {
        bytes32 regionHash = vault.calculateRegionHash(LATITUDE, LONGITUDE);
        uint256 premium = vault.calculatePremium(COVERAGE_AMOUNT, regionHash);
        
        vm.prank(farmer1);
        vault.createPolicy{value: premium}(LATITUDE, LONGITUDE, COVERAGE_AMOUNT);
        
        vault.fundTreasury{value: 10 ether}();
        oracle.updateWeatherSimple(0, LATITUDE, LONGITUDE);
        
        uint256 balanceBefore = farmer1.balance;
        
        vm.prank(farmer1);
        vault.claimPayout();
        
        uint256 balanceAfter = farmer1.balance;
        assertEq(balanceAfter - balanceBefore, COVERAGE_AMOUNT / 2);
    }
}
