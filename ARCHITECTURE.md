# Architecture — Agentic Wallet Sandbox

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Operator / User                              │
│                   (browser or curl commands)                         │
└───────────────────────┬──────────────────────────┬───────────────────┘
                        │ HTTP                     │ HTTP
              ┌─────────▼─────────┐     ┌──────────▼───────────┐
              │  apps/web         │     │  apps/api             │
              │  Next.js Dashboard│     │  Express API          │
              │  - Dashboard      │     │  POST /agents/create  │
              │  - Actions feed   │     │  GET  /agents         │
              │  - Agent detail   │     │  POST /:id/run-once   │
              │  - BottomSheet    │     │  POST /harness/*      │
              └─────────┬─────────┘     │  GET  /actions        │
                        │               │  GET  /health         │
                        └───────────────┤                       │
                                        │  Middleware:           │
                                        │  · Helmet (security)  │
                                        │  · CORS               │
                                        │  · Rate limiter       │
                                        │  · API key auth       │
                                        │  · Body size limit    │
                                        └──────────┬────────────┘
                                                   │
                                        ┌──────────▼────────────┐
                                        │  Services              │
                                        │  ┌─────────────────┐  │
                                        │  │ db.ts (SQLite)  │  │
                                        │  │ · agents table  │  │
                                        │  │ · actions table │  │
                                        │  │ · spl_mints     │  │
                                        │  └─────────────────┘  │
                                        │  ┌─────────────────┐  │
                                        │  │ encryption.ts   │  │
                                        │  │ AES-256-GCM     │  │
                                        │  └─────────────────┘  │
                                        │  ┌─────────────────┐  │
                                        │  │ solana.ts       │  │
                                        │  │ Connection mgr  │  │
                                        │  │ Airdrop helper  │  │
                                        │  │ SPL mint ops    │  │
                                        │  └─────────────────┘  │
                                        └──────────┬────────────┘
                                                   │
                                        ┌──────────▼────────────┐
                                        │  Harness Runner        │
                                        │  · In-process loop     │
                                        │  · runAgentOnce()      │
                                        │  · runAllAgentsCycle() │
                                        └──────────┬────────────┘
                                                   │
                                        ┌──────────▼────────────┐
                                        │  packages/core         │
                                        │  ┌─────────────────┐  │
                                        │  │ agent/decision  │  │
                                        │  │ decideNextAction│  │
                                        │  │ (rule-based AI) │  │
                                        │  └─────────────────┘  │
                                        │  ┌─────────────────┐  │
                                        │  │ wallet/walletOps│  │
                                        │  │ transferSol()   │  │
                                        │  │ transferSpl()   │  │
                                        │  │ jupiterSwap()   │  │
                                        │  │ getBalances()   │  │
                                        │  └─────────────────┘  │
                                        └──────────┬────────────┘
                                                   │ RPC calls
                              ┌────────────────────┴──────────────────┐
                              │              Solana Devnet             │
                              │  ┌──────────────┐  ┌───────────────┐  │
                              │  │ System Prog  │  │ SPL Token Prog│  │
                              │  └──────────────┘  └───────────────┘  │
                              └──────────────────┬────────────────────┘
                                                 │
                                   ┌─────────────▼──────────────┐
                                   │    Jupiter Quote API v6     │
                                   │  (quote → swap → sign)      │
                                   └────────────────────────────┘
```

---

## Module Responsibilities

### `packages/core`
Pure, framework-agnostic TypeScript. No Express, no SQLite, no config.

| Module | Responsibility |
|--------|---------------|
| `types.ts` | All shared TypeScript interfaces: `AgentRecord`, `ActionRecord`, `HarnessStatus`, etc. |
| `agent/decision.ts` | Rule-based action selection. Takes context (balances, cycle index) → returns `ActionType`. No side effects. |
| `wallet/walletOps.ts` | Builds, signs, and sends Solana transactions. Returns signatures and explorer URLs. Jupiter swap flow lives here. |

### `apps/api`
Express server, harness runner, and all backend services.

| Module | Responsibility |
|--------|---------------|
| `src/index.ts` | Entry point. Starts HTTP server, graceful shutdown. |
| `src/app.ts` | Express app factory. Applies middleware, mounts routes. |
| `src/config.ts` | Validates and exports typed config from env vars using Zod. |
| `src/logger.ts` | Pino logger with secret redaction. |
| `src/validators.ts` | Zod schemas for all request inputs. |
| `src/middleware/auth.ts` | API key validation middleware. |
| `src/middleware/rateLimiter.ts` | Read/write rate limit instances. |
| `src/services/db.ts` | SQLite DAO layer. Migrations, CRUD for agents/actions/mints. |
| `src/services/encryption.ts` | AES-256-GCM encrypt/decrypt for agent private keys. |
| `src/services/solana.ts` | Solana `Connection` singleton, airdrop with retry, SPL mint creation. |
| `src/harness/runner.ts` | Harness loop state machine. `runAgentOnce`, `runAllAgentsCycle`, start/stop. |
| `src/routes/agents.ts` | `/agents` CRUD and run-once endpoint. |
| `src/routes/harness.ts` | `/harness` start/stop/run-once endpoints. |
| `src/routes/actions.ts` | `/actions` listing with filters. |
| `src/routes/health.ts` | `/health` check with DB and RPC checks. |

### `apps/web`
Next.js 14 App Router observer dashboard.

| Module | Responsibility |
|--------|---------------|
| `src/app/page.tsx` | Server component: fetches initial data, passes to `DashboardClient`. |
| `src/app/components/DashboardClient.tsx` | Client component: agents table, stats, create/run controls. |
| `src/app/actions/page.tsx` | Action feed page with filters and pagination. |
| `src/app/agents/[id]/page.tsx` | Agent detail page. |
| `src/app/components/BottomSheet.tsx` | Slide-up transaction details modal. Auto-closes on success. |
| `src/app/components/StatusBadge.tsx` | Colored status pill component. |
| `src/app/components/Sidebar.tsx` | Navigation sidebar. |
| `src/app/lib/api.ts` | Typed API client. All fetch calls to the backend. |

---

## Data Flow: Agent Action Cycle

```
1. runAgentOnce(agentId)
   ↓
2. Fetch agent from DB
   ↓
3. Decrypt secretKey from DB (in memory only)
   ↓
4. getSolBalance() + getSplBalance() [RPC]
   ↓
5. decideNextAction(ctx) → ActionType
   ↓
6. Insert ACTION record with status=PENDING
   ↓
7. executeAction(secretKey, actionType)
   ├── transferSol → SystemProgram transfer
   ├── transferSpl → SPL Token Program transfer
   └── jupiterSwap → Quote → Swap → VersionedTx → Sign → Send
   ↓
8. Update ACTION record: status, signature, explorerUrl, finishedAt
   ↓
9. Zero out secretKey reference (GC collects)
```
