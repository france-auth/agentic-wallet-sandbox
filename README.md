# ◈ Agentic Wallet Sandbox

> **⚠️ PROTOTYPE WARNING**: This is a devnet-only prototype built for demonstration purposes. It uses Solana **devnet** and does NOT involve real funds. **Do NOT use production private keys, mainnet wallets, or real SOL.** The encryption and security measures are appropriate for a prototype, not a production system. See [SECURITY.md](./SECURITY.md) for the full threat model.

A multi-agent autonomous wallet system on Solana devnet — agents create wallets, hold SOL and SPL tokens, and automatically execute transactions including Jupiter swaps. Observe all activity through a live Next.js dashboard.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web (Next.js)          Observer Dashboard             │
│  ┌──────────┐ ┌───────────┐ ┌─────────────────────────┐   │
│  │Dashboard │ │ /actions  │ │  /agents/[id]  detail    │   │
│  └──────────┘ └───────────┘ └─────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (REST)
┌─────────────────────────▼───────────────────────────────────┐
│  apps/api (Express)                                         │
│  ┌────────────────┐   ┌──────────────────────────────────┐ │
│  │ POST /agents   │   │  Harness Runner (in-process loop)│ │
│  │ GET  /agents   │   │  · decideNextAction (round-robin)│ │
│  │ GET  /actions  │   │  · executeAction                 │ │
│  │ POST /harness  │   │    SOL transfer / SPL / Jupiter  │ │
│  └───────┬────────┘   └───────────────┬──────────────────┘ │
│          │                            │                     │
│  ┌───────▼────────────────────────────▼──────────────────┐ │
│  │  Services: db (SQLite) · encryption · solana · logger │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ @solana/web3.js + spl-token
┌─────────────────────────▼───────────────────────────────────┐
│  packages/core                                              │
│  · walletOps: transferSol / transferSpl / jupiterSwap       │
│  · agent/decision: decideNextAction (rule-based logic)      │
│  · types: AgentRecord, ActionRecord, HarnessStatus          │
└─────────────────────────┬───────────────────────────────────┘
                          │ RPC
          ┌───────────────▼──────────────┐
          │   Solana Devnet / Jupiter API │
          └──────────────────────────────┘
```

---

## Quickstart

### Prerequisites

- Node.js 18+
- pnpm 9+

```bash
npm install -g pnpm
```

### 1. Install dependencies

```bash
git clone <repo>
cd agentic-wallet-sandbox
pnpm install
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```bash
# Generate a master key (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# → paste result as AGENT_MASTER_KEY

# Set a strong API key
API_KEY=my-secure-api-key-here

# Set a receiver devnet address (can be any valid pubkey)
RECEIVER_PUBLIC_KEY=<any devnet public key>
```

### 3. Configure the web app

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=my-secure-api-key-here  # same as API_KEY above
```

### 4. Run the API

```bash
pnpm dev:api
# → http://localhost:3001
```

### 5. Run the web dashboard

```bash
pnpm dev:web
# → http://localhost:3000
```

### 6. Run tests

```bash
pnpm test              # all tests (unit + integration)
pnpm test:unit         # unit tests only (no devnet required)
pnpm test:integration  # devnet integration (skips if unavailable)
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev:api` | Start API in dev mode (tsx watch) |
| `pnpm dev:web` | Start Next.js dev server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Unit tests only |
| `pnpm test:integration` | Devnet integration tests |
| `pnpm format` | Format all files with Prettier |

---

## 3-Minute Demo Walkthrough

**Step 1: Start services**
```bash
# Terminal 1
pnpm dev:api

# Terminal 2  
pnpm dev:web
```

**Step 2: Create agents via API**
```bash
curl -X POST http://localhost:3001/agents/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"count": 3}'
```
This creates 3 agents, airdrops 0.5 SOL each, creates a SPL mint, and mints 1 token to each.

**Step 3: View the dashboard**
Open http://localhost:3000 — you'll see 3 agents with their SOL and SPL balances.

**Step 4: Run a cycle manually**
```bash
curl -X POST http://localhost:3001/harness/run-once \
  -H "x-api-key: $API_KEY"
```
Watch the Actions feed update in real time.

**Step 5: Start the automatic loop**
```bash
curl -X POST http://localhost:3001/harness/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"intervalMs": 15000}'
```
Agents will now automatically execute actions every 15 seconds.

**Step 6: Click any action row** in the UI to see the transaction details bottom sheet with an Explorer link.

---

## Troubleshooting

### Devnet RPC rate limits
The default `https://api.devnet.solana.com` is heavily rate-limited. If you see 429 errors:
- Wait 30 seconds and retry
- Use a dedicated RPC: [Helius](https://helius.dev), [QuickNode](https://quicknode.com), or [Alchemy](https://alchemy.com) all offer free devnet tiers
- Set `SOLANA_RPC_URL=https://your-rpc.helius-rpc.com/?api-key=xxx`

### Airdrop failures
Devnet airdrops are sometimes unreliable. The system retries 5 times with exponential backoff. If an agent has 0 SOL after creation, you can manually airdrop:
```bash
solana airdrop 1 <agent-public-key> --url devnet
```

### Jupiter no route on devnet
Jupiter has limited liquidity on devnet. The `ACTION_JUPITER_SWAP` action will return `SKIPPED_NO_ROUTE` if no route is available — this is expected behavior and does not crash the harness. To test swaps, try different output mints or use mainnet-fork RPCs.

### DB not found
The SQLite database is created at `apps/api/data/agents.db`. The directory is created automatically on first run.
