'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

interface Step {
  id: number;
  title: string;
  description: string;
  action: string;
  completed: boolean;
}

export function DemoFlow({ onStepClick }: { onStepClick: (step: number) => void }) {
  const { isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Connect to Flare Coston2 testnet',
      action: 'Click Connect button',
      completed: isConnected,
    },
    {
      id: 2,
      title: 'Create Policy',
      description: 'Purchase crop insurance for your farm',
      action: 'Pay 1 C2FLR premium',
      completed: false,
    },
    {
      id: 3,
      title: 'Trigger Drought',
      description: 'Simulate weather event via FDC oracle',
      action: 'Toggle drought switch',
      completed: false,
    },
    {
      id: 4,
      title: 'Bot Attack',
      description: 'Watch MEV bot get captured by hook',
      action: 'Click Simulate Attack',
      completed: false,
    },
    {
      id: 5,
      title: 'Claim Payout',
      description: 'Receive insurance + MEV proceeds',
      action: 'Click Claim button',
      completed: false,
    },
  ];

  return (
    <div className="bg-card border border-accent/30 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-accent">🎯 Demo Flow</h3>
        <span className="text-xs text-gray-500">
          {steps.filter(s => s.completed).length}/{steps.length} completed
        </span>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={`flex-shrink-0 p-3 rounded-lg border transition-all ${
              step.completed
                ? 'bg-accent/20 border-accent text-accent'
                : index === currentStep
                ? 'bg-card border-accent/50 text-white'
                : 'bg-bg border-border text-gray-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step.completed ? 'bg-accent text-black' : 'bg-gray-700'
              }`}>
                {step.completed ? '✓' : step.id}
              </span>
              <span className="text-sm font-semibold">{step.title}</span>
            </div>
            <p className="text-xs text-gray-500 text-left">{step.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
