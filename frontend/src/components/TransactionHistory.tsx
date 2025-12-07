'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';

interface Transaction {
  id: string;
  type: 'policy' | 'claim' | 'weather' | 'ftso' | 'treasury';
  description: string;
  timestamp: Date;
  status: 'success' | 'pending';
  hash: string;
}

export function TransactionHistory({ onLog }: { onLog: (msg: string, type?: string) => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!publicClient) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const blockNumber = await publicClient.getBlockNumber();
        // Coston2 RPC limits to 30 blocks max for getLogs
        const fromBlock = blockNumber > 25n ? blockNumber - 25n : 0n;

        const allTxs: Transaction[] = [];

        // Fetch logs from Weather Oracle
        try {
          const oracleLogs = await publicClient.getLogs({
            address: CONTRACTS.WEATHER_ORACLE,
            fromBlock,
            toBlock: 'latest',
          });

          for (const log of oracleLogs.slice(-5)) {
            try {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
              allTxs.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: 'weather',
                description: 'Weather Oracle Update',
                timestamp: new Date(Number(block.timestamp) * 1000),
                status: 'success',
                hash: log.transactionHash || '',
              });
            } catch (e) {
              // Skip if block fetch fails
            }
          }
        } catch (e) {
          console.log('Oracle logs fetch failed:', e);
        }

        // Fetch logs from Insurance Vault
        try {
          const vaultLogs = await publicClient.getLogs({
            address: CONTRACTS.INSURANCE_VAULT,
            fromBlock,
            toBlock: 'latest',
          });

          for (const log of vaultLogs.slice(-5)) {
            try {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
              allTxs.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                type: 'policy',
                description: 'Insurance Vault Activity',
                timestamp: new Date(Number(block.timestamp) * 1000),
                status: 'success',
                hash: log.transactionHash || '',
              });
            } catch (e) {
              // Skip if block fetch fails
            }
          }
        } catch (e) {
          console.log('Vault logs fetch failed:', e);
        }

        // Sort by timestamp and dedupe
        const uniqueTxs = allTxs
          .filter((tx, index, self) => 
            index === self.findIndex(t => t.hash === tx.hash)
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 8);

        setTransactions(uniqueTxs);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentTransactions();
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchRecentTransactions, 15000);
    return () => clearInterval(interval);
  }, [publicClient]);

  const getIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'policy': return '📋';
      case 'claim': return '💰';
      case 'weather': return '🌤️';
      case 'ftso': return '📡';
      case 'treasury': return '🏦';
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const shortenHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-400">📜 On-Chain Activity</h3>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-accent hover:underline"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            <span className="ml-2 text-sm text-gray-500">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No recent transactions</p>
            <p className="text-xs text-gray-600 mt-1">Transactions will appear here after you interact with contracts</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 px-2 bg-bg rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getIcon(tx.type)}</span>
                <div>
                  <p className="text-sm">{tx.description}</p>
                  <a 
                    href={`https://coston2-explorer.flare.network/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    {shortenHash(tx.hash)}
                  </a>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-green-400">✓</p>
                <p className="text-xs text-gray-500">{formatTime(tx.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-border">
        <a 
          href={`https://coston2-explorer.flare.network/address/${CONTRACTS.WEATHER_ORACLE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-accent"
        >
          View all on Coston2 Explorer →
        </a>
      </div>
    </div>
  );
}
