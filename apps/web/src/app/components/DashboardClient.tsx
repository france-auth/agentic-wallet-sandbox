'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type Agent, type ActionRecord, type HarnessStatus } from './lib/api';
import { StatusBadge } from './components/StatusBadge';
import { BottomSheet } from './components/BottomSheet';
import clsx from 'clsx';

interface Props {
  initialAgents: Agent[];
  initialHealth: { status: string; harness: HarnessStatus; checks: Record<string, string> } | null;
  initialRecentActions: ActionRecord[];
}

export function DashboardClient({ initialAgents, initialHealth, initialRecentActions }: Props) {
  const [agents, setAgents] = useState(initialAgents);
  const [health, setHealth] = useState(initialHealth);
  const [recentActions, setRecentActions] = useState(initialRecentActions);
  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [createCount, setCreateCount] = useState(2);

  const refreshAll = useCallback(async () => {
    const [a, h, ac] = await Promise.allSettled([
      api.getAgents(),
      api.getHealth(),
      api.getActions({ limit: 5 }),
    ]);
    if (a.status === 'fulfilled') setAgents(a.value.agents);
    if (h.status === 'fulfilled') setHealth(h.value);
    if (ac.status === 'fulfilled') setRecentActions(ac.value.actions);
  }, []);

  async function handleCreateAgents() {
    setLoading('create');
    try {
      await api.createAgents(createCount);
      await refreshAll();
    } finally {
      setLoading(null);
    }
  }

  async function handleRunOnce(agentId: string) {
    setLoading(agentId);
    try {
      const res = await api.runAgentOnce(agentId);
      setSelectedAction(res.action);
      await refreshAll();
    } finally {
      setLoading(null);
    }
  }

  async function handleRunAll() {
    setLoading('runAll');
    try {
      const res = await api.runAllOnce();
      if (res.actions.length > 0) setSelectedAction(res.actions[0]);
      await refreshAll();
    } finally {
      setLoading(null);
    }
  }

  async function handleHarnessToggle() {
    setLoading('harness');
    try {
      if (health?.harness.running) {
        await api.stopHarness();
      } else {
        await api.startHarness(30000);
      }
      await refreshAll();
    } finally {
      setLoading(null);
    }
  }

  const harnessRunning = health?.harness.running ?? false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wide">
            Agent Dashboard
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} · devnet
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Harness toggle */}
          <button
            onClick={handleHarnessToggle}
            disabled={loading === 'harness'}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-mono border transition-all',
              harnessRunning
                ? 'bg-accent-red/20 border-accent-red/40 text-accent-red hover:bg-accent-red/30'
                : 'bg-accent-green/20 border-accent-green/40 text-accent-green hover:bg-accent-green/30'
            )}
          >
            {loading === 'harness' ? '...' : harnessRunning ? '⏹ Stop Loop' : '▶ Start Loop'}
          </button>
          {/* Run all once */}
          <button
            onClick={handleRunAll}
            disabled={!!loading || agents.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-mono border border-accent-purple/40 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-all disabled:opacity-40"
          >
            {loading === 'runAll' ? '...' : '⚡ Run All'}
          </button>
          {/* Refresh */}
          <button
            onClick={refreshAll}
            className="px-3 py-2 rounded-lg text-sm font-mono border border-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Agents', value: agents.length, color: 'text-accent-cyan' },
          { label: 'Successful', value: recentActions.filter(a => a.status === 'SUCCESS').length, color: 'text-accent-green' },
          { label: 'Failed', value: recentActions.filter(a => a.status === 'FAILED').length, color: 'text-accent-red' },
          { label: 'Harness Cycles', value: health?.harness.cyclesRun ?? 0, color: 'text-accent-purple' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-2 border border-border rounded-xl p-4">
            <p className="text-[10px] text-slate-500 tracking-widest font-mono mb-1">{s.label.toUpperCase()}</p>
            <p className={clsx('text-3xl font-display font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create agents */}
      <div className="bg-surface-2 border border-border rounded-xl p-5">
        <h2 className="font-display font-semibold text-white mb-3">Create Agents</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={20}
            value={createCount}
            onChange={(e) => setCreateCount(parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 bg-surface-3 border border-border rounded-lg font-mono text-sm text-white focus:outline-none focus:border-accent-purple"
          />
          <span className="text-sm text-slate-400 font-mono">agents</span>
          <button
            onClick={handleCreateAgents}
            disabled={loading === 'create'}
            className="px-4 py-2 rounded-lg text-sm font-mono bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/30 transition-all disabled:opacity-40"
          >
            {loading === 'create' ? 'Creating...' : '+ Create'}
          </button>
          <p className="text-xs text-slate-500 font-mono">Airdrops SOL + creates SPL mint + mints tokens to each agent</p>
        </div>
      </div>

      {/* Agents table */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-white">Agents</h2>
          <span className="text-xs text-slate-500 font-mono">{agents.length} total</span>
        </div>

        {agents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-4xl mb-3">◈</p>
            <p className="text-slate-400 font-mono text-sm">No agents yet.</p>
            <p className="text-slate-600 font-mono text-xs mt-1">Create agents above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 tracking-widest border-b border-border">
                  <th className="px-5 py-3 text-left">NAME</th>
                  <th className="px-5 py-3 text-left">PUBLIC KEY</th>
                  <th className="px-5 py-3 text-right">SOL</th>
                  <th className="px-5 py-3 text-right">SPL</th>
                  <th className="px-5 py-3 text-left">LAST STATUS</th>
                  <th className="px-5 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => (
                  <tr
                    key={agent.id}
                    className={clsx(
                      'border-b border-border/50 hover:bg-surface-3/50 transition-colors',
                      i % 2 === 0 ? 'bg-surface-1/30' : ''
                    )}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="text-accent-cyan hover:text-cyan-300 font-semibold"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      <span title={agent.publicKey}>
                        {agent.publicKey.slice(0, 8)}…{agent.publicKey.slice(-6)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-white">
                      {agent.solBalance.toFixed(4)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300">
                      {agent.splBalance.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      {agent.lastActionStatus ? (
                        <StatusBadge status={agent.lastActionStatus} />
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleRunOnce(agent.id)}
                        disabled={!!loading}
                        className="px-3 py-1 rounded text-xs font-mono bg-accent-purple/20 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/30 transition-all disabled:opacity-40"
                      >
                        {loading === agent.id ? '...' : '▶ Run'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent actions */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-white">Recent Actions</h2>
          <Link href="/actions" className="text-xs text-accent-purple font-mono hover:text-purple-300">
            View all →
          </Link>
        </div>
        {recentActions.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500 text-sm font-mono">No actions recorded yet.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {recentActions.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-3/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={action.status} />
                  <span className="text-xs font-mono text-slate-300">
                    {action.type.replace('ACTION_', '')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(action.startedAt).toLocaleTimeString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomSheet action={selectedAction} onClose={() => setSelectedAction(null)} />
    </div>
  );
}
