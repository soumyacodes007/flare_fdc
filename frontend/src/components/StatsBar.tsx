'use client';

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, VAULT_ABI, ORACLE_ABI } from '@/config/contracts';

export function StatsBar() {
  const { data: treasuryBalance } = useReadContract({
    address: CONTRACTS.INSURANCE_VAULT,
    abi: VAULT_ABI,
    functionName: 'treasuryBalance',
  });

  const { data: weatherEvent } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentWeatherEvent',
  });

  const { data: ftsoPrice } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentFTSOPrice',
  });

  const treasury = treasuryBalance ? parseFloat(formatEther(treasuryBalance)) : 0;
  const isDrought = (weatherEvent?.[3] ?? false) && (weatherEvent?.[0] ?? 0) === 1;
  const btcPrice = ftsoPrice ? parseFloat(formatEther(ftsoPrice[0] * BigInt(10 ** 13))) : 0;

  const stats = [
    { label: 'Network', value: 'Coston2', icon: '🌐', color: 'text-green-400' },
    { label: 'BTC/USD (FTSO)', value: `$${btcPrice.toLocaleString()}`, icon: '₿', color: 'text-warning' },
    { label: 'Insurance Pool', value: `${treasury.toFixed(2)} C2FLR`, icon: '🏦', color: 'text-accent' },
    { label: 'Weather', value: isDrought ? 'DROUGHT' : 'Normal', icon: isDrought ? '🔥' : '☀️', color: isDrought ? 'text-danger' : 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">{stat.icon}</span>
          <div>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
