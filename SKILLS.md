# SKILLS.md — AI Agent Guide

This file is intended for AI coding agents working in this repository. It provides a map of the codebase, explains where key logic lives, and describes how to extend the system.

---

## Repo Map

```
agentic-wallet-sandbox/
├── packages/core/src/
│   ├── types.ts              ← ALL shared TypeScript types. Start here.
│   ├── agent/decision.ts     ← Action decision logic (rule-based AI simulation)
│   └── wallet/walletOps.ts   ← SOL/SPL transfer + Jupiter swap implementation
├── apps/api/src/
│   ├── config.ts             ← Env var loading + validation (Zod)
│   ├── validators.ts         ← Request body validators (Zod)
│   ├── harness/runner.ts     ← Agent loop, runAgentOnce, runAllAgentsCycle
│   ├── services/
│   │   ├── db.ts             ← SQLite DAO (agents, actions, spl_mints tables)
│   │   ├── encryption.ts     ← AES-256-GCM encrypt/decrypt
│   │   └── solana.ts         ← Connection, airdrop, mint helpers
│   └── routes/               ← Express route handlers
└── apps/web/src/app/
    ├── lib/api.ts             ← Typed API client
    └── components/            ← React components
```

---

## How to Add a New Action Type

### Step 1: Add the type to `packages/core/src/types.ts`

```typescript
export type ActionType =
  | 'ACTION_SOL_TRANSFER'
  | 'ACTION_SPL_TRANSFER'
  | 'ACTION_JUPITER_SWAP'
  | 'ACTION_MY_NEW_ACTION';  // ← add here
```

### Step 2: Update decision logic in `packages/core/src/agent/decision.ts`

```typescript
export function decideNextAction(ctx: DecisionContext): ActionType {
  const actions: ActionType[] = [
    'ACTION_SOL_TRANSFER',
    'ACTION_SPL_TRANSFER',
    'ACTION_JUPITER_SWAP',
    'ACTION_MY_NEW_ACTION',  // ← add here
  ];
  // ... existing round-robin logic
}
```

### Step 3: Implement the action in `apps/api/src/harness/runner.ts`

In the `executeAction` function, add a case to the switch statement:

```typescript
case 'ACTION_MY_NEW_ACTION': {
  // Implement your action
  const result = await myNewAction(connection, { ... });
  return {
    status: 'SUCCESS',
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    amount: 0,
  };
}
```

### Step 4: Add wallet operation in `packages/core/src/wallet/walletOps.ts` (if needed)

Add a new exported function following the pattern of `transferSol`:

```typescript
export async function myNewOp(
  connection: Connection,
  params: MyNewOpParams
): Promise<WalletOpResult> {
  // Build transaction
  // Sign and send
  // Return { signature, explorerUrl }
}
```

### Step 5: Update the Zod validators if the API needs new params

Edit `apps/api/src/validators.ts`.

### Step 6: Write tests

Add unit tests in `apps/api/tests/unit/`.

---

## Where Wallet Ops Live

All signing and transaction logic is in:
```
packages/core/src/wallet/walletOps.ts
```

This module:
- Takes `Connection` + params (including `Uint8Array` secret key)
- Builds and signs transactions
- Sends via `sendAndConfirmTransaction` or `sendRawTransaction`
- Returns `{ signature, explorerUrl }`
- **NEVER** stores keys or calls external services other than Solana RPC and Jupiter API

---

## How to Run Tests

```bash
# All tests
pnpm test

# Unit tests only (no network required)
pnpm test:unit

# Integration tests (requires devnet)
pnpm test:integration

# Watch mode
cd apps/api && pnpm test:watch
```

Test files:
- `apps/api/tests/unit/encryption.test.ts` — AES-256-GCM roundtrip
- `apps/api/tests/unit/validators.test.ts` — Zod schema validation
- `apps/api/tests/unit/agentLogic.test.ts` — Decision engine
- `apps/api/tests/integration/devnet.test.ts` — Live devnet tx (skips if down)

---

## Key Conventions

1. **Never import from `apps/api` in `packages/core`** — core is framework-agnostic
2. **Never log private keys** — use the `logger` from `src/logger.ts` which has redaction configured
3. **Always validate inputs with Zod** before processing in route handlers
4. **Always handle the `SKIPPED_NO_ROUTE` case** for Jupiter swaps — devnet routes are unreliable
5. **Decrypt keys in the smallest scope possible** — decrypt immediately before use, let GC handle cleanup
6. **All DB operations go through `services/db.ts`** — never write SQL elsewhere
