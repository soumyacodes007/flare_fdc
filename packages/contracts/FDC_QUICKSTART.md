# FDC Integration Quick Start

Get weather data on-chain in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd agrirhook/packages/contracts
npm install
```

### 2. Get API Key

Visit https://openweathermap.org/api and sign up (free tier: 60 calls/min)

### 3. Configure Environment

```bash
# Add to .env
OPENWEATHER_API_KEY=your_key_here
WEATHER_ORACLE_ADDRESS=0xAD74Af4e6C6C79900b673e73912527089fE7A47D
PRIVATE_KEY=your_private_key
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
```

### 4. Test Weather API

```bash
npm run fdc:test minas_gerais
```

**Expected Output:**
```
🌤️  Testing OpenWeatherMap API for Minas Gerais, Brazil...

📊 RAW WEATHER DATA:
   Temperature: 28.5°C
   Humidity:    65%
   Rainfall:    0mm (last hour)

🌾 DROUGHT ANALYSIS:
   Status:           SEVERE DROUGHT
   Price Multiplier: 150% (+50% impact)

✅ CONTRACT VALIDATION: ✓ Valid
```

### 5. Create FDC Attestation Request

```bash
npm run fdc:create minas_gerais > attestation.json
```

### 6. Submit to FDC Verifier

**Option A: Using Flare Attestation Client (Recommended)**

Follow: https://dev.flare.network/fdc/guides/attestation-client

**Option B: Manual Submission**

```bash
curl -X POST https://fdc-verifiers-testnet.flare.network/api/attestation/request \
  -H "Content-Type: application/json" \
  -d @attestation.json
```

### 7. Retrieve Proof & Submit to Contract

Once FDC generates the proof:

```bash
npm run fdc:submit proof.json
```

---

## 🌍 Available Regions

Test different coffee-growing regions:

```bash
# Brazil (largest producer)
npm run fdc:test minas_gerais

# Colombia
npm run fdc:test antioquia

# Vietnam
npm run fdc:test central_highlands

# Hawaii
npm run fdc:test kona
```

---

## 🧪 Manual Testing (Without FDC)

For quick testing without FDC setup:

```bash
# Simulate severe drought (0mm rainfall)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check price impact
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

---

## 📊 Drought Impact Table

| Rainfall | Status | Price Multiplier | Impact |
|----------|--------|------------------|--------|
| 0mm | Severe Drought | 150% | +50% |
| 1-5mm | Moderate Drought | 130% | +30% |
| 5-10mm | Mild Drought | 115% | +15% |
| 10mm+ | Normal | 100% | 0% |

---

## 🔗 Deployed Contracts (Coston2)

- **WeatherOracle**: `0xAD74Af4e6C6C79900b673e73912527089fE7A47D`
- **AgriHook**: `0x3Fa4e015e89fD28726E32B66e6DB175C29e1C0c0`
- **InsuranceVault**: `0x96fe78279FAf7A13aa28Dbf95372C6211DfE5d4a`

---

## 📚 Full Documentation

See [FDC_INTEGRATION.md](./FDC_INTEGRATION.md) for complete guide.

---

## ❓ Troubleshooting

**"Invalid API key"**
- Check OPENWEATHER_API_KEY in .env

**"Rate limit exceeded"**
- Free tier: 60 calls/min
- Wait 1 minute or upgrade plan

**"Contract not deployed"**
- Verify WEATHER_ORACLE_ADDRESS is correct
- Check you're on Coston2 testnet

---

## 🎯 Next Steps

1. ✅ Test weather API
2. ✅ Create attestation request
3. ⏳ Submit to FDC verifier
4. ⏳ Retrieve proof
5. ⏳ Submit to contract
6. 🎉 Weather data on-chain!

---

*Need help? Check the full documentation or ask in Discord.*
