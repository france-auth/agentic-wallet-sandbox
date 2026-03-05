const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? '';

interface FetchOptions {
  method?: string;
  body?: unknown;
  cache?: RequestCache;
  next?: { revalidate?: number };
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache,
    next: opts.next,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Agent {
  id: string;
  name: string;
  publicKey: string;
  solBalance: number;
  splBalance: number;
  splMint: string | null;
  lastActionStatus: string | null;
  lastActionAt: string | null;
  createdAt: string;
}

export interface ActionRecord {
  id: string;
  agentId: string;
  type: string;
  status: string;
  amount: number | null;
  mint: string | null;
  signature: string | null;
  explorerUrl: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export interface HarnessStatus {
  running: boolean;
  intervalMs: number;
  startedAt: string | null;
  cyclesRun: number;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  getAgents: () =>
    apiFetch<{ agents: Agent[]; count: number }>('/agents', { next: { revalidate: 5 } }),

  getAgent: (id: string) =>
    apiFetch<{ agent: Agent }>(`/agents/${id}`, { next: { revalidate: 5 } }),

  createAgents: (count: number) =>
    apiFetch<{ created: Agent[]; count: number; splMint: string | null }>('/agents/create', {
      method: 'POST',
      body: { count },
    }),

  runAgentOnce: (id: string) =>
    apiFetch<{ action: ActionRecord }>(`/agents/${id}/run-once`, { method: 'POST' }),

  runAllOnce: () =>
    apiFetch<{ actions: ActionRecord[]; count: number }>('/harness/run-once', { method: 'POST' }),

  getActions: (params: {
    agentId?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    );
    return apiFetch<{ actions: ActionRecord[]; total: number; limit: number; offset: number }>(
      `/actions?${q}`,
      { next: { revalidate: 5 } }
    );
  },

  getHealth: () =>
    apiFetch<{ status: string; harness: HarnessStatus; checks: Record<string, string> }>('/health'),

  startHarness: (intervalMs?: number) =>
    apiFetch('/harness/start', { method: 'POST', body: { intervalMs } }),

  stopHarness: () =>
    apiFetch('/harness/stop', { method: 'POST' }),

  getHarnessStatus: () =>
    apiFetch<{ status: HarnessStatus }>('/harness/status'),
};
