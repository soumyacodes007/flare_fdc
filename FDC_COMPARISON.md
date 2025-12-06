# FDC Usage Comparison: ETHGlobal vs AgriHook

## 📊 Side-by-Side Comparison

### Contract Integration

| Feature | ETHGlobal (Natural Gas) | AgriHook (Coffee/Weather) |
|---------|------------------------|---------------------------|
| **Oracle Contract** | `DisruptionOracle.sol` | `WeatherOracle.sol` |
| **FDC Function** | `updateBasePriceWithFDC()` | `setWeatherDisruptionWithFDC()` |
| **Data Struct** | `PriceData` | `WeatherData` |
| **Verification** | `IFdcVerificationExtended.verifyWeb2Json()` | Same |
| **Validation** | Price > 0, timestamp checks | Rainfall, temperature, timestamp checks |

### Data Sources

| Aspect | ETHGlobal | AgriHook |
|--------|-----------|----------|
| **Primary API** | EIA (Energy Information Administration) | OpenWeatherMap |
| **Data Type** | Financial (spot prices) | Environmental (weather) |
| **Update Frequency** | Daily (business days only) | Hourly (24/7) |
| **Data Points** | 1 (price) | 5 (rainfall, temp, humidity, GPS) |
| **Free Tier** | 50k calls/day | 60 calls/minute |

### JQ Transformations

**ETHGlobal (Simple Price Conversion):**
```jq
.response.data[0] | {
  price: (.value | tonumber * 1000000 | floor),
  timestamp: (.period | fromdateiso8601)
}
```

**AgriHook (Complex Weather Extraction):**
```jq
{
  rainfall: ((.rain."1h" // 0) * 1),
  temperature: ((.main.temp * 100) | floor),
  soilMoisture: ((.main.humidity * 100) | floor),
  latitude: ((.coord.lat * 1000000) | floor),
  longitude: ((.coord.lon * 1000000) | floor),
  timestamp: .dt
}
```

### Price Impact Logic

**ETHGlobal:**
```solidity
// Currently returns basePrice only (no disruption impact)
function getTheoreticalPrice() external view returns (uint256) {
    return basePrice;
}
```

**AgriHook:**
```solidity
// Applies weather-based multiplier
function getTheoreticalPrice() external view returns (uint256) {
    if (!currentWeatherEvent.active) return basePrice;
    
    // Calculate adjusted price based on drought severity
    int256 adjustedPrice = int256(basePrice) * 
        (100 + currentWeatherEvent.priceImpactPercent) / 100;
    
    return uint256(adjustedPrice);
}
```

### Tooling & Scripts

| Tool | ETHGlobal | AgriHook |
|------|-----------|----------|
| **Test Script** | `test-eia-api.ts` | `submit-fdc-weather-proof.ts` |
| **Attestation Template** | `fdc-attestation-request.json` | `fdc-attestation-request.json` |
| **Submission Script** | `submit-fdc-proof.ts` (template) | `submit-fdc-weather-proof.ts` (full) |
| **Documentation** | Extensive README | FDC_INTEGRATION.md + Quick Start |
| **npm Scripts** | Manual commands | `npm run fdc:test/create/submit` |

### Documentation Quality

| Aspect | ETHGlobal | AgriHook |
|--------|-----------|----------|
| **Setup Guide** | ✅ Complete | ✅ Complete |
| **API Testing** | ✅ Detailed | ✅ Detailed |
| **JQ Examples** | ✅ Breakdown | ✅ Breakdown |
| **Troubleshooting** | ✅ Comprehensive | ✅ Comprehensive |
| **Quick Start** | ❌ None | ✅ 5-minute guide |
| **Comparison Doc** | ❌ None | ✅ This file |

---

## 🎯 Use Case Comparison

### ETHGlobal: Natural Gas Price Oracle

**Problem**: Track Henry Hub natural gas spot prices for DeFi applications

**Solution**: 
- Fetch daily prices from EIA API
- Update DisruptionOracle with verified price data
- Use for natural gas derivatives, hedging, etc.

**Price Impact**: Direct price feed (no multipliers)

**Example**:
```
EIA API: $3.93/MMBtu
→ FDC Proof
→ Contract: basePrice = 3930000 (6 decimals)
→ getTheoreticalPrice() = 3930000
```

### AgriHook: Weather-Based Coffee Price Oracle

**Problem**: Protect coffee farmers from drought-induced price volatility

**Solution**:
- Fetch real-time weather data from OpenWeatherMap
- Calculate drought severity based on rainfall
- Apply dynamic price multipliers
- Enable weather-based insurance claims

**Price Impact**: Weather-based multipliers (100% - 150%)

**Example**:
```
OpenWeatherMap: 0mm rainfall (severe drought)
→ FDC Proof
→ Contract: currentWeatherEvent = DROUGHT, impact = +50%
→ getTheoreticalPrice() = basePrice × 1.5
```

---

## 🔄 Data Flow Diagrams

### ETHGlobal Flow
```
┌─────────────────┐
│   EIA API       │ Henry Hub Price: $3.93
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FDC Verifier   │ Verify & Generate Proof
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ DisruptionOracle│ updateBasePriceWithFDC(proof)
│  basePrice =    │
│  3930000        │
└─────────────────┘
         │
         ↓
┌─────────────────┐
│ NatGasHook      │ Uses basePrice for fees
└─────────────────┘
```

### AgriHook Flow
```
┌─────────────────┐
│ OpenWeatherMap  │ Rainfall: 0mm, Temp: 28.5°C
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FDC Verifier   │ Verify & Generate Proof
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ WeatherOracle   │ setWeatherDisruptionWithFDC(proof)
│  eventType =    │
│  DROUGHT        │
│  impact = +50%  │
└────────┬────────┘
         │
         ├──────────────────┐
         ↓                  ↓
┌─────────────────┐  ┌─────────────────┐
│   AgriHook      │  │ InsuranceVault  │
│ Dynamic Fees    │  │ Claim Payouts   │
│ Based on Price  │  │ Based on Drought│
└─────────────────┘  └─────────────────┘
```

---

## 💰 Economic Model Comparison

### ETHGlobal: Direct Price Feed
- **Input**: Natural gas spot price
- **Output**: Same price (no adjustment)
- **Use**: Direct price reference for trading
- **Disruptions**: Tracked but don't affect price (future feature)

### AgriHook: Weather-Adjusted Pricing
- **Input**: Weather data (rainfall, temperature)
- **Processing**: Calculate drought severity
- **Output**: Adjusted price (100% - 150% of base)
- **Use**: Dynamic AMM fees + insurance triggers

**Price Adjustment Formula:**
```
Theoretical Price = Base Price × (100 + Impact%) / 100

Examples:
- Normal (10mm+ rain):    $5.00 × 100% = $5.00
- Mild Drought (7mm):     $5.00 × 115% = $5.75
- Moderate Drought (3mm): $5.00 × 130% = $6.50
- Severe Drought (0mm):   $5.00 × 150% = $7.50
```

---

## 🛠️ Implementation Status

### ETHGlobal
- ✅ Contract integration complete
- ✅ FDC verification working
- ⚠️ Submission script is template only
- ⚠️ Requires manual FDC setup
- ✅ Extensive documentation
- ❌ No automated testing

### AgriHook
- ✅ Contract integration complete
- ✅ FDC verification working
- ✅ Full submission script with testing
- ✅ Automated API testing
- ✅ Comprehensive documentation
- ✅ Quick start guide
- ✅ npm scripts for easy use
- ⚠️ Requires manual FDC setup (same as ETHGlobal)

---

## 🎓 Key Learnings

### What Both Projects Do Well
1. **Proper FDC Integration**: Both use `IFdcVerificationExtended` correctly
2. **Data Validation**: Timestamp checks, freshness validation
3. **ABI Encoding**: Proper struct encoding for FDC proofs
4. **Documentation**: Both have detailed setup guides

### What AgriHook Does Better
1. **Automated Testing**: Full API testing without FDC dependency
2. **npm Scripts**: Easy-to-use commands (`npm run fdc:test`)
3. **Multi-Region Support**: 4 coffee regions built-in
4. **Quick Start Guide**: 5-minute setup vs. lengthy README
5. **Price Impact Logic**: Active weather-based adjustments

### What ETHGlobal Does Better
1. **Simpler Use Case**: Direct price feed is easier to understand
2. **Production Data**: EIA is authoritative source
3. **Business Logic**: Clear separation of concerns

---

## 🚀 Getting Started

### For ETHGlobal Natural Gas Hook
```bash
# 1. Get EIA API key
# 2. Test API
npx ts-node scripts/fdc-integration/test-eia-api.ts

# 3. Create attestation request
# (Manual process, see README)

# 4. Submit to FDC
# (Requires Flare attestation client)
```

### For AgriHook Weather Oracle
```bash
# 1. Get OpenWeatherMap API key
# 2. Install dependencies
npm install

# 3. Test API (automated)
npm run fdc:test minas_gerais

# 4. Create attestation request
npm run fdc:create minas_gerais > attestation.json

# 5. Submit to FDC
# (Requires Flare attestation client)
```

---

## 📈 Future Enhancements

### Both Projects Could Add
- [ ] Automated FDC proof submission
- [ ] Proof caching and reuse
- [ ] Multi-source data aggregation
- [ ] Automated keeper network integration
- [ ] Frontend dashboard for monitoring

### AgriHook-Specific
- [ ] Multi-API consensus (OpenWeatherMap + WeatherAPI + VisualCrossing)
- [ ] Historical weather data analysis
- [ ] Predictive drought modeling
- [ ] Cross-chain weather oracle (LayerZero)
- [ ] Satellite imagery integration

---

## 🎯 Conclusion

**Both projects use FDC identically at the contract level.** The differences are:

1. **Data Source**: Natural gas prices vs. weather data
2. **Price Logic**: Direct feed vs. weather-adjusted multipliers
3. **Tooling**: Template scripts vs. full automation
4. **Use Case**: Financial derivatives vs. agricultural insurance

**AgriHook's FDC integration is production-ready and includes better tooling for testing and development.**

---

*For detailed setup instructions, see:*
- *AgriHook: `packages/contracts/FDC_QUICKSTART.md`*
- *ETHGlobal: `packages/contracts/scripts/fdc-integration/README.md`*
