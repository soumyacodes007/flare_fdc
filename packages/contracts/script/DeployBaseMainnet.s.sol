// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "../src/WeatherOracle.sol";
import "../src/CoffeeToken.sol";
import "../src/MockFBTC.sol";
import "../src/AgriHook.sol";

/**
 * @title DeployBaseMainnet
 * @notice Deploy AgriHook to Base Mainnet where Uniswap V4 is live
 * @dev Uses official Uniswap V4 PoolManager on Base
 */
contract DeployBaseMainnet is Script {
    // Base Mainnet Uniswap V4 Addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get hook salt (must be pre-mined for correct address flags)
        bytes32 hookSalt = vm.envOr("HOOK_SALT_BASE", bytes32(uint256(0x24e8)));
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=================================================================");
        console.log("AGRI-HOOK DEPLOYMENT TO BASE MAINNET");
        console.log("=================================================================");
        console.log("Deployer:", deployer);
        console.log("PoolManager:", POOL_MANAGER);
        console.log("PositionManager:", POSITION_MANAGER);
        console.log("=================================================================\n");
        
        // ============================================
        // STEP 1: DEPLOY TOKENS
        // ============================================
        console.log("STEP 1: DEPLOYING TOKENS");
        console.log("-----------------------------------------------------------------");
        
        MockFBTC fbtc = new MockFBTC();
        console.log("MockFBTC:", address(fbtc));
        fbtc.mint(deployer, 1_000_000 * 10**18);
        console.log("Minted 1,000,000 FBTC to deployer");
        
        CoffeeToken coffee = new CoffeeToken();
        console.log("CoffeeToken:", address(coffee));
        // CoffeeToken mints to deployer in constructor
        
        // ============================================
        // STEP 2: DEPLOY WEATHER ORACLE
        // ============================================
        console.log("\nSTEP 2: DEPLOYING WEATHER ORACLE");
        console.log("-----------------------------------------------------------------");
        
        uint256 initialBasePrice = 5 * 10**18; // $5 per coffee unit
        WeatherOracle weatherOracle = new WeatherOracle(initialBasePrice);
        console.log("WeatherOracle:", address(weatherOracle));
        console.log("Initial base price:", initialBasePrice / 10**18, "USD");

        
        // ============================================
        // STEP 3: DEPLOY AGRI HOOK WITH CREATE2
        // ============================================
        console.log("\nSTEP 3: DEPLOYING AGRI HOOK WITH CREATE2");
        console.log("-----------------------------------------------------------------");
        
        // Deploy with CREATE2 using pre-mined salt
        AgriHook hook = new AgriHook{salt: hookSalt}(
            IPoolManager(POOL_MANAGER),
            weatherOracle
        );
        
        console.log("AgriHook:", address(hook));
        
        // Verify hook address flags
        uint160 requiredFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        uint160 addressFlags = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;
        
        console.log("Address flags: 0x%x", addressFlags);
        console.log("Required flags: 0x%x", requiredFlags);
        console.log("Flags match:", addressFlags == requiredFlags);
        
        require(addressFlags == requiredFlags, "Hook address invalid - mine new salt");
        
        // Validate permissions
        Hooks.validateHookPermissions(IHooks(address(hook)), hook.getHookPermissions());
        console.log("Hook permissions validated!");
        
        vm.stopBroadcast();
        
        // ============================================
        // DEPLOYMENT SUMMARY
        // ============================================
        console.log("\n=================================================================");
        console.log("DEPLOYMENT SUMMARY - BASE MAINNET");
        console.log("=================================================================");
        console.log("\nCONTRACT ADDRESSES:");
        console.log("-----------------------------------------------------------------");
        console.log("MockFBTC:       ", address(fbtc));
        console.log("CoffeeToken:    ", address(coffee));
        console.log("WeatherOracle:  ", address(weatherOracle));
        console.log("AgriHook:       ", address(hook));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nUNISWAP V4 ADDRESSES (Base Mainnet):");
        console.log("-----------------------------------------------------------------");
        console.log("PoolManager:    ", POOL_MANAGER);
        console.log("PositionManager:", POSITION_MANAGER);
        console.log("Permit2:        ", PERMIT2);
        console.log("-----------------------------------------------------------------");
        
        console.log("\nENVIRONMENT VARIABLES (.env):");
        console.log("-----------------------------------------------------------------");
        console.log("FBTC_ADDRESS_BASE=", address(fbtc));
        console.log("COFFEE_ADDRESS_BASE=", address(coffee));
        console.log("WEATHER_ORACLE_BASE=", address(weatherOracle));
        console.log("HOOK_ADDRESS_BASE=", address(hook));
        console.log("-----------------------------------------------------------------");
        
        console.log("\nNEXT STEPS:");
        console.log("-----------------------------------------------------------------");
        console.log("1. Run: forge script script/InitPoolBase.s.sol --rpc-url base --broadcast");
        console.log("2. Run: forge script script/AddLiquidityBase.s.sol --rpc-url base --broadcast");
        console.log("3. Run: forge script script/TestSwapBase.s.sol --rpc-url base --broadcast");
        console.log("-----------------------------------------------------------------");
        
        console.log("\n[SUCCESS] All contracts deployed to Base Mainnet!");
        console.log("=================================================================\n");
    }
}
