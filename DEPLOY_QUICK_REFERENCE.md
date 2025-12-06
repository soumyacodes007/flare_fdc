# Quick Deploy Reference - Copy & Paste Commands

## 1. Deploy Everything

```bash
cd ETHGlobalBuenosAires25/packages/contracts

# Set your private key
export PRIVATE_KEY=your_private_key_here

# Deploy
forge script script/DeployCoston2.s.sol:DeployCoston2 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --broadcast \
  -vvvv
```

## 2. Save Contract Addresses

After deployment, copy the addresses from the output:

```bash
export FBTC_ADDRESS=0x...
export COFFEE_ADDRESS=0x...
export ORACLE_ADDRESS=0x...
export VAULT_ADDRESS=0x...
```

## 3. Test FTSO

```bash
# Update price from FTSO
cast send $ORACLE_ADDRESS "updatePriceFromFTSO()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Check price
cast call $ORACLE_ADDRESS "basePrice()(uint256)" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

## 4. Create Insurance Policy

```bash
# Create policy for $5,000 coverage
cast send $VAULT_ADDRESS \
  "createPolicy(int256,int256,uint256)" \
  -18512200 -44555000 5000000000 \
  --value 1ether \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY
```

## 5. Simulate Drought & Claim

```bash
# Trigger drought (0mm rainfall)
cast send $ORACLE_ADDRESS \
  "updateWeatherSimple(uint256,int256,int256)" \
  0 -18512200 -44555000 \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY

# Claim payout
cast send $VAULT_ADDRESS "claimPayout()" \
  --rpc-url https://coston2-api.flare.network/ext/C/rpc \
  --private-key $PRIVATE_KEY
```

## Frontend .env

```bash
NEXT_PUBLIC_FBTC_ADDRESS=$FBTC_ADDRESS
NEXT_PUBLIC_COFFEE_ADDRESS=$COFFEE_ADDRESS
NEXT_PUBLIC_ORACLE_ADDRESS=$ORACLE_ADDRESS
NEXT_PUBLIC_VAULT_ADDRESS=$VAULT_ADDRESS
NEXT_PUBLIC_FTSO_REGISTRY=0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019
NEXT_PUBLIC_FDC_VERIFICATION=0x89D20A10a3014B2023023F01d9337583B9273c52
NEXT_PUBLIC_COSTON2_RPC=https://coston2-api.flare.network/ext/C/rpc
NEXT_PUBLIC_CHAIN_ID=114
```

## Useful Links

- **Faucet**: https://faucet.flare.network/
- **Explorer**: https://coston2-explorer.flare.network/
- **Docs**: https://dev.flare.network/

---

That's it! 🚀
