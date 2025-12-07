'use client';

import { useReadContract, useWatchContractEvent } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, ORACLE_ABI, VAULT_ABI } from '@/config/contracts';

export function useWeatherStatus() {
  const { data: weatherEvent, refetch } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentWeatherEvent',
  });

  const isDrought = (weatherEvent?.[3] ?? false) && (weatherEvent?.[0] ?? 0) === 1;
  const priceImpact = weatherEvent?.[1] ? Number(weatherEvent[1]) : 0;
  const isActive = weatherEvent?.[3] ?? false;

  return { isDrought, priceImpact, isActive, refetch };
}

export function useFTSOPrice() {
  const { data: ftsoPrice, refetch } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getCurrentFTSOPrice',
  });

  const price = ftsoPrice ? parseFloat(formatEther(ftsoPrice[0] * BigInt(10 ** 13))) : 0;
  const timestamp = ftsoPrice ? Number(ftsoPrice[1]) : 0;

  return { price, timestamp, refetch };
}

export function useTreasury() {
  const { data: treasuryBalance, refetch } = useReadContract({
    address: CONTRACTS.INSURANCE_VAULT,
    abi: VAULT_ABI,
    functionName: 'treasuryBalance',
  });

  const balance = treasuryBalance ? parseFloat(formatEther(treasuryBalance)) : 0;

  return { balance, refetch };
}

export function usePrices() {
  const { data: basePrice } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'basePrice',
  });

  const { data: theoreticalPrice } = useReadContract({
    address: CONTRACTS.WEATHER_ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getTheoreticalPrice',
  });

  const base = basePrice ? parseFloat(formatEther(basePrice)) : 0;
  const theoretical = theoreticalPrice ? parseFloat(formatEther(theoreticalPrice)) : 0;
  const gap = base > 0 ? ((theoretical - base) / base * 100) : 0;

  return { base, theoretical, gap };
}
