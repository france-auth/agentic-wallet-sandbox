'use client';
import { useState, useCallback } from 'react';
import { api, type ActionRecord, type Agent } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { BottomSheet } from './BottomSheet';
import clsx from 'clsx';

interface Props {
  initialActions: ActionRecord[];
  initialTotal: number;
  agents: Agent[];
}

const ACTION_TYPES = ['', 'ACTION_SOL_TRANSFER', 'ACTION_SPL_TRANSFER', 'ACTION_JUPITER_SWAP'];
const STATUSES = ['', 'SUCCESS', 'FAILED', 'PENDING', 'SKIPPED_NO_ROUTE'];

function typeLabel(t: string) {
  return t.replace('ACTION_', '') || 'ALL TYPES';
}

export function ActionsClient({ initialActions, initialTotal, agents }: Props) {
  const [actions, setActions] = useState(initialActions);
  const [total, setTotal] = useState(initialTotal);
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedAction, setSelectedAction] = useState<ActionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  const fetchActions = useCallback(async (ag: string, st: string, ty: string, off: number) => {
    setLoading(true);
    try {
      const res = await api.getActions({
        agentId: ag || undefined,
        status: st || undefined,
        type: ty || undefined,
        limit: LIMIT,
        offset: off,
      });
      setActions(res.actions);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFilter(ag: string, st: string, ty: string) {
    setAgentFilter(ag);
    setStatusFilter(st);
    setTypeFilter(ty);
    setOffset(0);
    fetchActions(ag, st, ty, 0);
  }

  function handlePage(newOffset: number) {
    setOffset(newOffset);
    fetchActions(agentFilter, statusFilter, typeFilter, newOffset);
  }

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white tracking-wide">Action Feed</h1>
        <p className="text-sm text-slate-400 font-mono mt-1">{total} total actions</p>
      </div>

      {/* Filters */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] text-slate-500 tracking-widest mb-1.5">AGENT</label>
          <select
            value={agentFilter}
            onChange={(e) => handleFilter(e.target.value, statusFilter, typeFilter)}
            className="bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent-purple"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 tracking-widest mb-1.5">STATUS</label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilter(agentFilter, e.target.value, typeFilter)}
            className="bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent-purple"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 tracking-widest mb-1.5">TYPE</label>
          <select
            value={typeFilter}
            onChange={(e) => handleFilter(agentFilter, statusFilter, e.target.value)}
            className="bg-surface-3 border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent-purple"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
        </div>
        {(agentFilter || statusFilter || typeFilter) && (
          <button
            onClick={() => handleFilter('', '', '')}
            className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white border border-border rounded-lg transition-colors"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-mono text-sm">Loading...</div>
        ) : actions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-sm">No actions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-slate-500 tracking-widest border-b border-border bg-surface-1/50">
                  <th className="px-5 py-3 text-left">TIME</th>
                  <th className="px-5 py-3 text-left">AGENT</th>
                  <th className="px-5 py-3 text-left">TYPE</th>
                  <th className="px-5 py-3 text-left">STATUS</th>
                  <th className="px-5 py-3 text-left">SIGNATURE</th>
                  <th className="px-5 py-3 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action, i) => {
                  const agent = agents.find(a => a.id === action.agentId);
                  return (
                    <tr
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className={clsx(
                        'border-b border-border/40 cursor-pointer hover:bg-surface-3/60 transition-colors',
                        i % 2 === 0 ? '' : 'bg-surface-1/20'
                      )}
                    >
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(action.startedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 text-accent-cyan">
                        {agent?.name ?? action.agentId.slice(0, 8) + '…'}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {action.type.replace('ACTION_', '')}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={action.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {action.signature
                          ? `${action.signature.slice(0, 10)}…`
                          : action.error
                          ? <span className="text-accent-red/70 text-[10px]">{action.error.slice(0, 30)}…</span>
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">
                        {action.amount?.toLocaleString() ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-slate-500 font-mono">
              Page {currentPage} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePage(offset - LIMIT)}
                disabled={offset === 0}
                className="px-3 py-1 text-xs font-mono border border-border rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => handlePage(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1 text-xs font-mono border border-border rounded text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomSheet action={selectedAction} onClose={() => setSelectedAction(null)} />
    </div>
  );
}
