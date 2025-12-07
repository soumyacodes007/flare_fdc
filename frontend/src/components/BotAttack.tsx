'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther, parseEther, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, VAULT_ABI, ORACLE_ABI } from '@/config/contracts';
import { useToast } from './Toast';

const coston2 = {
  id: 114,
  name: 'Flare Coston2',
  nativeCurrency: { name: 'Coston2 Flare', symbol: 'C2FLR', decimals: 18 },
  rpcUrls: { default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] } },
} as const;

export function BotAttack({ onLog }: { onLog: (msg: string, type?: string) => void }) {
  const [isAttacking, setIsAttacking] = useState(false);
  const [sessionCaptured, setSessionCaptured] = useState(0);
  const { showMevCaptured } = useToast();

  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({
    address: CONTRACTS.INSURANCE_VAULT,
    abi: VAULT_ABI,
    functionName: 'treasuryBalance',
  });

  const { data: weatherEvent } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentWeatherEvent',
  });

  const isDrought = (weatherEvent?.[3] ?? false) && (weatherEvent?.[0] ?? 0) === 1;
  const treasury = treasuryBalance ? parseFloat(formatEther(treasuryBalance)) : 0;

  useEffect(() => {
    if (!isDrought) setSessionCaptured(0);
  }, [isDrought]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runBotAttack = async () => {
    if (!isDrought) {
      onLog('[BOT] No price gap - enable drought first', 'warning');
      return;
    }

    setIsAttacking(true);
    
    // Simulate bot trade
    const tradeAmount = 0.5 + Math.random() * 0.5; // 0.5-1 C2FLR trade
    const feeRate = 0.5; // 50% fee during drought
    const capturedFee = tradeAmount * feeRate;

    onLog('[BOT] ═══════════════════════════════════════', 'highlight');
    onLog('[BOT] 🤖 MEV Bot Detected!', 'warning');
    onLog('[BOT] ═══════════════════════════════════════', 'highlight');
    await sleep(400);
    
    onLog(`[BOT] Bot attempts arbitrage: ${tradeAmount.toFixed(4)} C2FLR`, 'warning');
    await sleep(400);
    
    onLog('[HOOK] ⚡ AgriHook intercepts transaction!', 'error');
    await sleep(300);
    
    onLog('[HOOK] ═══════════════════════════════════════', 'highlight');
    onLog('[HOOK] MEV CAPTURE CALCULATION:', 'highlight');
    onLog(`[HOOK] Trade Amount: ${tradeAmount.toFixed(4)} C2FLR`, '');
    onLog(`[HOOK] Dynamic Fee: 50% (drought active)`, '');
    onLog(`[HOOK] Captured: ${tradeAmount.toFixed(4)} × 0.50 = ${capturedFee.toFixed(4)} C2FLR`, 'success');
    onLog('[HOOK] ═══════════════════════════════════════', 'highlight');
    await sleep(400);

    onLog('[TX] Sending captured MEV to treasury...', 'warning');

    try {
      const DEPLOYER_KEY = '0x7d45d0e9ab3e11c876820f440ebd06e9bf28d4d8eb527324a4e07254c94d73b0';
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

      const hash = await walletClient.writeContract({
        address: CONTRACTS.INSURANCE_VAULT,
        abi: VAULT_ABI,
        functionName: 'fundTreasury',
        value: parseEther(capturedFee.toFixed(18)),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      
      setSessionCaptured(prev => prev + capturedFee);
      onLog(`[TX] ✓ Confirmed: ${hash.slice(0, 14)}...`, 'success');
      onLog(`[TREASURY] +${capturedFee.toFixed(4)} C2FLR → Insurance Pool`, 'success');
      onLog('[RESULT] Bot profit eliminated, farmers protected! 🛡️', 'success');
      
      // Show MEV captured toast!
      showMevCaptured(capturedFee.toFixed(4));
      
      refetchTreasury();
    } catch (e: any) {
      onLog(`[ERROR] ${e.message?.slice(0, 80)}`, 'error');
    }
    
    setIsAttacking(false);
  };

  return (
    <div className="bg-card border border-danger/30 rounded-xl p-5">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-400">🛡️ MEV Protection Demo</span>
        <span className={`text-xs px-2 py-1 rounded font-semibold ${
          isDrought ? 'bg-danger/20 text-danger animate-pulse' : 'bg-gray-700 text-gray-400'
        }`}>
          {isDrought ? '50% FEE ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {/* Explanation Box */}
      <div className="bg-bg/50 border border-border rounded-lg p-3 mb-4 text-xs">
        <p className="text-gray-400 mb-2">
          <span className="text-warning font-semibold">How it works:</span> During drought, coffee prices spike 50%. 
          MEV bots try to arbitrage this gap. Our Uniswap V4 Hook captures their profits!
        </p>
        <div className="text-gray-500 font-mono">
          Bot Trade × 50% Fee = Captured → Treasury → Farmer Payouts
        </div>
      </div>
      
      {/* Stats */}
      <div className="bg-bg rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">This Session Captured:</span>
          <span className="text-lg font-bold text-danger">{sessionCaptured.toFixed(4)} C2FLR</span>
        </div>
      </div>

      <button
        onClick={runBotAttack}
        disabled={!isDrought || isAttacking}
        className="w-full py-3 bg-gradient-to-r from-danger to-red-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-lg">🤖</span>
        {isAttacking ? 'Capturing MEV...' : 'Simulate Bot Attack'}
      </button>
      
      <p className="text-xs text-center mt-2 text-gray-500">
        {!isDrought 
          ? '⚠️ Enable drought first (toggle above)' 
          : '✓ Click to simulate an MEV bot trying to exploit the price gap'
        }
      </p>
    </div>
  );
}
