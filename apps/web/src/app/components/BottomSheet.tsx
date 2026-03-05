'use client';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { ActionRecord } from '../lib/api';
import { StatusBadge } from './StatusBadge';

interface BottomSheetProps {
  action: ActionRecord | null;
  onClose: () => void;
}

export function BottomSheet({ action, onClose }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (action) {
      setVisible(true);
      setExiting(false);
      // Auto-close on success after 5s
      if (action.status === 'SUCCESS') {
        const t = setTimeout(() => handleClose(), 5000);
        return () => clearTimeout(t);
      }
    }
  }, [action]);

  function handleClose() {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 280);
  }

  if (!action || !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity',
          exiting ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 z-50 bg-surface-2 border-t border-border rounded-t-2xl p-6 shadow-2xl',
          exiting ? 'sheet-exit' : 'sheet-enter'
        )}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Transaction Details</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{action.type.replace('ACTION_', '')}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={action.status} />
            <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>

        <div className="space-y-3">
          {action.signature && (
            <div className="bg-surface-3 rounded-lg p-3 border border-border">
              <p className="text-[10px] text-slate-500 mb-1 tracking-widest">SIGNATURE</p>
              <p className="font-mono text-xs text-accent-cyan break-all">{action.signature}</p>
            </div>
          )}

          {action.explorerUrl && (
            <a
              href={action.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-sm font-mono hover:bg-accent-purple/30 transition-colors w-full justify-center"
            >
              <span>↗</span> View on Solana Explorer
            </a>
          )}

          {action.error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3">
              <p className="text-[10px] text-accent-red mb-1 tracking-widest">ERROR</p>
              <p className="text-xs text-red-300 font-mono break-all">{action.error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {action.amount !== null && (
              <div className="bg-surface-3 rounded-lg p-3 border border-border">
                <p className="text-[10px] text-slate-500 tracking-widest mb-1">AMOUNT</p>
                <p className="font-mono text-white">{action.amount.toLocaleString()}</p>
              </div>
            )}
            <div className="bg-surface-3 rounded-lg p-3 border border-border">
              <p className="text-[10px] text-slate-500 tracking-widest mb-1">STARTED</p>
              <p className="font-mono text-white">{new Date(action.startedAt).toLocaleTimeString()}</p>
            </div>
          </div>

          {action.status === 'SUCCESS' && (
            <p className="text-center text-xs text-slate-500 font-mono">Auto-closing in 5s…</p>
          )}
        </div>
      </div>
    </>
  );
}
