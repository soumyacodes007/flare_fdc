'use client';

import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import { coston2 } from '@/config/wagmi';

export function NetworkStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const isCorrectNetwork = chainId === coston2.id;

  if (!isConnected) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
      isCorrectNetwork 
        ? 'bg-green-500/10 border border-green-500/30' 
        : 'bg-danger/10 border border-danger/30'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        isCorrectNetwork ? 'bg-green-500 animate-pulse' : 'bg-danger'
      }`} />
      <span className={isCorrectNetwork ? 'text-green-400' : 'text-danger'}>
        {isCorrectNetwork ? 'Coston2' : 'Wrong Network'}
      </span>
      {blockNumber && isCorrectNetwork && (
        <span className="text-gray-500">#{blockNumber.toString()}</span>
      )}
    </div>
  );
}
