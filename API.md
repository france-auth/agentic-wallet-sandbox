# API Reference

Base URL: `http://localhost:3001`

All write endpoints require: `x-api-key: <API_KEY>` header.

---

## Health

### `GET /health`
Returns service health status.

```bash
curl http://localhost:3001/health
```

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "solanaRpc": "ok"
  },
  "harness": {
    "running": false,
    "intervalMs": 30000,
    "startedAt": null,
    "cyclesRun": 0
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## Agents

### `POST /agents/create`
Create N agents. Airdrops SOL, creates SPL mint if needed, mints tokens.

```bash
curl -X POST http://localhost:3001/agents/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"count": 3, "fundSol": 0.5, "mintTokens": true}'
```

**Body**:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | `number` (1-20) | required | Number of agents to create |
| `fundSol` | `number` (0-2) | 0.5 | SOL to airdrop to each agent |
| `mintTokens` | `boolean` | true | Mint SPL tokens to each agent |

**Response** `201`:
```json
{
  "created": [
    { "id": "uuid", "name": "Agent-abc123", "publicKey": "Base58..." }
  ],
  "count": 3,
  "splMint": "Base58MintAddress..."
}
```

---

### `GET /agents`
List all agents with live balance snapshots.

```bash
curl http://localhost:3001/agents
```

**Response** `200`:
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "Agent-abc123",
      "publicKey": "Base58...",
      "solBalance": 0.4992,
      "splBalance": 1.0,
      "splMint": "Base58MintAddress",
      "lastActionStatus": "SUCCESS",
      "lastActionAt": "2024-01-15T12:00:00.000Z",
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### `GET /agents/:id`
Get a single agent with balances.

```bash
curl http://localhost:3001/agents/<uuid>
```

---

### `POST /agents/:id/run-once`
Execute one action cycle for a specific agent.

```bash
curl -X POST http://localhost:3001/agents/<uuid>/run-once \
  -H "x-api-key: $API_KEY"
```

**Response** `200`:
```json
{
  "action": {
    "id": "uuid",
    "agentId": "uuid",
    "type": "ACTION_SOL_TRANSFER",
    "status": "SUCCESS",
    "amount": 1000,
    "signature": "Base58TxSignature...",
    "explorerUrl": "https://explorer.solana.com/tx/...",
    "startedAt": "2024-01-15T12:00:00.000Z",
    "finishedAt": "2024-01-15T12:00:02.000Z",
    "error": null
  }
}
```

---

## Harness

### `GET /harness/status`
Get harness state.

```bash
curl http://localhost:3001/harness/status
```

---

### `POST /harness/start`
Start the automatic loop.

```bash
curl -X POST http://localhost:3001/harness/start \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"intervalMs": 30000}'
```

**Body**:
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `intervalMs` | `number` | 5000-300000 | Loop interval in ms |

---

### `POST /harness/stop`
Stop the loop.

```bash
curl -X POST http://localhost:3001/harness/stop \
  -H "x-api-key: $API_KEY"
```

---

### `POST /harness/run-once`
Run one cycle for all agents synchronously. Returns all action results.

```bash
curl -X POST http://localhost:3001/harness/run-once \
  -H "x-api-key: $API_KEY"
```

**Response** `200`:
```json
{
  "actions": [ /* array of ActionRecord */ ],
  "count": 3
}
```

---

## Actions

### `GET /actions`
List actions with optional filters and pagination.

```bash
# All actions
curl "http://localhost:3001/actions"

# Filter by agent
curl "http://localhost:3001/actions?agentId=<uuid>"

# Filter by status
curl "http://localhost:3001/actions?status=SUCCESS"

# Filter by type
curl "http://localhost:3001/actions?type=ACTION_JUPITER_SWAP"

# Pagination
curl "http://localhost:3001/actions?limit=10&offset=20"
```

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `agentId` | `uuid` | Filter by agent |
| `status` | `SUCCESS\|FAILED\|PENDING\|SKIPPED_NO_ROUTE` | Filter by status |
| `type` | `ACTION_SOL_TRANSFER\|ACTION_SPL_TRANSFER\|ACTION_JUPITER_SWAP` | Filter by type |
| `limit` | `1-100` | Page size (default: 20) |
| `offset` | `≥0` | Pagination offset (default: 0) |

**Response** `200`:
```json
{
  "actions": [ /* array of ActionRecord */ ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Validation failed — check `issues` field |
| `401` | Missing or invalid `x-api-key` |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service degraded (check `/health`) |
