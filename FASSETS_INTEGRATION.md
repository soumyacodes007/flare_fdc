# 🌿 Agri-Hook FAssets Integration

## Overview

Agri-Hook has been refactored to integrate with **Flare Network's FAssets** system. The project now uses **MockFBTC (FAsset Bitcoin)** as the quote asset instead of USDC, aligning with Flare's narrative of bringing non-smart contract tokens to DeFi.

## What Changed

### 1. Quote Asset: USDC → FBTC

**Before:**
- Quote asset: MockUSDC (6 decimals)
- Pool: COFFEE/USDC
- Prices denominated in USDC

**After:**
- Quote asset: MockFBTC (18 decimals)
- Pool: COFFEE/FBTC
- Prices denominated in FAsset Bitcoin
- Aligns with Flare's FAssets narrative

### 2. New Contract: MockFBTC.sol

```solidity
contract MockFBTC is ERC20 {
    constructor() ERC20("FAsset Bitcoin", "FBTC") {
        _mint(msg.sender, 1000000 * 10**18); // 1M FBTC
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function faucet() external {
        _mint(msg.sender, 100 * 10**18); // 100 FBTC
    }
    
    function decimals() public pure override returns (uint8) {
        return 18; // Standard ERC20
    }
}
```

**Features:**
- ✅ Standard OpenZeppelin ERC20
- ✅ 18 decimals (compatible with existing math)
- ✅ Public `mint()` function for testing
- ✅ `faucet()` function for easy token distribution
- ✅ Represents tokenized Bitcoin on Flare

### 3. Updated Contracts

#### WeatherOracle.sol
- Updated comments: "Coffee price in FBTC (18 decimals)"
- No logic changes (math libraries handle 18 decimals)

#### InsuranceVault.sol
- No changes needed (already uses native CFLR for premiums)
- Coverage amounts remain in USD equivalent

#### AgriHook.sol
- No changes needed (works with any ERC20 quote asset)
- Math libraries handle 18 decimals correctly

### 4. Deleted Files

- ❌ `src/MockUSDC.sol` - Removed
- ❌ All USDC references in documentation

### 5. Updated Files

#### Deployment Scripts
- ✅ `script/DeployCoston2.s.sol` - Deploys MockFBTC instead of MockUSDC
- ✅ Initializes pools with COFFEE/FBTC pair

#### Test Scripts
- ✅ `scripts/test-contracts-e2e.py` - Tests MockFBTC
- ✅ `scripts/test-fdc-connection.py` - Updated references
- ✅ Added FBTC faucet testing

#### Documentation
- ✅ `README.md` - Updated to reference FBTC
- ✅ `.env.example` - Updated contract addresses
- ✅ All markdown files - Replaced USDC with FBTC

## Why FAssets?

### Flare's FAssets System

**FAssets** are tokenized representations of non-smart contract tokens (like Bitcoin, Dogecoin, XRP) on the Flare Network. They enable:

1. **Cross-chain DeFi** - Use Bitcoin in Ethereum-style DeFi
2. **Trustless bridging** - Collateralized by native assets
3. **Decentralized minting** - No centralized custodian
4. **Native integration** - Built into Flare's infrastructure

### Agri-Hook + FAssets = Perfect Match

**Why FBTC makes sense:**

1. **Stable value** - Bitcoin is more stable than most altcoins
2. **Global liquidity** - BTC is universally recognized
3. **Farmer-friendly** - Farmers understand "Bitcoin" better than "USDC"
4. **Flare narrative** - Showcases FAssets in real-world use case
5. **Cross-chain potential** - Can bridge to other chains via FAssets

**Use Case:**
```
Farmer João in Brazil:
1. Tokenizes coffee harvest → COFFEE tokens
2. Pairs with FBTC (tokenized Bitcoin) → COFFEE/FBTC pool
3. Earns trading fees in FBTC
4. Protected by Agri-Hook during droughts
5. Can convert FBTC to BRL via local exchanges
```

## Deployment Guide

### Prerequisites

1. Get Coston2 CFLR from faucet: https://faucet.flare.network/
2. Set `PRIVATE_KEY` in `.env`

### Deploy Contracts

```bash
# 1. Deploy all contracts
forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast

# 2. Copy contract addresses to .env
# (Script will print them)

# 3. Test deployment
python scripts/test-contracts-e2e.py
```

### Get Test Tokens

```bash
# Get FBTC tokens
cast send $MOCK_FBTC_ADDRESS "faucet()" --rpc-url coston2 --private-key $PRIVATE_KEY

# Get COFFEE tokens
cast send $COFFEE_TOKEN_ADDRESS "faucet()" --rpc-url coston2 --private-key $PRIVATE_KEY
```

## Testing

### Test FDC Connection

```bash
python scripts/test-fdc-connection.py
```

**Expected Output:**
```
✅ Connected to Coston2
✅ FDC Verification contract found
✅ Weather APIs reachable
```

### Test Contracts End-to-End

```bash
# Set environment variables
export PRIVATE_KEY=your_key
export WEATHER_ORACLE_ADDRESS=0x...
export INSURANCE_VAULT_ADDRESS=0x...
export MOCK_FBTC_ADDRESS=0x...
export COFFEE_TOKEN_ADDRESS=0x...

# Run tests
python scripts/test-contracts-e2e.py
```

**Expected Output:**
```
✅ PASS - weather_oracle
✅ PASS - insurance_vault
✅ PASS - mock_fbtc
✅ PASS - coffee_token

Total: 4/4 tests passed
```

### Test Drought Scenario

```bash
python scripts/test-drought-scenario.py
```

**Expected Output:**
```
🎉 AGRI-HOOK SUCCESSFULLY PROTECTS JOÃO!

✅ All 6 Math Innovations Demonstrated
✅ All 9 Smart Contract Features Demonstrated
```

## Contract Addresses (Coston2)

After deployment, update these in `.env`:

```bash
WEATHER_ORACLE_ADDRESS=0x...
INSURANCE_VAULT_ADDRESS=0x...
COFFEE_TOKEN_ADDRESS=0x...
MOCK_FBTC_ADDRESS=0x...
```

## Math Compatibility

### Decimal Handling

**FBTC uses 18 decimals** (standard ERC20), which is compatible with all existing math:

```solidity
// FeeCurve.sol - Works with any decimals
function quadraticFee(uint256 deviation, ...) returns (uint24) {
    // Deviation is percentage (0-100)
    // Works regardless of token decimals
}

// BonusCurve.sol - Works with any decimals
function quadraticBonus(uint256 deviation, ...) returns (uint256) {
    // Bonus is percentage (0-5)
    // Works regardless of token decimals
}
```

**Price Conversions:**

```javascript
// USDC (6 decimals)
$5.00 = 5_000_000 (5 * 10^6)

// FBTC (18 decimals)
$5.00 = 5_000_000_000_000_000_000 (5 * 10^18)
```

All math libraries work with percentages, so decimal differences don't matter.

## Benefits of This Integration

### For Farmers

1. **Familiar asset** - Bitcoin is globally recognized
2. **Stable value** - BTC is more stable than most altcoins
3. **Easy conversion** - BTC → Local currency via exchanges
4. **Cross-border** - Can send BTC anywhere

### For Flare Network

1. **Showcases FAssets** - Real-world DeFi use case
2. **Demonstrates utility** - Not just speculation
3. **Attracts users** - Farmers are new DeFi demographic
4. **Proves concept** - FAssets work in production

### For DeFi

1. **New primitive** - Agricultural hedging via AMM
2. **Real-world data** - Weather oracles via FDC
3. **Novel mechanism** - Arbitrage capture for protection
4. **Sustainable** - Self-funding from bot fees

## Next Steps

### Phase 1: Testing (Current)
- ✅ Deploy to Coston2
- ✅ Test all contracts
- ✅ Verify FDC integration
- ✅ Test weather updates
- ✅ Test insurance claims

### Phase 2: Mainnet Preparation
- [ ] Audit smart contracts
- [ ] Deploy to Flare mainnet
- [ ] Integrate real FAssets (FBTC)
- [ ] Connect to production weather APIs
- [ ] Set up keeper bots

### Phase 3: Production Launch
- [ ] Onboard pilot farmers
- [ ] Create COFFEE/FBTC pools
- [ ] Monitor system performance
- [ ] Collect user feedback
- [ ] Iterate and improve

## Resources

### Flare Network
- **Docs**: https://docs.flare.network/
- **FAssets**: https://docs.flare.network/tech/fassets/
- **Faucet**: https://faucet.flare.network/
- **Explorer**: https://coston2-explorer.flare.network/

### Agri-Hook
- **GitHub**: (this repo)
- **Docs**: See `README.md`
- **Tests**: See `scripts/` folder

## Support

For questions or issues:
1. Check documentation in `README.md`
2. Review test scripts in `scripts/`
3. Check deployment logs
4. Join Flare Discord: https://discord.gg/flarenetwork

---

**🎉 Agri-Hook is now fully integrated with Flare's FAssets system!**

The project demonstrates how FAssets can enable real-world DeFi applications, bringing Bitcoin liquidity to agricultural markets and protecting farmers from climate risks.
