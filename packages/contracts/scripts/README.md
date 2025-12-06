# Test Scripts

TypeScript scripts for testing deployed Agri-Hook contracts on Flare Coston2.

## Available Scripts

### test-contracts.ts
Tests all deployed contracts and their basic functionality.

```bash
npm run test:contracts
```

**Tests:**
- Token contracts (FBTC, COFFEE)
- Weather oracle with FTSO integration
- AgriHook configuration
- Insurance vault status

### test-weather-api.ts
Tests external weather API integrations.

```bash
npm run test:weather <location>
```

**Locations:**
- `minas_gerais` - Minas Gerais, Brazil
- `sao_paulo` - São Paulo, Brazil
- `colombia` - Colombia
- `vietnam` - Vietnam
- `ethiopia` - Ethiopia

**APIs Tested:**
- OpenWeatherMap
- WeatherAPI.com
- Visual Crossing

### create-policy.ts
Creates a new insurance policy for a coffee farm.

```bash
npm run policy:create <location> <premium_fbtc>
```

**Example:**
```bash
npm run policy:create minas_gerais 5
```

**Process:**
1. Checks FBTC balance
2. Calls faucet if needed
3. Approves FBTC spending
4. Creates policy with collateral
5. Returns policy ID

### simulate-drought.ts
Simulates drought conditions for a policy location.

```bash
npm run drought:simulate <policy_id>
```

**Example:**
```bash
npm run drought:simulate 0
```

**Process:**
1. Gets policy location
2. Updates weather oracle (0mm rainfall)
3. Triggers DROUGHT event
4. Adjusts theoretical price (+50%)
5. Checks claim eligibility

### process-claim.ts
Processes an eligible insurance claim.

```bash
npm run claim:process <policy_id>
```

**Example:**
```bash
npm run claim:process 0
```

**Process:**
1. Verifies policy eligibility
2. Processes claim transaction
3. Transfers coverage to farmer
4. Marks policy as claimed

## Quick Test

Run all tests in sequence:

```bash
chmod +x scripts/quick-test.sh
./scripts/quick-test.sh
```

This will:
1. Test all contracts
2. Test weather APIs
3. Create a policy
4. Simulate drought
5. Process claim

## Requirements

```bash
npm install
```

Dependencies:
- ethers v6
- dotenv
- typescript
- ts-node

## Environment Variables

Required in `.env`:

```
PRIVATE_KEY=your_private_key_here
COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
OPENWEATHERMAP_API_KEY=your_key
WEATHER_API_KEY=your_key
VISUAL_CROSSING_API_KEY=your_key
```

## Contract Addresses

Hardcoded in scripts (Coston2 testnet):

```typescript
const CONTRACTS = {
  FBTC: '0x8C691A99478D3b3fE039f777650C095578debF12',
  COFFEE: '0x0cd5af44F36bCD3B09f9f70aFA9cf6A101d4bc0c',
  WEATHER_ORACLE: '0x223163b9109e43BdA9d719DF1e7E584d781b93fd',
  INSURANCE_VAULT: '0x6c6ad692489a89514bD4C8e9344a0Bc387c32438',
  POOL_MANAGER: '0x513be19378C375466e29D6b4d001E995FBA8c2ce',
  AGRI_HOOK: '0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0',
};
```

## Troubleshooting

### TypeScript errors

```bash
npm install --save-dev @types/node typescript ts-node
```

### "Cannot find module 'ethers'"

```bash
npm install ethers@^6.9.0
```

### "Insufficient balance"

Get C2FLR from faucet:
https://faucet.flare.network/coston2

Get FBTC:
```bash
cast send 0x8C691A99478D3b3fE039f777650C095578debF12 "faucet()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY
```

## Next Steps

After successful testing:

1. Initialize liquidity pool
2. Test swap mechanics
3. Implement FDC attestations
4. Build frontend UI
