'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkStatus } from './NetworkStatus';

export function Header() {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center py-4 px-6 border-b border-border gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">☕</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">AgriHook</span>
            <span className="text-xs px-2 py-1 bg-accent text-black rounded font-semibold">
              MEV Protection
            </span>
          </div>
          <p className="text-xs text-gray-500">Protecting farmers from arbitrage bots</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NetworkStatus />
        <ConnectButton 
          showBalance={false}
          chainStatus="icon"
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
    </header>
  );
}
