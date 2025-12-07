import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Define Flare Coston2 chain
export const coston2 = defineChain({
  id: 114,
  name: 'Flare Coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://coston2-explorer.flare.network' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: 'AgriHook',
  projectId: 'agrihook-demo', // Get from WalletConnect Cloud
  chains: [coston2],
  ssr: true,
});
