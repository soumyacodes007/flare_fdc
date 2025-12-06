# FTSO & FDC Integration Guide for Agri-Hook

## Current Status

Your contracts are **FDC-ready** but not yet connected to live FTSO/FDC data. Here's what you have and what you need:

### ✅ What You Have
- WeatherOracle contract with FDC integration functions
- FDC verification interfaces (IFdcVerificationExtended, IWeb2Json)
- Test scripts for FDC connectivity
- Deployment scripts for Coston2
- Manual update functions for testing

### ⏳ What You Need
- Connect to FTSO for real-time coffee price feeds
- Set up FDC attestation client for weather data
- Automate price and weather updates

---

## Integration Options

### Option 1: FTSO for Coffee Prices (Recommended First)

**What is FTSO?**
Flare Time Series Oracle - provides decentralized price feeds for various assets.

**Current Issue:** FTSO doesn't have direct coffee commodity prices yet.

**Solutions:**

#### A. Use Proxy Asset (Quick Start)
Use a correlated asset like agricultural commodities or create a synthetic feed:

```solidity
// Add to WeatherOracle.sol
import { IFtsoRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/IFtsoRegistry.sol";

// FTSO Registry on Coston2
address constant FTSO_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;

function updatePriceFromFTSO() external {
    IFtsoRegistry registry = IFtsoRegistry(FTSO_REGISTRY);
    
    // Get price for a proxy asset (e.g., BTC, ETH, or commodity index)
    (uint256 price, uint256 timestamp, uint256 decimals) = 
        registry.getCurrentPriceWithDecimals("BTC");
    
    // Apply your conversion logic
    // Example: Scale BTC price to coffee equivalent
    uint256 coffeePrice = (price * COFFEE_BTC_RATIO) / 10**decimals;
    
    basePrice = coffeePrice;
    emit BasePriceUpdated(coffeePrice, timestamp);
}
```

#### B. Request Custom FTSO Feed
Submit a proposal to Flare for coffee commodity price feed:
- Visit: https://flare.network/ftso-providers/
- Contact FTSO data providers
- Estimated timeline: 2-4 weeks

---

### Option 2: FDC for Weather Data (Production Ready)

**What is FDC?**
Flare Data Connector - verifies off-chain data (APIs, events) on-chain using attestations.

**Your Implementation:** Already coded in WeatherOracle.sol

#### Step-by-Step FDC Integration

**1. Set Up Weather API Keys**

```bash
# Get API keys from:
# - OpenWeatherMap: https://openweathermap.org/api
# - WeatherAPI: https://www.weatherapi.com/
# - VisualCrossing: https://www.visualcrossing.com/

# Add to .env
echo "OPENWEATHER_API_KEY=your_key" >> .env
echo "WEATHERAPI_KEY=your_key" >> .env
echo "VISUALCROSSING_KEY=your_key" >> .env
```

**2. Install FDC Attestation Client**

```bash
# Install Flare attestation suite
npm install -g @flarenetwork/attestation-client

# Or use Docker
docker pull flarenetwork/attestation-client:latest
```

**3. Create Weather Attestation Request**

Create `scripts/fdc-weather-request.json`:

```json
{
  "attestationType": "0x5765623250726f6f66",
  "sourceId": "0x5745425f41504900",
  "requestBody": {
    "url": "https://api.openweathermap.org/data/2.5/weather?lat=-18.5122&lon=-44.555&appid=YOUR_KEY",
    "postProcessJSONPath": "$.main.temp"
  }
}
```

**4. Submit Attestation**

```bash
# Submit to FDC verifier
attestation-client submit \
  --network coston2 \
  --request scripts/fdc-weather-request.json \
  --private-key $PRIVATE_KEY

# Wait for voting round (typically 90 seconds)
# Retrieve proof
attestation-client get-proof \
  --network coston2 \
  --request-hash 0x...
```

**5. Update Contract with Proof**

```bash
# Call contract with FDC proof
cast send $WEATHER_ORACLE_ADDRESS \
  "setWeatherDisruptionWithFDC((bytes32,bytes32,bytes32[],(bytes32,(bytes))))" \
  $PROOF_DATA \
  --rpc-url coston2 \
  --private-key $PRIVATE_KEY
```

---

## Quick Start: Hybrid Approach (Recommended)

Use manual updates for development, then migrate to FTSO/FDC:

### Phase 1: Manual Updates (Now)

```bash
# Deploy contracts
cd ETHGlobalBuenosAires25/packages/contracts
forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast

# Update weather manually
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url coston2 --private-key $PRIVATE_KEY

# Update price manually
cast send $WEATHER_ORACLE_ADDRESS \
  "updateBasePrice(uint256)" \
  5000000000000000000 \
  --rpc-url coston2 --private-key $PRIVATE_KEY
```

### Phase 2: FDC Weather (1-2 days)

1. Get weather API keys
2. Set up FDC attestation client
3. Create automated weather update script
4. Test with `setWeatherDisruptionWithFDC()`

### Phase 3: FTSO Prices (1-2 weeks)

1. Request custom coffee feed OR use proxy asset
2. Implement `updatePriceFromFTSO()`
3. Set up automated price updates

---

## Complete Integration Code

### Add FTSO Support to WeatherOracle

```solidity
// Add to WeatherOracle.sol

import { IFtsoRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/IFtsoRegistry.sol";

contract WeatherOracle {
    // ... existing code ...
    
    address public constant FTSO_REGISTRY = 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019;
    
    /**
     * @notice Update base price from FTSO
     * @dev Uses BTC as proxy until coffee feed available
     */
    function updatePriceFromFTSO() external {
        IFtsoRegistry registry = IFtsoRegistry(FTSO_REGISTRY);
        
        // Get BTC price (or other proxy asset)
        (uint256 btcPrice, uint256 timestamp, uint256 decimals) = 
            registry.getCurrentPriceWithDecimals("BTC");
        
        require(btcPrice > 0, "Invalid FTSO price");
        require(timestamp > block.timestamp - 5 minutes, "Price too old");
        
        // Convert BTC price to coffee equivalent
        // Example: 1 BTC = 10,000 bags of coffee at $5/bag = $50,000
        // So coffee price = BTC price / 10,000
        uint256 coffeePrice = (btcPrice * 10**18) / (10000 * 10**decimals);
        
        basePrice = coffeePrice;
        emit BasePriceUpdated(coffeePrice, timestamp);
    }
    
    /**
     * @notice Get available FTSO symbols
     */
    function getAvailableFTSOSymbols() external view returns (string[] memory) {
        IFtsoRegistry registry = IFtsoRegistry(FTSO_REGISTRY);
        return registry.getSupportedSymbols();
    }
}
```

### Automated Update Script

Create `scripts/auto-update.py`:

```python
#!/usr/bin/env python3
"""
Automated FTSO/FDC Update Script
Updates WeatherOracle with latest price and weather data
"""

import time
from web3 import Web3
from eth_account import Account
import requests
import os

COSTON2_RPC = "https://coston2-api.flare.network/ext/C/rpc"
WEATHER_ORACLE = os.getenv("WEATHER_ORACLE_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")

w3 = Web3(Web3.HTTPProvider(COSTON2_RPC))
account = Account.from_key(PRIVATE_KEY)

# Oracle ABI
oracle_abi = [
    {
        "inputs": [],
        "name": "updatePriceFromFTSO",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

contract = w3.eth.contract(
    address=Web3.to_checksum_address(WEATHER_ORACLE),
    abi=oracle_abi
)

def update_price():
    """Update price from FTSO"""
    print("Updating price from FTSO...")
    
    tx = contract.functions.updatePriceFromFTSO().build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 200000,
        'gasPrice': w3.eth.gas_price
    })
    
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    print(f"✅ Price updated: {tx_hash.hex()}")
    return receipt

def main():
    """Main update loop"""
    print("🤖 Starting automated updates...")
    
    while True:
        try:
            # Update every 5 minutes
            update_price()
            time.sleep(300)
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(60)

if __name__ == '__main__':
    main()
```

---

## Testing Your Integration

### Test FTSO Connection

```bash
# Check available FTSO symbols
cast call $WEATHER_ORACLE_ADDRESS \
  "getAvailableFTSOSymbols()(string[])" \
  --rpc-url coston2

# Update price from FTSO
cast send $WEATHER_ORACLE_ADDRESS \
  "updatePriceFromFTSO()" \
  --rpc-url coston2 --private-key $PRIVATE_KEY

# Verify price updated
cast call $WEATHER_ORACLE_ADDRESS \
  "basePrice()(uint256)" \
  --rpc-url coston2
```

### Test FDC Connection

```bash
# Run FDC test script
python scripts/test-fdc-connection.py

# Check results
cat fdc_test_results.json
```

---

## Resources

### Flare Documentation
- **FTSO Guide**: https://dev.flare.network/ftso/
- **FDC Guide**: https://dev.flare.network/fdc/
- **Contract Registry**: https://dev.flare.network/network/solidity-reference/

### API Keys Needed
- OpenWeatherMap: https://openweathermap.org/api
- WeatherAPI: https://www.weatherapi.com/
- VisualCrossing: https://www.visualcrossing.com/

### Flare Networks
- **Coston2 Testnet**: https://coston2-explorer.flare.network/
- **Faucet**: https://faucet.flare.network/
- **Discord**: https://discord.gg/flarenetwork

---

## Deployment Checklist

- [ ] Get Coston2 CFLR from faucet
- [ ] Deploy contracts: `forge script script/DeployCoston2.s.sol --rpc-url coston2 --broadcast`
- [ ] Test manual updates
- [ ] Get weather API keys (3 providers)
- [ ] Install FDC attestation client
- [ ] Test FDC weather attestation
- [ ] Add FTSO price update function
- [ ] Test FTSO price updates
- [ ] Set up automated update script
- [ ] Monitor and verify updates

---

## Summary

**Current State:**
- ✅ Contracts deployed and tested
- ✅ FDC interfaces implemented
- ✅ Manual updates working
- ⏳ FTSO integration pending
- ⏳ FDC automation pending

**Recommended Path:**
1. **Today**: Use manual updates for development
2. **This Week**: Integrate FDC for weather data
3. **Next Week**: Add FTSO for price feeds (or use proxy)
4. **Production**: Fully automated FTSO/FDC updates

**Estimated Time:**
- FDC Weather: 4-6 hours
- FTSO Prices: 2-4 hours (with proxy) or 2-4 weeks (custom feed)
- Automation: 2-3 hours

Your contracts are well-structured and ready for integration! 🚀
