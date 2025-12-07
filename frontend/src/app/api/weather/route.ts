import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Coston2 chain config
const coston2 = {
  id: 114,
  name: 'Flare Coston2',
  nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
  },
};

const WEATHER_ORACLE = '0x223163b9109e43BdA9d719DF1e7E584d781b93fd';
const DEPLOYER_KEY = '0x7d45d0e9ab3e11c876820f440ebd06e9bf28d4d8eb527324a4e07254c94d73b0';

const ORACLE_ABI = parseAbi([
  'function updateWeatherSimple(uint256 rainfall, int256 latitude, int256 longitude)',
  'function getCurrentWeatherEvent() view returns (uint8 eventType, int256 priceImpact, uint256 timestamp, bool active)',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);
    
    const walletClient = createWalletClient({
      account,
      chain: coston2,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: coston2,
      transport: http(),
    });

    // Determine rainfall based on action
    const rainfall = action === 'drought' ? 0n : 25n;
    const latitude = -18512200n; // Minas Gerais, Brazil
    const longitude = -44555000n;

    // Send transaction
    const hash = await walletClient.writeContract({
      address: WEATHER_ORACLE,
      abi: ORACLE_ABI,
      functionName: 'updateWeatherSimple',
      args: [rainfall, latitude, longitude],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      hash,
      action,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error: any) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const publicClient = createPublicClient({
      chain: coston2,
      transport: http(),
    });

    const weatherEvent = await publicClient.readContract({
      address: WEATHER_ORACLE,
      abi: ORACLE_ABI,
      functionName: 'getCurrentWeatherEvent',
    });

    const [eventType, priceImpact, timestamp, active] = weatherEvent;

    return NextResponse.json({
      success: true,
      weather: {
        eventType: Number(eventType),
        priceImpact: Number(priceImpact),
        timestamp: Number(timestamp),
        active,
        isDrought: active && eventType === 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
