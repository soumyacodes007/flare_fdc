'use client';

import { useState } from 'react';
import { CONTRACTS } from '@/config/contracts';

export function ContractInfo() {
  const [expanded, setExpanded] = useState(false);

  const contracts = [
    { name: 'Weather Oracle', address: CONTRACTS.WEATHER_ORACLE, icon: '🌤️' },
    { name: 'Insurance Vault', address: CONTRACTS.INSURANCE_VAULT, icon: '🏦' },
    { name: 'AgriHook', address: CONTRACTS.AGRI_HOOK, icon: '🪝' },
    { name: 'FBTC Token', address: CONTRACTS.FBTC, icon: '🪙' },
    { name: 'Coffee Token', address: CONTRACTS.COFFEE, icon: '☕' },
  ];

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-bg/50 transition"
      >
        <span className="text-sm font-semibold text-gray-400">📋 Contract Addresses</span>
        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      {expanded && (
        <div className="px-5 pb-4 space-y-2 animate-slide-up">
          {contracts.map((contract) => (
            <div
              key={contract.name}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2">
                <span>{contract.icon}</span>
                <span className="text-sm">{contract.name}</span>
              </div>
              <button
                onClick={() => copyToClipboard(contract.address)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-accent transition"
              >
                <code className="bg-bg px-2 py-1 rounded">{truncate(contract.address)}</code>
                <span>📋</span>
              </button>
            </div>
          ))}
          <a
            href="https://coston2-explorer.flare.network"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-accent hover:underline mt-3"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
