'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { FarmerCard } from '@/components/FarmerCard';
import { OracleCard } from '@/components/OracleCard';
import { BotAttack } from '@/components/BotAttack';
import { Terminal } from '@/components/Terminal';
import { StatsBar } from '@/components/StatsBar';
import { DemoFlow } from '@/components/DemoFlow';
import { TransactionHistory } from '@/components/TransactionHistory';
import { ContractInfo } from '@/components/ContractInfo';

interface LogEntry {
  message: string;
  type: string;
  timestamp: Date;
}

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { message: 'AgriHook initialized on Flare Coston2', type: '', timestamp: new Date() },
    { message: '[FTSO] Price feed: testBTC', type: 'highlight', timestamp: new Date() },
    { message: '[FDC] Weather oracle ready', type: 'highlight', timestamp: new Date() },
    { message: '[FAsset] FBTC contract loaded', type: 'highlight', timestamp: new Date() },
  ]);

  const addLog = useCallback((message: string, type: string = '') => {
    setLogs(prev => [...prev.slice(-50), { message, type, timestamp: new Date() }]);
  }, []);

  const handleStepClick = (step: number) => {
    addLog(`[DEMO] Step ${step} selected`, 'highlight');
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <Header />
        
        <main className="py-6">
          {/* Stats Bar */}
          <StatsBar />

          {/* Demo Flow Guide */}
          <DemoFlow onStepClick={handleStepClick} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Farmer View */}
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <span>👨‍🌾</span> Farmer View
              </h2>
              <FarmerCard onLog={addLog} />
            </div>

            {/* Right Column - Protocol War Room */}
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-4 flex items-center gap-2">
                <span>🛡️</span> Protocol War Room
              </h2>
              <OracleCard onLog={addLog} />
              <div className="mt-4">
                <BotAttack onLog={addLog} />
              </div>
              <div className="mt-4">
                <TransactionHistory onLog={addLog} />
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="mt-6">
            <Terminal logs={logs} />
          </div>

          {/* Contract Info */}
          <div className="mt-6">
            <ContractInfo />
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {['FDC', 'FTSO', 'FAssets', 'Uniswap V4'].map(tech => (
                  <span key={tech} className="px-3 py-1 bg-card border border-border rounded text-xs text-accent font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2 lg:mt-0">
                Built for ETHGlobal • Flare Network
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
