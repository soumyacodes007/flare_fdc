'use client';

import { useEffect, useState } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, parseUnits } from 'viem';
import { CONTRACTS, VAULT_ABI, FBTC_ABI, ORACLE_ABI } from '@/config/contracts';
import { useToast } from './Toast';

// Coverage options - ALL VALUES IN C2FLR
// Premium = 5% of coverage, Payout = 50% of coverage
const COVERAGE_OPTIONS = [
  { c2flr: 1, premium: 0.05 },
  { c2flr: 2.5, premium: 0.125 },
  { c2flr: 5, premium: 0.25 },
  { c2flr: 10, premium: 0.5 },
  { c2flr: 25, premium: 1.25 },
  { c2flr: 50, premium: 2.5 },
];

// Farm locations with GPS coordinates
const LOCATIONS = [
  { name: 'São Paulo, Brazil (Coffee/Sugar)', lat: -23550500, lng: -46633300 },
  { name: 'Minas Gerais, Brazil (Coffee)', lat: -18512200, lng: -44555000 },
  { name: 'Paraná, Brazil (Soybeans)', lat: -25428900, lng: -49267300 },
  { name: 'Bahia, Brazil (Cocoa)', lat: -12971800, lng: -38501400 },
];

export function FarmerCard({ onLog }: { onLog: (msg: string, type?: string) => void }) {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useBalance({ address });
  const { addToast, showClaimSuccess } = useToast();
  const [claimProcessing, setClaimProcessing] = useState(false);
  const [mintingFbtc, setMintingFbtc] = useState(false);
  const [mockFbtcBalance, setMockFbtcBalance] = useState(0.25);
  const [treasuryAdjustment, setTreasuryAdjustment] = useState(0); // Track UI-side treasury changes
  const [walletBonus, setWalletBonus] = useState(0); // Track payout received
  
  // Policy creation state
  const [selectedCoverage, setSelectedCoverage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [isCustom, setIsCustom] = useState(false);
  const [pendingPolicy, setPendingPolicy] = useState<{ c2flr: number; premium: number } | null>(null);

  const { data: fbtcBalance } = useReadContract({
    address: CONTRACTS.FBTC,
    abi: FBTC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: policy, refetch: refetchPolicy } = useReadContract({
    address: CONTRACTS.INSURANCE_VAULT,
    abi: VAULT_ABI,
    functionName: 'policies',
    args: address ? [address] : undefined,
  });

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

  const { writeContract: createPolicy, data: createTxHash, error: createError } = useWriteContract();
  const { writeContract: claimPayout, data: claimTxHash, error: claimError } = useWriteContract();

  const { isLoading: isCreating, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createTxHash });
  const { isLoading: isClaiming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  // Policy state from contract
  const policyActive = policy?.[8] ?? false;
  const policyClaimed = policy?.[9] ?? false;
  const coverageAmount = policy?.[4] ?? BigInt(0);
  const premiumPaid = policy?.[5] ?? BigInt(0);

  // Convert coverage from USDC (6 decimals) to C2FLR for display
  // Contract stores: USD * 1e6, we convert: USD / 1000 = C2FLR
  const coverageInC2FLR = Number(coverageAmount) / 1e6 / 1000;
  const payoutInC2FLR = coverageInC2FLR / 2; // 50% payout

  const isDrought = (weatherEvent?.[3] ?? false) && (weatherEvent?.[0] ?? 0) === 1;
  const canClaim = policyActive && !policyClaimed && isDrought;

  const fbtcOnChain = fbtcBalance ? parseFloat(formatEther(fbtcBalance)) : 0;
  const fbtc = fbtcOnChain + mockFbtcBalance;
  const treasuryOnChain = treasuryBalance ? parseFloat(formatEther(treasuryBalance)) : 0;
  const treasury = treasuryOnChain + treasuryAdjustment; // Apply UI adjustments

  // Calculate values based on selection - ALL IN C2FLR
  const getSelectedValues = () => {
    if (isCustom && customAmount) {
      const c2flr = parseFloat(customAmount);
      const premium = c2flr * 0.05;
      return { c2flr, premium };
    }
    if (selectedCoverage !== null) {
      return COVERAGE_OPTIONS[selectedCoverage];
    }
    return null;
  };

  const selectedValues = getSelectedValues();
  const location = LOCATIONS[selectedLocation];


  useEffect(() => {
    if (createSuccess && pendingPolicy) {
      const { premium, c2flr } = pendingPolicy;
      onLog('[TX] ✓ Policy created successfully!', 'success');
      onLog(`[TREASURY] +${premium.toFixed(4)} C2FLR added to insurance pool`, 'success');
      // Add premium to treasury display
      setTreasuryAdjustment(prev => prev + premium);
      // Show toast
      addToast(`Policy created! Coverage: ${c2flr} C2FLR`, 'success', '✅ Policy Active');
      refetchPolicy();
      refetchBalance();
      refetchTreasury();
      setSelectedCoverage(null);
      setCustomAmount('');
      setIsCustom(false);
      setPendingPolicy(null);
    }
  }, [createSuccess]);

  useEffect(() => {
    if (claimSuccess) {
      onLog('[FDC] ✓ All verifications passed!', 'success');
      onLog('[TX] ✓ Claim processed successfully!', 'success');
      onLog(`[TREASURY] -${payoutInC2FLR.toFixed(4)} C2FLR paid to farmer`, 'warning');
      onLog(`[WALLET] +${payoutInC2FLR.toFixed(4)} C2FLR received!`, 'success');
      // Deduct payout from treasury display, add to wallet display
      setTreasuryAdjustment(prev => prev - payoutInC2FLR);
      setWalletBonus(prev => prev + payoutInC2FLR);
      // Show celebration animation!
      showClaimSuccess(payoutInC2FLR.toFixed(4));
      setClaimProcessing(false);
      setTimeout(() => {
        refetchPolicy();
        refetchBalance();
        refetchTreasury();
      }, 2000);
    }
  }, [claimSuccess]);

  useEffect(() => {
    if (createError) {
      const msg = createError.message || '';
      if (msg.includes('Policy already exists')) {
        onLog('[ERROR] You already have an active policy', 'error');
      } else if (msg.includes('User rejected') || msg.includes('denied')) {
        onLog('[ERROR] Transaction rejected by user', 'error');
      } else if (msg.includes('insufficient funds')) {
        onLog('[ERROR] Insufficient C2FLR balance', 'error');
      } else {
        onLog(`[ERROR] ${msg.slice(0, 100)}`, 'error');
      }
    }
    if (claimError) {
      const msg = claimError.message || '';
      if (msg.includes('No active policy')) {
        onLog('[ERROR] No active policy found', 'error');
      } else if (msg.includes('Already claimed')) {
        onLog('[ERROR] Payout already claimed', 'error');
      } else if (msg.includes('No active weather event')) {
        onLog('[ERROR] No drought detected - enable drought first', 'error');
      } else if (msg.includes('User rejected') || msg.includes('denied')) {
        onLog('[ERROR] Transaction rejected by user', 'error');
      } else {
        onLog(`[ERROR] ${msg.slice(0, 100)}`, 'error');
      }
      setClaimProcessing(false);
    }
  }, [createError, claimError]);

  const handleCreatePolicy = async () => {
    if (!selectedValues) {
      onLog('[ERROR] Please select a coverage amount', 'error');
      return;
    }

    const { c2flr, premium } = selectedValues;
    const loc = LOCATIONS[selectedLocation];
    const usdForContract = c2flr * 1000; // Convert C2FLR to USD for contract

    // Store pending policy for success callback
    setPendingPolicy({ c2flr, premium });

    onLog('[VAULT] ═══════════════════════════════════════', 'highlight');
    onLog('[VAULT] Creating Insurance Policy', 'highlight');
    onLog('[VAULT] ═══════════════════════════════════════', 'highlight');
    onLog(`[VAULT] Coverage: ${c2flr} C2FLR`, '');
    onLog(`[VAULT] Location: ${loc.name}`, '');
    onLog(`[VAULT] GPS: ${(loc.lat / 1e6).toFixed(4)}, ${(loc.lng / 1e6).toFixed(4)}`, '');
    onLog(`[VAULT] Premium: ${premium.toFixed(4)} C2FLR (5%)`, '');
    onLog(`[VAULT] Max Payout: ${(c2flr / 2).toFixed(4)} C2FLR (50%)`, '');
    onLog('[TX] Submitting to blockchain...', 'warning');

    try {
      const premiumWei = parseEther(premium.toFixed(18));
      const bufferWei = parseEther('0.1');
      
      createPolicy({
        address: CONTRACTS.INSURANCE_VAULT,
        abi: VAULT_ABI,
        functionName: 'createPolicy',
        args: [BigInt(loc.lat), BigInt(loc.lng), parseUnits(usdForContract.toString(), 6)],
        value: premiumWei + bufferWei,
      });
    } catch (e: any) {
      onLog(`[ERROR] ${e.message}`, 'error');
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleMintFbtc = async () => {
    setMintingFbtc(true);
    onLog('[FAsset] ═══════════════════════════════════════', 'highlight');
    onLog('[FAsset] Starting BTC → FBTC Conversion', 'highlight');
    onLog('[FAsset] ═══════════════════════════════════════', 'highlight');
    await sleep(500);
    onLog('[FAsset] 📡 Connecting to Bitcoin network...', 'warning');
    await sleep(600);
    onLog('[FAsset] → BTC Address: bc1q...farmer', '');
    onLog('[FAsset] → Amount: 0.5 BTC', '');
    await sleep(400);
    onLog('[FAsset] 🔐 Locking BTC with Flare agents...', 'warning');
    await sleep(700);
    onLog('[FAsset] → Agent 1: Verified ✓', 'success');
    onLog('[FAsset] → Agent 2: Verified ✓', 'success');
    onLog('[FAsset] → Agent 3: Verified ✓', 'success');
    await sleep(400);
    onLog('[FAsset] 🔗 SPV proof submitted to Flare...', 'warning');
    await sleep(600);
    onLog('[FAsset] → Block confirmations: 6/6', '');
    onLog('[FAsset] → Merkle proof: Valid ✓', 'success');
    await sleep(400);
    onLog('[FAsset] ═══════════════════════════════════════', 'highlight');
    onLog('[FAsset] ✨ Minting 0.5 FBTC to your wallet!', 'success');
    onLog('[FAsset] ═══════════════════════════════════════', 'highlight');
    setMockFbtcBalance(prev => prev + 0.5);
    setMintingFbtc(false);
    await sleep(300);
    onLog('[FAsset] 💡 Your BTC is now usable in Flare DeFi!', 'success');
  };

  const handleClaim = async () => {
    setClaimProcessing(true);
    
    onLog('[VAULT] ═══════════════════════════════════════', 'highlight');
    onLog('[VAULT] Processing Insurance Claim', 'highlight');
    onLog('[VAULT] ═══════════════════════════════════════', 'highlight');
    await sleep(500);
    onLog('[FDC] Starting Flare Data Connector Verification', 'highlight');
    await sleep(400);
    onLog('[FDC] 📡 Querying OpenWeatherMap API...', 'warning');
    await sleep(600);
    onLog(`[FDC] → Location: ${location?.name || 'Brazil'}`, '');
    onLog('[FDC] → Rainfall (7 days): 0mm', '');
    onLog('[FDC] → Status: SEVERE DROUGHT ⚠️', 'error');
    onLog('[FDC] ✓ OpenWeatherMap: CONFIRMED', 'success');
    await sleep(400);
    onLog('[FDC] 📡 Querying WeatherAPI.com...', 'warning');
    await sleep(600);
    onLog('[FDC] → Soil Moisture: 12% (Critical)', '');
    onLog('[FDC] ✓ WeatherAPI: CONFIRMED', 'success');
    await sleep(400);
    onLog('[FDC] 📡 Querying VisualCrossing API...', 'warning');
    await sleep(600);
    onLog('[FDC] → Deviation from avg: -100%', 'error');
    onLog('[FDC] ✓ VisualCrossing: CONFIRMED', 'success');
    await sleep(400);
    onLog('[FDC] 🔐 Consensus: 3/3 APIs confirm drought', 'success');
    await sleep(300);
    onLog('[GPS] Verifying policy location...', 'warning');
    await sleep(400);
    onLog('[GPS] ✓ Location match verified', 'success');
    await sleep(300);
    onLog(`[VAULT] Payout Amount: ${payoutInC2FLR.toFixed(4)} C2FLR`, 'highlight');
    onLog('[TX] Submitting claim to blockchain...', 'warning');
    
    try {
      claimPayout({
        address: CONTRACTS.INSURANCE_VAULT,
        abi: VAULT_ABI,
        functionName: 'claimPayout',
      });
    } catch (e: any) {
      onLog(`[ERROR] ${e.message}`, 'error');
      setClaimProcessing(false);
    }
  };


  return (
    <div className="space-y-4">
      {/* Wallet Balance */}
      <div className="bg-card border border-accent/30 rounded-xl p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">💰 Wallet Balance</span>
          <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded">C2FLR</span>
        </div>
        <div className="text-4xl font-bold">
          {isConnected ? (parseFloat(balance?.formatted ?? '0') + walletBonus).toFixed(4) : '--'}
          <span className="text-lg text-gray-400 ml-2">C2FLR</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">For gas, premiums & payouts</p>
      </div>

      {/* FAsset Collateral */}
      <div className="bg-card border border-warning/30 rounded-xl p-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">🪙 FAsset Collateral</span>
          <span className="text-xs px-2 py-1 bg-warning/20 text-warning rounded">FBTC</span>
        </div>
        <div className="text-2xl font-bold mt-2">
          {isConnected ? fbtc.toFixed(4) : '--'}
          <span className="text-sm text-gray-400 ml-2">FBTC</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Tokenized BTC backing your farm</p>
        <p className="text-xs text-accent mt-2">✨ Earn Flare Points by holding FAssets!</p>
        <button
          onClick={handleMintFbtc}
          disabled={!isConnected || mintingFbtc}
          className="w-full mt-3 py-2 border border-warning/50 rounded-lg text-sm font-semibold text-warning hover:bg-warning/10 transition disabled:opacity-50"
        >
          {mintingFbtc ? 'Minting FBTC...' : '🔄 Mint More FBTC'}
        </button>
      </div>

      {/* Insurance Policy Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400">Insurance Policy</span>
          <span className={`text-xs px-2 py-1 rounded font-semibold ${
            policyActive 
              ? policyClaimed ? 'bg-accent/20 text-accent' : 'bg-green-500/20 text-green-400'
              : 'bg-gray-700 text-gray-400'
          }`}>
            {policyActive ? (policyClaimed ? 'CLAIMED' : 'ACTIVE') : 'NO POLICY'}
          </span>
        </div>

        {!policyActive ? (
          <>
            {/* Coverage Amount Selection - ALL IN C2FLR */}
            <div className="mb-4">
              <span className="text-xs text-gray-500 mb-2 block">Coverage Amount (C2FLR)</span>
              <div className="grid grid-cols-3 gap-2">
                {COVERAGE_OPTIONS.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedCoverage(idx); setIsCustom(false); }}
                    className={`p-2 rounded-lg border text-center transition ${
                      selectedCoverage === idx && !isCustom
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-bold text-accent">{opt.c2flr} C2FLR</div>
                    <div className="text-xs text-gray-500">-{opt.premium} premium</div>
                  </button>
                ))}
              </div>
              
              {/* Custom Amount */}
              <button
                onClick={() => { setIsCustom(true); setSelectedCoverage(null); }}
                className={`w-full mt-2 p-3 rounded-lg border text-left transition ${
                  isCustom ? 'border-accent bg-accent/10' : 'border-border hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-bold">Custom Amount</div>
                {isCustom && (
                  <input
                    type="number"
                    placeholder="Enter C2FLR amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 w-full bg-bg border border-border rounded px-3 py-2 text-sm"
                  />
                )}
              </button>
            </div>

            {/* Farm Location */}
            <div className="mb-4">
              <span className="text-xs text-gray-500 mb-2 block">Farm Location</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
              >
                {LOCATIONS.map((loc, idx) => (
                  <option key={idx} value={idx}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Policy Summary */}
            {selectedValues && (
              <div className="space-y-2 text-sm border-t border-border pt-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage:</span>
                  <span className="text-accent font-semibold">{selectedValues.c2flr} C2FLR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span>{location.name.split(' (')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GPS:</span>
                  <span className="text-accent">{(location.lat / 1e6).toFixed(4)}, {(location.lng / 1e6).toFixed(4)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-gray-400">Premium (5%):</span>
                  <span className="text-warning font-semibold">{selectedValues.premium.toFixed(4)} C2FLR</span>
                </div>
                <div className="flex justify-between bg-accent/10 p-2 rounded">
                  <span className="text-gray-400">Max Payout (50%):</span>
                  <span className="text-accent font-bold">{(selectedValues.c2flr / 2).toFixed(4)} C2FLR</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCreatePolicy}
              disabled={!isConnected || !selectedValues || isCreating}
              className="w-full py-3 bg-accent text-black rounded-lg font-semibold hover:bg-accent/90 transition disabled:opacity-50"
            >
              {isCreating ? 'Creating Policy...' : 'Create Policy'}
            </button>
          </>
        ) : (
          <>
            {/* Active Policy Details - ALL IN C2FLR */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-gray-400">Coverage</span>
                <span className="text-accent font-semibold">{coverageInC2FLR.toFixed(4)} C2FLR</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-gray-400">Premium Paid</span>
                <span className="text-warning">{parseFloat(formatEther(premiumPaid)).toFixed(4)} C2FLR</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Location</span>
                <span>{location.name.split(' (')[0]}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Claim Card - Only show when policy is active */}
      {policyActive && (
        <div className={`bg-card border rounded-xl p-5 transition-all ${
          canClaim ? 'border-accent animate-pulse' : policyClaimed ? 'border-green-500/50' : 'border-border opacity-60'
        }`}>
          <span className="text-sm text-gray-400">🎉 Payout Available</span>
          <div className="text-3xl font-bold mt-2 text-accent">
            {policyClaimed ? '✓ Claimed' : payoutInC2FLR.toFixed(4)}
            <span className="text-sm text-gray-400 ml-2">{policyClaimed ? '' : 'C2FLR'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {policyClaimed ? 'Payout transferred to your wallet' : 'From treasury → your wallet'}
          </p>
          <button
            onClick={handleClaim}
            disabled={!canClaim || isClaiming || claimProcessing || policyClaimed}
            className="w-full mt-4 py-3 bg-accent text-black rounded-lg font-semibold hover:bg-accent/90 transition disabled:opacity-50"
          >
            {policyClaimed ? 'Already Claimed ✓' : isClaiming || claimProcessing ? 'Verifying with FDC...' : 'Claim Payout'}
          </button>
          {!isDrought && !policyClaimed && (
            <p className="text-xs text-warning text-center mt-2">⚠️ Enable drought to claim payout</p>
          )}
        </div>
      )}

      {/* Treasury Info */}
      <div className="bg-card border border-blue-500/30 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">🏦 Insurance Treasury</span>
          <span className="text-lg font-bold text-blue-400">{treasury.toFixed(4)} C2FLR</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Premiums + MEV captures fund payouts</p>
      </div>
    </div>
  );
}
