'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'claim' | 'mev';
  title?: string;
}

interface ToastContextType {
  addToast: (message: string, type: Toast['type'], title?: string) => void;
  showClaimSuccess: (amount: string) => void;
  showMevCaptured: (amount: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState('');

  const addToast = useCallback((message: string, type: Toast['type'], title?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const showClaimSuccess = useCallback((amount: string) => {
    setCelebrationAmount(amount);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
  }, []);

  const showMevCaptured = useCallback((amount: string) => {
    addToast(`${amount} C2FLR captured from MEV bot!`, 'mev', '🤖 Bot Trapped!');
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-400';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-yellow-400';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-blue-400';
      case 'claim':
        return 'bg-gradient-to-r from-accent to-green-400 text-black border-accent';
      case 'mev':
        return 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-red-400';
      default:
        return 'bg-gray-700 text-white border-gray-600';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'claim': return '🎉';
      case 'mev': return '🛡️';
      default: return '•';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, showClaimSuccess, showMevCaptured }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`px-4 py-3 rounded-xl shadow-2xl cursor-pointer border-l-4 backdrop-blur-sm
              transform transition-all duration-300 hover:scale-105
              animate-slide-up ${getToastStyles(toast.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getIcon(toast.type)}</span>
              <div className="flex-1">
                {toast.title && (
                  <p className="font-bold text-sm">{toast.title}</p>
                )}
                <p className="text-sm opacity-90">{toast.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          {/* Confetti Effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: ['#00D4AA', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][Math.floor(Math.random() * 5)],
                  width: `${8 + Math.random() * 8}px`,
                  height: `${8 + Math.random() * 8}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                }}
              />
            ))}
          </div>
          
          {/* Success Card */}
          <div className="bg-card border-2 border-accent rounded-2xl p-8 shadow-2xl animate-bounce-in text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-accent mb-2">Payout Received!</h2>
            <p className="text-4xl font-bold text-white mb-2">+{celebrationAmount} C2FLR</p>
            <p className="text-gray-400 text-sm">Transferred from Insurance Treasury</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="text-2xl">🌾</span>
              <span className="text-2xl">👨‍🌾</span>
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
        
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
