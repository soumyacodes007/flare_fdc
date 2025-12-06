# Flare Data Connector (FDC) Integration Guide

Complete guide for integrating AgriHook with Flare Data Connector to fetch real-world weather data for coffee-growing regions.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup Instructions](#setup-instructions)
4. [Testing the Integration](#testing-the-integration)
5. [FDC Attestation Workflow](#fdc-attestation-workflow)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What is FDC?

Flare Data Connector (FDC) is a decentralized oracle system that brings **verifiable off-chain data** onto the blockchain. Unlike traditional oracles, FDC:

- Verifies data cryptographically on-chain
- Supports arbitrary Web2 APIs
- Uses JQ transformations for flexible data extraction
- Provides Merkle proofs for data integrity

### Our Use Case

We use FDC to fetch **weather data** from OpenWeatherMap API for coffee-growing regions and update our WeatherOracle contract with verifiable weather conditions that affect coffee prices.

**Data Flow:**
```
OpenWeatherMap API → FDC Verifier → Proof Generation → WeatherOracle.setWeatherDisruptionWithFDC()
```

**Weather Impact on Prices:**
- **Severe Drought** (0mm rainfall): +50% price increase
- **Moderate Drought** (1-5mm): +30% price increase
- **Mild Drought** (5-10mm): +15% price increase
- **Normal** (10mm+): No price change

---

## Quick Start

### Prerequisites

- Node.js 18+ and TypeScript
- Foundry (for Solidity deployment)
- OpenWeatherMap API key (free, get at https://openweathermap.org/api)
- Coston2 testnet wallet with some test CFLR

### 1. Get Your OpenWeatherMap API Key

```bash
# Visit https://openweathermap.org/api
# Sign up for free tier (60 calls/minute)
# Add to .env file:
echo "OPENWEATHER_API_KEY=your_key_here" >> .env
```

### 2. Test Weather API Connection

```bash
cd packages/contracts
npm install
npx ts-node scripts/submit-fdc-weather-proof.ts test minas_gerais
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
    FDC WEATHER PROOF SUBMISSION TO WEATHER ORACLE    
═══════════════════════════════════════════════════════

🌤️  Testing OpenWeatherMap API for Minas Gerais, Brazil...

📊 RAW WEATHER DATA:
   Location:    Minas Gerais, BR
   Temperature: 28.5°C
   Humidity:    65%
   Rainfall:    0mm (last hour)
   Coordinates: -18.5122, -44.555
   Timestamp:   2025-12-06T12:00:00.000Z

🔄 CONVERTED FOR SMART CONTRACT:
   rainfall:     0 (uint256)
   temperature:  2850 (int256) = 28.5°C
   soilMoisture: 6500 (int256) = 65%
   latitude:     -18512200 (int256)
   longitude:    -44555000 (int256)
   timestamp:    1732060800 (uint256)

🌾 DROUGHT ANALYSIS:
   Status:           SEVERE DROUGHT
   Price Multiplier: 150% (+50% impact)

✅ CONTRACT VALIDATION:
   ✓ timestamp <= now:        true
   ✓ timestamp > 1 hour ago:  true
   ✓ Overall valid:           true
```

### 3. Deploy WeatherOracle to Coston2

```bash
# Add PRIVATE_KEY to .env
source .env

# Deploy WeatherOracle
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url $COSTON2_RPC \
  --broadcast

# Save the deployed address to .env
echo "WEATHER_ORACLE_ADDRESS=0x..." >> .env
```

### 4. Create FDC Attestation Request

```bash
npx ts-node scripts/submit-fdc-weather-proof.ts create-request minas_gerais
```

This generates the JSON needed for FDC submission. See [FDC Attestation Workflow](#fdc-attestation-workflow) for next steps.

---

## Setup Instructions

### Environment Variables

Copy `.env.example` and fill in:

```bash
# Required
OPENWEATHER_API_KEY=your_openweathermap_api_key
PRIVATE_KEY=your_wallet_private_key
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc

# After deployment
WEATHER_ORACLE_ADDRESS=deployed_address
```

### Install Dependencies

```bash
# TypeScript dependencies
npm install ethers dotenv

# Foundry dependencies
forge install
```

---

## Testing the Integration

### 1. Test Weather API for Different Regions

```bash
# Test Minas Gerais, Brazil (largest coffee region)
npx ts-node scripts/submit-fdc-weather-proof.ts test minas_gerais

# Test Antioquia, Colombia
npx ts-node scripts/submit-fdc-weather-proof.ts test antioquia

# Test Central Highlands, Vietnam
npx ts-node scripts/submit-fdc-weather-proof.ts test central_highlands

# Test Kona, Hawaii
npx ts-node scripts/submit-fdc-weather-proof.ts test kona
```

### 2. Test JQ Transformation Locally

```bash
# Install jq if needed
brew install jq  # macOS
apt-get install jq  # Linux

# Test the transformation
curl "https://api.openweathermap.org/data/2.5/weather?lat=-18.5122&lon=-44.5550&appid=$OPENWEATHER_API_KEY&units=metric" | \
jq '{rainfall: ((.rain."1h" // 0) * 1), temperature: ((.main.temp * 100) | floor), soilMoisture: ((.main.humidity * 100) | floor), latitude: ((.coord.lat * 1000000) | floor), longitude: ((.coord.lon * 1000000) | floor), timestamp: .dt}'
```

**Expected:**
```json
{
  "rainfall": 0,
  "temperature": 2850,
  "soilMoisture": 6500,
  "latitude": -18512200,
  "longitude": -44555000,
  "timestamp": 1732060800
}
```

### 3. Manual Weather Update (Testing Fallback)

Before setting up FDC, test manual updates:

```bash
# Simulate severe drought (0mm rainfall)
cast send $WEATHER_ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY

# Check theoretical price (should be 1.5x base price)
cast call $WEATHER_ORACLE_ADDRESS \
  "getTheoreticalPrice()(uint256)" \
  --rpc-url $COSTON2_RPC
```

---

## FDC Attestation Workflow

### Understanding FDC Attestation

FDC uses a **request → verify → prove** workflow:

1. **Request**: Submit attestation request with API details
2. **Verify**: FDC nodes fetch data and verify independently
3. **Prove**: Generate Merkle proof of consensus
4. **Consume**: Submit proof to smart contract

### Step 1: Create Attestation Request

```bash
npx ts-node scripts/submit-fdc-weather-proof.ts create-request minas_gerais > attestation-request.json
```

This creates a JSON file with:
- **attestationType**: `JsonApi` (hex-encoded)
- **sourceId**: `OpenWeatherMap` (hex-encoded)
- **url**: Full OpenWeatherMap API endpoint
- **jqTransform**: Data transformation logic
- **abi**: Solidity struct ABI definition

### Step 2: Submit to FDC Verifier

**Method 1: FDC Attestation Client (Recommended)**

Flare provides an attestation client for submitting requests:
- https://dev.flare.network/fdc/guides/attestation-client

**Method 2: Manual Submission (Advanced)**

```bash
# Submit attestation request to FDC verifier
curl -X POST https://fdc-verifiers-testnet.flare.network/api/attestation/request \
  -H "Content-Type: application/json" \
  -d @attestation-request.json
```

### Step 3: Retrieve Proof

Once submitted, FDC verifiers process the request. Query for proof:

```bash
# Get proof using attestation hash
curl https://fdc-verifiers-testnet.flare.network/api/attestation/proof/<attestation_hash>
```

### Step 4: Submit Proof to Contract

```bash
# Using the script (when implemented)
npx ts-node scripts/submit-fdc-weather-proof.ts submit proof.json

# Or manually with cast
cast send $WEATHER_ORACLE_ADDRESS \
  "setWeatherDisruptionWithFDC((bytes32,bytes32,uint256,uint256,(string,string),(bytes)))" \
  <proof_data> \
  --rpc-url $COSTON2_RPC \
  --private-key $PRIVATE_KEY
```

---

## Coffee Growing Regions

The script supports multiple coffee-growing regions:

| Region | Coordinates | Description |
|--------|-------------|-------------|
| **minas_gerais** | -18.5122, -44.5550 | Largest coffee-producing region in Brazil |
| **antioquia** | 5.5689, -75.6794 | Major Colombian coffee region |
| **central_highlands** | 12.2646, 108.0323 | Vietnam's primary coffee region |
| **kona** | 19.6400, -155.9969 | Premium Kona coffee region in Hawaii |

---

## Troubleshooting

### OpenWeatherMap API Issues

**Error: "Invalid API key"**
- Solution: Check your OPENWEATHER_API_KEY in .env
- Verify key at https://openweathermap.org/api

**Error: "Rate limit exceeded"**
- Solution: Free tier allows 60 calls/minute
- Implement caching or upgrade plan

**Error: "No data returned"**
- Solution: Check coordinates are valid
- Verify API endpoint is accessible

### FDC Integration Issues

**Error: "Invalid FDC proof"**
- Solution: Ensure proof is from Coston2 verifier
- Check that proof timestamp is < 1 hour old

**Error: "Data too old"**
- Solution: Contract rejects data > 1 hour old
- Submit fresh attestation request

**Error: "Future timestamp not allowed"**
- Solution: Ensure your system clock is synchronized
- Check timestamp in proof matches current time

### Contract Issues

**Error: "Insufficient funds"**
- Solution: Get Coston2 testnet CFLR from faucet
- https://faucet.flare.network/

**Error: "Only owner can call"**
- Solution: Use the wallet that deployed the contract
- Or transfer ownership first

---

## Additional Resources

### Official Documentation

- **Flare FDC**: https://dev.flare.network/fdc/
- **FDC Attestation Guide**: https://dev.flare.network/fdc/guides/attestation-client
- **OpenWeatherMap API**: https://openweathermap.org/api
- **JQ Manual**: https://jqlang.github.io/jq/manual/

### Contract Interfaces

- `IWeb2Json.sol`: FDC proof interface
- `IFdcVerificationExtended.sol`: Verification interface
- `WeatherOracle.sol`: Oracle implementation

### Helper Scripts

1. `submit-fdc-weather-proof.ts` - Main FDC integration script
2. `fdc-attestation-request.json` - Request template
3. `DeployCoston2.s.sol` - Deploy to Coston2

---

*Last Updated: December 2025*
