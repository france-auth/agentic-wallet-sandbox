'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, type Agent, type ActionRecord } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { BottomSheet } from './BottomSheet';

interface Props {
  agent: Agent;
  initialActions: ActionRecord[];
}

export function AgentDetailClient({ agent: initialAgent, initialActions }: Props) {
  const [agent, setAgent] = useState(initialAgent);
  const [actions, setActions] = useState(initialActions);
  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    const [agentRes, actionsRes] = await Promise.allSettled([
      api.getAgent(agent.id),
      api.getActions({ agentId: agent.id, limit: 15 }),
    ]);
    if (agentRes.status === 'fulfilled') setAgent(agentRes.value.agent);
    if (actionsRes.status === 'fulfilled') setActions(actionsRes.value.actions);
  }

  async function handleRunOnce() {
    setLoading(true);
    try {
      const res = await api.runAgentOnce(agent.id);
      setSelectedAction(res.action);
      await handleRefresh();
    } finally {
      setLoading(false);
    }
  }

  const explorerUrl = `https://explorer.solana.com/address/${agent.publicKey}?cluster=devnet`;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">Dashboard</Link>
        <span>›</span>
        <span className="text-slate-300">{agent.name}</span>
      </div>

      {/* Agent header */}
      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{agent.name}</h1>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-accent-cyan hover:text-cyan-300 mt-1 inline-flex items-center gap-1"
            >
              {agent.publicKey} ↗
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-2 text-sm font-mono border border-border rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              ↻
            </button>
            <button
              onClick={handleRunOnce}
              disabled={loading}
              className="px-4 py-2 text-sm font-mono bg-accent-purple/20 border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/30 rounded-lg transition-all disabled:opacity-40"
            >
              {loading ? '...' : '▶ Run Once'}
            </button>
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-surface-3 border border-border rounded-lg p-4">
            <p className="text-[10px] text-slate-500 tracking-widest font-mono mb-1">SOL BALANCE</p>
            <p className="text-2xl font-display font-bold text-accent-cyan">{agent.solBalance.toFixed(6)}</p>
            <p className="text-xs text-slate-500 font-mono">SOL</p>
          </div>
          <div className="bg-surface-3 border border-border rounded-lg p-4">
            <p className="text-[10px] text-slate-500 tracking-widest font-mono mb-1">SPL BALANCE</p>
            <p className="text-2xl font-display font-bold text-accent-purple">{agent.splBalance.toFixed(2)}</p>
            <p className="text-xs text-slate-500 font-mono truncate">{agent.splMint?.slice(0, 12) ?? 'no mint'}…</p>
          </div>
          <div className="bg-surface-3 border border-border rounded-lg p-4">
            <p className="text-[10px] text-slate-500 tracking-widest font-mono mb-1">LAST STATUS</p>
            {agent.lastActionStatus ? (
              <div className="mt-1">
                <StatusBadge status={agent.lastActionStatus} />
              </div>
            ) : (
              <p className="text-slate-500 font-mono text-sm">—</p>
            )}
            <p className="text-xs text-slate-600 font-mono mt-1">
              {agent.lastActionAt ? new Date(agent.lastActionAt).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Recent actions */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-white">Recent Actions</h2>
        </div>
        {actions.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-500 font-mono text-sm">
            No actions yet. Click "Run Once" to execute an action.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-3/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={action.status} />
                  <div>
                    <p className="text-xs font-mono text-slate-200">
                      {action.type.replace('ACTION_', '')}
                    </p>
                    {action.signature && (
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {action.signature.slice(0, 20)}…
                      </p>
                    )}
                    {action.error && (
                      <p className="text-[10px] font-mono text-accent-red/70 mt-0.5">
                        {action.error.slice(0, 50)}…
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-500">
                    {new Date(action.startedAt).toLocaleTimeString()}
                  </p>
                  {action.amount != null && (
                    <p className="text-[10px] font-mono text-slate-400">
                      {action.amount.toLocaleString()} units
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomSheet action={selectedAction} onClose={() => setSelectedAction(null)} />
    </div>
  );
}
