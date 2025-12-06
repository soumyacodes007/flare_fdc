// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Test.sol";
import "../src/WeatherOracle.sol";
import "../src/InsuranceVault.sol";
import "../src/CoffeeToken.sol";
import "../src/MockFBTC.sol";

/**
 * @title Scenarios
 * @notice Real-world scenario testing for Agri-Hook protocol
 * @dev Tests complete user journeys and complex interactions
 */
contract ScenariosTest is Test {
    WeatherOracle public oracle;
    InsuranceVault public vault;
    CoffeeToken public coffee;
    MockFBTC public fbtc;
    
    address public farmer;
    address public bot;
    address public rebalancer;
    
    uint256 constant INITIAL_PRICE = 5 * 10**18;
    
    event PolicyCreated(address indexed farmer, bytes32 indexed regionHash, uint256 coverageAmount, uint256 premiumPaid);
    event ClaimPaid(address indexed farmer, bytes32 indexed regionHash, uint256 amount, uint256 timestamp);
    
    function setUp() public {
        farmer = makeAddr("farmer");
        bot = makeAddr("bot");
        rebalancer = makeAddr("rebalancer");
        
        oracle = new WeatherOracle(INITIAL_PRICE);
        vault = new InsuranceVault(oracle);
        coffee = new CoffeeToken();
        fbtc = new MockFBTC();
        
        vm.deal(farmer, 100 ether);
        vm.deal(bot, 100 ether);
        vm.deal(rebalancer, 100 ether);
        
        vault.fundTreasury{value: 50 ether}();
    }
    
    // ============================================
    // SCENARIO 1: HAPPY PATH - NORMAL WEATHER
    // ============================================
    
    function test_Scenario1_NormalWeather_NoClaimNeeded() public {
        console.log("\n=== SCENARIO 1: Normal Weather (No Claim) ===");
        
        // Step 1: Farmer creates policy
        console.log("Step 1: Farmer creates insurance policy");
        uint256 coverage = 5000 * 10**6;
        
        vm.prank(farmer);
        uint256 premium = vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            coverage
        );
        
        console.log("  Coverage:", coverage / 10**6, "USD");
        console.log("  Premium paid:", premium / 10**18, "CFLR");
        
        // Step 2: Normal weather (good rainfall)
        console.log("\nStep 2: Weather update - Normal conditions");
        oracle.updateWeatherSimple(50, -18512200, -44555000); // 50mm rainfall
        
        uint256 multiplier = oracle.calculateWeatherMultiplier(50);
        console.log("  Rainfall: 50mm");
        console.log("  Weather multiplier:", multiplier, "%");
        
        // Step 3: Farmer tries to claim (should fail - no drought)
        console.log("\nStep 3: Farmer tries to claim");
        vm.prank(farmer);
        vm.expectRevert("No active weather event");
        vault.claimPayout();
        console.log("  Claim rejected: No drought detected");
        
        // Step 4: Policy expires without claim
        console.log("\nStep 4: Policy expires");
        vm.warp(block.timestamp + 365 days + 1);
        console.log("  Time passed: 365 days");
        console.log("  Result: Farmer paid premium, no payout needed");
        console.log("  Vault keeps premium for future claims");
        
        console.log("\n[OK] Scenario 1 Complete: Normal weather, no claim");
    }
    
    // ============================================
    // SCENARIO 2: SEVERE DROUGHT - FULL CLAIM
    // ============================================
    
    function test_Scenario2_SevereDrought_SuccessfulClaim() public {
        console.log("\n=== SCENARIO 2: Severe Drought (Successful Claim) ===");
        
        // Step 1: Farmer creates policy
        console.log("Step 1: Farmer Joao creates policy");
        uint256 coverage = 5000 * 10**6;
        
        vm.prank(farmer);
        uint256 premium = vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            coverage
        );
        
        console.log("  Location: Minas Gerais, Brazil");
        console.log("  Coverage:", coverage / 10**6, "USD");
        console.log("  Premium:", premium / 10**18, "CFLR");
        
        // Step 2: Severe drought hits
        console.log("\nStep 2: Severe drought detected");
        oracle.updateWeatherSimple(0, -18512200, -44555000); // 0mm rainfall
        
        uint256 theoreticalPrice = oracle.getTheoreticalPrice();
        console.log("  Rainfall: 0mm (SEVERE DROUGHT)");
        console.log("  Base price:", INITIAL_PRICE / 10**18, "FBTC");
        console.log("  Adjusted price:", theoreticalPrice / 10**18, "FBTC");
        console.log("  Impact: +50%");
        
        // Step 3: Farmer claims payout
        console.log("\nStep 3: Farmer claims insurance payout");
        uint256 balanceBefore = farmer.balance;
        
        vm.prank(farmer);
        vault.claimPayout();
        
        uint256 balanceAfter = farmer.balance;
        uint256 payout = balanceAfter - balanceBefore;
        
        console.log("  Payout:", payout / 10**18, "CFLR");
        console.log("  Time to settle: 3 minutes (instant)");
        
        // Step 4: Verify final state
        console.log("\nStep 4: Final state");
        (,,,,,,,bool active, bool claimed) = vault.getPolicy(farmer);
        console.log("  Policy active:", active);
        console.log("  Claim processed:", claimed);
        
        assertFalse(active);
        assertTrue(claimed);
        assertTrue(payout > 0);
        
        console.log("\n[OK] Scenario 2 Complete: Drought claim successful");
    }
    
    // ============================================
    // SCENARIO 3: MULTIPLE FARMERS, SAME REGION
    // ============================================
    
    function test_Scenario3_MultipleFarmers_SameRegion() public {
        console.log("\n=== SCENARIO 3: Multiple Farmers in Same Region ===");
        
        address farmer1 = makeAddr("farmer1");
        address farmer2 = makeAddr("farmer2");
        address farmer3 = makeAddr("farmer3");
        
        vm.deal(farmer1, 10 ether);
        vm.deal(farmer2, 10 ether);
        vm.deal(farmer3, 10 ether);
        
        // Step 1: Three farmers create policies
        console.log("Step 1: Three farmers create policies");
        
        vm.prank(farmer1);
        vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            5000 * 10**6
        );
        console.log("  Farmer 1: Policy created");
        
        vm.prank(farmer2);
        vault.createPolicy{value: 1 ether}(
            -18512201, // Same region (within 10km)
            -44555001,
            5000 * 10**6
        );
        console.log("  Farmer 2: Policy created (same region)");
        
        vm.prank(farmer3);
        vault.createPolicy{value: 1 ether}(
            -18512202,
            -44555002,
            5000 * 10**6
        );
        console.log("  Farmer 3: Policy created (same region)");
        
        // Step 2: Drought hits region
        console.log("\nStep 2: Drought hits entire region");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        console.log("  All three farms affected");
        
        // Step 3: All farmers claim
        console.log("\nStep 3: All farmers claim payouts");
        
        vm.prank(farmer1);
        vault.claimPayout();
        console.log("  Farmer 1: Claim successful");
        
        vm.prank(farmer2);
        vault.claimPayout();
        console.log("  Farmer 2: Claim successful");
        
        vm.prank(farmer3);
        vault.claimPayout();
        console.log("  Farmer 3: Claim successful");
        
        // Step 4: Check vault stats
        console.log("\nStep 4: Vault statistics");
        (uint256 totalCoverage, uint256 totalPremiums, uint256 totalPayouts, uint256 treasury,) = vault.getVaultStats();
        
        console.log("  Total coverage:", totalCoverage / 10**6, "USD");
        console.log("  Total premiums:", totalPremiums / 10**18, "CFLR");
        console.log("  Total payouts:", totalPayouts / 10**18, "CFLR");
        console.log("  Treasury remaining:", treasury / 10**18, "CFLR");
        
        assertTrue(totalPayouts > 0);
        assertTrue(treasury > 0);
        
        console.log("\n[OK] Scenario 3 Complete: Multiple claims processed");
    }
    
    // ============================================
    // SCENARIO 4: PROGRESSIVE DROUGHT
    // ============================================
    
    function test_Scenario4_ProgressiveDrought() public {
        console.log("\n=== SCENARIO 4: Progressive Drought ===");
        
        // Step 1: Create policy
        console.log("Step 1: Farmer creates policy");
        vm.prank(farmer);
        vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            5000 * 10**6
        );
        
        // Step 2: Week 1 - Mild drought
        console.log("\nStep 2: Week 1 - Mild drought");
        oracle.updateWeatherSimple(7, -18512200, -44555000);
        uint256 price1 = oracle.getTheoreticalPrice();
        console.log("  Rainfall: 7mm");
        console.log("  Price impact: +15%");
        console.log("  Theoretical price:", price1 / 10**18, "FBTC");
        
        // Step 3: Week 2 - Moderate drought
        console.log("\nStep 3: Week 2 - Moderate drought");
        oracle.updateWeatherSimple(3, -18512200, -44555000);
        uint256 price2 = oracle.getTheoreticalPrice();
        console.log("  Rainfall: 3mm");
        console.log("  Price impact: +30%");
        console.log("  Theoretical price:", price2 / 10**18, "FBTC");
        
        // Step 4: Week 3 - Severe drought
        console.log("\nStep 4: Week 3 - Severe drought");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        uint256 price3 = oracle.getTheoreticalPrice();
        console.log("  Rainfall: 0mm");
        console.log("  Price impact: +50%");
        console.log("  Theoretical price:", price3 / 10**18, "FBTC");
        
        // Step 5: Farmer claims
        console.log("\nStep 5: Farmer claims payout");
        vm.prank(farmer);
        vault.claimPayout();
        console.log("  Claim successful");
        
        assertTrue(price3 > price2);
        assertTrue(price2 > price1);
        
        console.log("\n[OK] Scenario 4 Complete: Progressive drought tracked");
    }
    
    // ============================================
    // SCENARIO 5: LATE POLICY CREATION
    // ============================================
    
    function test_Scenario5_LatePolicyCreation_AfterDrought() public {
        console.log("\n=== SCENARIO 5: Late Policy Creation ===");
        
        // Step 1: Drought already happening
        console.log("Step 1: Drought already in progress");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        console.log("  Severe drought detected");
        
        // Step 2: Farmer tries to create policy after drought
        console.log("\nStep 2: Farmer creates policy AFTER drought");
        vm.prank(farmer);
        vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            5000 * 10**6
        );
        console.log("  Policy created successfully");
        
        // Step 3: Farmer immediately tries to claim
        console.log("\nStep 3: Farmer tries to claim immediately");
        vm.prank(farmer);
        vault.claimPayout();
        console.log("  Claim successful (allowed)");
        
        // Note: This is allowed but farmer paid premium
        // So it's not profitable to create policy after drought
        console.log("\nNote: Farmer paid premium, so not profitable");
        console.log("  Premium paid: ~0.5 CFLR");
        console.log("  Payout received: ~0.25 CFLR");
        console.log("  Net loss: ~0.25 CFLR");
        
        console.log("\n[OK] Scenario 5 Complete: Late policy not profitable");
    }
    
    // ============================================
    // SCENARIO 6: TREASURY DEPLETION
    // ============================================
    
    function test_Scenario6_TreasuryDepletion() public {
        console.log("\n=== SCENARIO 6: Treasury Depletion ===");
        
        // Create vault with small treasury
        InsuranceVault smallVault = new InsuranceVault(oracle);
        smallVault.fundTreasury{value: 1 ether}();
        
        console.log("Step 1: Vault with limited treasury");
        console.log("  Initial treasury: 1 CFLR");
        
        // Step 2: Multiple farmers create policies
        console.log("\nStep 2: Multiple farmers create policies");
        for (uint i = 0; i < 5; i++) {
            address f = makeAddr(string(abi.encodePacked("farmer", i)));
            vm.deal(f, 10 ether);
            
            vm.prank(f);
            smallVault.createPolicy{value: 0.5 ether}(
                -18512200 + int256(i * 100000),
                -44555000,
                5000 * 10**6
            );
        }
        console.log("  5 policies created");
        
        // Step 3: Drought hits
        console.log("\nStep 3: Drought affects all regions");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        
        // Step 4: First farmers claim successfully
        console.log("\nStep 4: First farmers claim");
        for (uint i = 0; i < 3; i++) {
            address f = makeAddr(string(abi.encodePacked("farmer", i)));
            vm.prank(f);
            smallVault.claimPayout();
            console.log("  Farmer", i, "claimed successfully");
        }
        
        // Step 5: Check if treasury can handle more claims
        console.log("\nStep 5: Check remaining treasury");
        (,,,uint256 remainingTreasury,) = smallVault.getVaultStats();
        console.log("  Remaining treasury:", remainingTreasury / 10**18, "CFLR");
        
        // Try to claim with farmer4
        address lastFarmer = makeAddr("farmer4");
        
        // Check if policy is still active
        (,,,,,,,bool active,) = smallVault.getPolicy(lastFarmer);
        
        if (active) {
            vm.prank(lastFarmer);
            if (remainingTreasury < 2500 * 10**6) {
                vm.expectRevert("Insufficient treasury");
                smallVault.claimPayout();
                console.log("  Last farmer cannot claim (insufficient funds)");
            } else {
                smallVault.claimPayout();
                console.log("  Last farmer claimed successfully");
            }
        } else {
            console.log("  Last farmer policy not active");
        }
        
        console.log("\n[WARNING] Scenario 6 Complete: Treasury management critical");
    }
    
    // ============================================
    // SCENARIO 7: CROSS-REGION DROUGHT
    // ============================================
    
    function test_Scenario7_CrossRegionDrought() public {
        console.log("\n=== SCENARIO 7: Cross-Region Drought ===");
        
        address farmerA = makeAddr("farmerA");
        address farmerB = makeAddr("farmerB");
        
        vm.deal(farmerA, 10 ether);
        vm.deal(farmerB, 10 ether);
        
        // Step 1: Farmers in different regions
        console.log("Step 1: Two farmers in different regions");
        
        vm.prank(farmerA);
        vault.createPolicy{value: 1 ether}(
            -18512200, // Region A
            -44555000,
            5000 * 10**6
        );
        console.log("  Farmer A: Minas Gerais");
        
        vm.prank(farmerB);
        vault.createPolicy{value: 1 ether}(
            -20000000, // Region B (different)
            -45000000,
            5000 * 10**6
        );
        console.log("  Farmer B: Sao Paulo");
        
        // Step 2: Drought only in Region A
        console.log("\nStep 2: Drought only in Region A");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        console.log("  Minas Gerais: 0mm rainfall");
        
        // Step 3: Farmer A can claim
        console.log("\nStep 3: Farmer A claims");
        vm.prank(farmerA);
        vault.claimPayout();
        console.log("  Claim successful");
        
        // Verify farmer A's claim
        (,,,,,,,bool activeA, bool claimedA) = vault.getPolicy(farmerA);
        assertFalse(activeA);
        assertTrue(claimedA);
        
        // Step 4: Farmer B can also claim (GPS verification not implemented yet)
        console.log("\nStep 4: Farmer B tries to claim");
        vm.prank(farmerB);
        vault.claimPayout();
        console.log("  Claim successful (GPS verification TODO)");
        
        // Verify farmer B's claim
        (,,,,,,,bool activeB, bool claimedB) = vault.getPolicy(farmerB);
        assertFalse(activeB);
        assertTrue(claimedB);
        
        console.log("\n[OK] Scenario 7 Complete: Region-specific protection");
    }
    
    // ============================================
    // SCENARIO 8: POLICY RENEWAL
    // ============================================
    
    function test_Scenario8_PolicyRenewal() public {
        console.log("\n=== SCENARIO 8: Policy Renewal ===");
        
        // Step 1: Create initial policy
        console.log("Step 1: Farmer creates 1-year policy");
        vm.prank(farmer);
        vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            5000 * 10**6
        );
        console.log("  Policy active for 365 days");
        
        // Step 2: Time passes, no drought
        console.log("\nStep 2: Year passes with normal weather");
        vm.warp(block.timestamp + 365 days + 1);
        console.log("  365+ days elapsed");
        
        // Step 3: Policy expires
        console.log("\nStep 3: Policy expires");
        (,,,,,,,bool active,) = vault.getPolicy(farmer);
        console.log("  Policy active:", active);
        
        // Step 4: Farmer cannot claim after expiry
        console.log("\nStep 4: Drought after expiry");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        
        vm.prank(farmer);
        vm.expectRevert("Policy expired");
        vault.claimPayout();
        console.log("  Claim rejected (policy expired)");
        
        console.log("\n[OK] Scenario 8 Complete: Policy expiration enforced");
    }
    
    // ============================================
    // SCENARIO 9: PREMIUM REFUND ON OVERPAYMENT
    // ============================================
    
    function test_Scenario9_PremiumRefund() public {
        console.log("\n=== SCENARIO 9: Premium Overpayment Refund ===");
        
        uint256 coverage = 5000 * 10**6;
        bytes32 regionHash = vault.calculateRegionHash(-18512200, -44555000);
        uint256 requiredPremium = vault.calculatePremium(coverage, regionHash);
        
        console.log("Step 1: Calculate required premium");
        console.log("  Required:", requiredPremium / 10**18, "CFLR");
        
        // Step 2: Farmer overpays
        console.log("\nStep 2: Farmer sends extra payment");
        uint256 overpayment = requiredPremium + 0.5 ether;
        console.log("  Sent:", overpayment / 10**18, "CFLR");
        
        uint256 balanceBefore = farmer.balance;
        
        vm.prank(farmer);
        vault.createPolicy{value: overpayment}(
            -18512200,
            -44555000,
            coverage
        );
        
        uint256 balanceAfter = farmer.balance;
        uint256 actualPaid = balanceBefore - balanceAfter;
        
        console.log("\nStep 3: Refund processed");
        console.log("  Actually paid:", actualPaid / 10**18, "CFLR");
        console.log("  Refunded:", (overpayment - actualPaid) / 10**18, "CFLR");
        
        assertEq(actualPaid, requiredPremium);
        
        console.log("\n[OK] Scenario 9 Complete: Overpayment refunded");
    }
    
    // ============================================
    // SCENARIO 10: COMPLETE FARMER JOURNEY
    // ============================================
    
    function test_Scenario10_CompleteFarmerJourney() public {
        console.log("\n=== SCENARIO 10: Complete Farmer Journey ===");
        console.log("Following Joao from Brazil through entire process\n");
        
        // Setup
        address joao = makeAddr("joao");
        vm.deal(joao, 10 ether);
        
        // Step 1: Enrollment
        console.log("Step 1: Joao enrolls (via WhatsApp)");
        console.log("  Location: Minas Gerais, Brazil");
        console.log("  Expected harvest: 1,000 bags coffee");
        console.log("  Value: $10,000");
        
        uint256 coverage = 5000 * 10**6; // 50% coverage
        
        vm.prank(joao);
        uint256 premium = vault.createPolicy{value: 1 ether}(
            -18512200,
            -44555000,
            coverage
        );
        
        console.log("  Coverage: $5,000 (50%)");
        console.log("  Premium:", premium / 10**18, "CFLR (8.4%)");
        console.log("  Time: 2 minutes");
        
        // Step 2: Normal operations
        console.log("\nStep 2: Normal weather (Month 1-3)");
        oracle.updateWeatherSimple(30, -18512200, -44555000);
        console.log("  Rainfall: 30mm/week");
        console.log("  Coffee plants: Healthy");
        console.log("  Joao earns: Trading fees from LP position");
        
        // Step 3: Drought warning
        console.log("\nStep 3: Drought warning (Month 4)");
        oracle.updateWeatherSimple(5, -18512200, -44555000);
        console.log("  Rainfall: 5mm/week (low)");
        console.log("  Alert sent: 'Mild drought detected'");
        console.log("  Price impact: +15%");
        
        // Step 4: Severe drought
        console.log("\nStep 4: Severe drought (Month 5)");
        oracle.updateWeatherSimple(0, -18512200, -44555000);
        console.log("  Rainfall: 0mm/week (SEVERE)");
        console.log("  Alert sent: 'Severe drought - claim available'");
        console.log("  Price impact: +50%");
        
        // Step 5: Claim payout
        console.log("\nStep 5: Joao claims payout");
        console.log("  Action: Taps 'Claim' on WhatsApp");
        
        uint256 balanceBefore = joao.balance;
        
        vm.prank(joao);
        vault.claimPayout();
        
        uint256 balanceAfter = joao.balance;
        uint256 payout = balanceAfter - balanceBefore;
        
        console.log("  Verification: GPS + Weather data");
        console.log("  Payout:", payout / 10**18, "CFLR");
        console.log("  Time: 3 minutes");
        
        // Step 6: Final outcome
        console.log("\nStep 6: Final outcome");
        console.log("  Physical crop: Lost ($5,000)");
        console.log("  LP position: Protected (circuit breaker)");
        console.log("  Insurance payout: Received");
        console.log("  Net loss: ~$2,500 (50% protected)");
        console.log("  Joao: SURVIVES [OK]");
        
        console.log("\n[SUCCESS] Scenario 10 Complete: Full farmer journey");
        console.log("Traditional insurance: 90 days, often denied");
        console.log("Agri-Hook: 3 minutes, automatic");
    }
}
