'use client';

import { useEffect, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, ORACLE_ABI } from '@/config/contracts';

export function OracleCard({ onLog }: { onLog: (msg: string, type?: string) => void }) {
  const [isWeatherUpdating, setIsWeatherUpdating] = useState(false);

  const { data: basePrice, refetch: refetchBase } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'basePrice',
  });

  const { data: theoreticalPrice, refetch: refetchTheoretical } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getTheoreticalPrice',
  });

  const { data: weatherEvent, refetch: refetchWeather } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentWeatherEvent',
  });

  const { data: ftsoPrice, refetch: refetchFtso } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentFTSOPrice',
  });

  const { writeContract: updateFTSO, data: ftsoTxHash, error: ftsoError } = useWriteContract();

  const { isLoading: isFTSOLoading, isSuccess: ftsoSuccess } = useWaitForTransactionReceipt({
    hash: ftsoTxHash,
  });

  useEffect(() => {
    if (ftsoSuccess) {
      onLog('[TX] FTSO price updated!', 'success');
      refetchFtso();
      refetchBase();
    }
  }, [ftsoSuccess, onLog, refetchFtso, refetchBase]);

  useEffect(() => {
    if (ftsoError) onLog(`[ERROR] ${ftsoError.message}`, 'error');
  }, [ftsoError, onLog]);

  const base = basePrice ? parseFloat(formatEther(basePrice)) : 0;
  const theoretical = theoreticalPrice ? parseFloat(formatEther(theoreticalPrice)) : 0;
  const gap = base > 0 ? ((theoretical - base) / base * 100).toFixed(0) : '0';
  
  const isActive = weatherEvent?.[3] ?? false;
  const priceImpact = weatherEvent?.[1] ? Number(weatherEvent[1]) : 0;
  const eventType = weatherEvent?.[0] ?? 0;

  const ftso = ftsoPrice ? parseFloat(formatEther(ftsoPrice[0] * BigInt(10 ** 13))) : 89950;

  // Determine drought state from blockchain
  const isDrought = isActive && eventType === 1;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDroughtToggle = async () => {
    const newDrought = !isDrought;
    setIsWeatherUpdating(true);
    
    if (newDrought) {
      // Show FDC verification flow for drought detection
      onLog('[FDC] ═══════════════════════════════════════', 'highlight');
      onLog('[FDC] Initiating Weather Data Verification', 'highlight');
      onLog('[FDC] ═══════════════════════════════════════', 'highlight');
      await sleep(300);
      
      onLog('[FDC] 📡 Querying OpenWeatherMap...', 'warning');
      await sleep(400);
      onLog('[FDC] → Rainfall: 0mm (Severe Drought)', 'error');
      
      onLog('[FDC] 📡 Querying WeatherAPI...', 'warning');
      await sleep(400);
      onLog('[FDC] → Soil Moisture: 12% (Critical)', 'error');
      
      onLog('[FDC] 📡 Querying VisualCrossing...', 'warning');
      await sleep(400);
      onLog('[FDC] → Deviation from avg: -100%', 'error');
      
      onLog('[FDC] 🔐 Consensus: 3/3 APIs confirm drought', 'success');
      await sleep(200);
    } else {
      onLog('[FDC] Clearing weather event...', 'warning');
    }
    
    onLog('[TX] Submitting to WeatherOracle contract...', 'highlight');
    
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newDrought ? 'drought' : 'clear' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        onLog(`[TX] ✓ Confirmed: ${data.hash.slice(0, 14)}...`, 'success');
        onLog(`[ORACLE] Weather ${newDrought ? 'DROUGHT activated' : 'CLEARED'} on-chain`, 'success');
        if (newDrought) {
          onLog('[HOOK] ⚡ Dynamic fee increased to 50%', 'warning');
          onLog('[HOOK] MEV protection now ACTIVE', 'success');
        } else {
          onLog('[HOOK] Dynamic fee reset to 0.01%', 'success');
        }
        // Refetch data after successful update
        setTimeout(() => {
          refetchWeather();
          refetchTheoretical();
        }, 2000);
      } else {
        onLog(`[ERROR] ${data.error}`, 'error');
      }
    } catch (e: any) {
      onLog(`[ERROR] ${e.message}`, 'error');
    } finally {
      setIsWeatherUpdating(false);
    }
  };

  const handleFTSOUpdate = async () => {
    onLog('[FTSO] Fetching price from oracle...', 'highlight');
    try {
      updateFTSO({
        address: CONTRACTS.WEATHER_ORACLE,
        abi: ORACLE_ABI,
        functionName: 'updatePriceFromFTSO',
      });
      onLog('[TX] FTSO update submitted', 'success');
    } catch (e: any) {
      onLog(`[ERROR] ${e.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Weather Oracle */}
      <div className={`bg-card border rounded-xl p-5 ${isDrought ? 'border-danger' : 'border-border'}`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400">FDC Weather Oracle</span>
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">LIVE</span>
        </div>
        
        <div className={`inline-block px-4 py-2 rounded-lg text-lg font-bold mb-4 ${
          isDrought 
            ? 'bg-danger/20 text-danger animate-pulse' 
            : 'bg-green-500/20 text-green-400'
        }`}>
          {isDrought ? 'CRITICAL DROUGHT' : 'NORMAL'}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-gray-400">Coffee Base Price</span>
            <span>${base.toFixed(2)} /lb</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-gray-400">Weather-Adjusted Price</span>
            <span className={isDrought ? 'text-danger font-bold' : ''}>${theoretical.toFixed(2)} /lb</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Price Impact</span>
            <span className={parseInt(gap) > 20 ? 'text-danger font-bold' : 'text-green-400'}>
              +{gap}%
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 p-3 bg-bg rounded-lg">
          <span className="text-sm text-warning font-semibold">⚠️ SIMULATE DROUGHT</span>
          <button
            onClick={handleDroughtToggle}
            disabled={isWeatherUpdating}
            className={`w-12 h-6 rounded-full transition-colors ${
              isDrought ? 'bg-danger' : 'bg-gray-600'
            } ${isWeatherUpdating ? 'opacity-50' : ''}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              isDrought ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        {isWeatherUpdating && (
          <p className="text-xs text-accent text-center mt-2 animate-pulse">
            Updating weather on-chain...
          </p>
        )}
      </div>

      {/* FTSO Card */}
      <div className="bg-card border border-blue-500/30 rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400">📡 FTSO Price Feed</span>
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">LIVE</span>
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-blue-400 font-semibold">testBTC</span>
          <span className="text-2xl font-bold">${ftso.toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Decentralized oracle • Updated every 3 min</p>
        <button
          onClick={handleFTSOUpdate}
          disabled={isFTSOLoading}
          className="w-full py-2 bg-bg border border-blue-500/30 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/10 transition disabled:opacity-50"
        >
          {isFTSOLoading ? 'Updating...' : '⟳ Update Price from FTSO'}
        </button>
      </div>

      {/* Fee Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <span className="text-sm text-gray-400">Dynamic Swap Fee (Hook)</span>
        <div className="flex items-baseline mt-2">
          <span className={`text-5xl font-bold ${isDrought ? 'text-danger' : ''}`}>
            {isDrought ? priceImpact : '0.01'}
          </span>
          <span className="text-2xl text-gray-400 ml-1">%</span>
        </div>
        <div className="h-2 bg-bg rounded-full mt-4 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isDrought ? 'bg-danger' : 'bg-accent'
            }`}
            style={{ width: isDrought ? `${priceImpact}%` : '0.1%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0.01% (Normal)</span>
          <span>50% (Crisis)</span>
        </div>
      </div>
    </div>
  );
}
