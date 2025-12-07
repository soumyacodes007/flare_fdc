# AgriHook Frontend

React frontend with wagmi, RainbowKit, and viem for the AgriHook demo.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Tech Stack

- **Next.js 14** - React framework
- **wagmi v2** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **viem** - TypeScript Ethereum library
- **Tailwind CSS** - Styling

## Features

- 🔗 RainbowKit wallet connection (MetaMask, WalletConnect, etc.)
- 📡 Live FTSO price feeds
- 🌧️ FDC weather oracle integration
- 🪙 FAsset (FBTC) balance display
- 🤖 Bot attack simulation
- 🛡️ Insurance policy creation & claims

## Contracts (Coston2)

| Contract | Address |
|----------|---------|
| WeatherOracle | 0x223163b9109e43BdA9d719DF1e7E584d781b93fd |
| InsuranceVault | 0x6c6ad692489a89514bD4C8e9344a0Bc387c32438 |
| AgriHook | 0x0FA2Ea09a870BF42Dd05DB7446a14204489780C0 |
| FBTC | 0x8C691A99478D3b3fE039f777650C095578debF12 |
