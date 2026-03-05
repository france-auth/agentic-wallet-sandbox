# Security Model — Agentic Wallet Sandbox

> **Scope**: This document covers the security posture of the devnet prototype. It is intended for reviewers, developers, and anyone integrating or extending this system.
>
> **Important**: This is a prototype. It implements strong security measures relative to its scope, but has known residual risks documented below. It must not be used with real funds or production systems without a full security audit.

---

## Threat Model

### Assets
1. **Agent private keys** — 64-byte Ed25519 secret keys for each wallet
2. **Master encryption key** — 32-byte AES-256-GCM key used to encrypt agent keys at rest
3. **API access** — capability to trigger transactions on-chain
4. **Devnet SOL/SPL balances** — no real monetary value in this prototype

### Adversary Assumptions
- External network attacker (no physical access)
- Malicious API consumer without the `API_KEY`
- Compromised database file (theft of `agents.db`)
- Compromised environment variables (partial)
- NOT in scope: Nation-state attacker, supply chain attack, hardware compromise

---

## Security Controls Implemented

### 1. Private Key Encryption at Rest
- All agent secret keys are encrypted using **AES-256-GCM** before being stored in SQLite
- A random 12-byte IV is generated per encryption operation (never reused)
- A 16-byte authentication tag prevents tampering with ciphertext
- The master key (`AGENT_MASTER_KEY`) is loaded from environment variables only — never hardcoded

**Implementation**: `apps/api/src/services/encryption.ts`

### 2. API Key Authentication
- All write endpoints (`POST`) require the `x-api-key` header matching `API_KEY` env var
- Missing or invalid keys return `401 Unauthorized`
- The API key is checked via constant-time comparison to prevent timing attacks

**Implementation**: `apps/api/src/middleware/auth.ts`

### 3. Rate Limiting
- Write endpoints: 30 requests/minute per API key
- Read endpoints: 120 requests/minute per IP
- Implemented via `express-rate-limit` with standard headers

**Implementation**: `apps/api/src/middleware/rateLimiter.ts`

### 4. Input Validation
- All request bodies and query params are validated with **Zod schemas**
- Invalid input returns `400` with structured error details
- `count` is capped at 20 agents; `fundSol` is capped at 2 SOL; pagination limits enforced

**Implementation**: `apps/api/src/validators.ts`

### 5. HTTP Security Headers
- `helmet` sets: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Content-Security-Policy`, `Strict-Transport-Security`, etc.

### 6. CORS
- CORS is locked to `CORS_ORIGIN` env var (default: `http://localhost:3000`)
- Only `GET`, `POST`, `OPTIONS` methods allowed
- Custom headers limited to `Content-Type` and `x-api-key`

### 7. Body Size Limits
- Request bodies are limited to 50KB to prevent request body attacks

### 8. Safe Logging
- `pino` with redaction paths for: `secretKey`, `privateKey`, `encryptedPrivateKey`, `masterKey`, and API key headers
- Private key bytes are never logged, even in debug mode

### 9. No Plaintext Key Storage
- Plaintext `Uint8Array` secret keys exist in memory only for the duration of a transaction
- They are immediately discarded after use; only the encrypted form is persisted

---

## Key Management

### Master Key
```
AGENT_MASTER_KEY = base64(randomBytes(32))
```
- Must be exactly 32 bytes decoded
- Should be stored in a secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.) in production
- Rotating the master key requires re-encrypting all agent keys

### Agent Keys
- Generated via `Keypair.generate()` (using `@solana/web3.js` which uses `tweetnacl` for cryptography)
- Immediately encrypted with AES-256-GCM using the master key
- Only decrypted in memory, never written to disk in plaintext

---

## Residual Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Master key in environment variable | Medium | If process memory is dumped or env vars are logged, master key is exposed. In production, use a secrets manager with memory protection. |
| In-process harness shares memory with API | Low | A memory leak in one could affect the other. Mitigated by running as separate processes in production. |
| No refresh token / session expiry for API key | Low | API keys are static. If compromised, you must rotate immediately by changing `API_KEY` env var. |
| Devnet RPC is untrusted third-party | Low | The public devnet RPC is unauthenticated; in production, use a dedicated authenticated endpoint. |
| No transaction replay protection beyond Solana's nonce | Low | Solana's blockhash mechanism prevents replay within ~2 minutes. Long-lived transactions are possible. |
| SQLite file not encrypted at filesystem level | Medium | Encrypted column data protects private keys, but other metadata (agent IDs, public keys, action history) is readable from the DB file. Use filesystem encryption in production. |
| No HSM integration | High (for prod) | Private keys are handled in application memory. Production systems should use an HSM or KMS for signing. |
| Jupiter API is a centralized third party | Info | Jupiter swap routing is off-chain and can fail, be rate-limited, or go offline. The harness handles this gracefully with `SKIPPED_NO_ROUTE`. |

---

## Recommendations for Production

1. **HSM/KMS for signing**: Never decrypt private keys in application memory at scale. Use AWS KMS, GCP Cloud HSM, or a dedicated signing service.
2. **Secrets management**: Replace env var master key with Vault/AWS Secrets Manager.
3. **Database encryption**: Encrypt the SQLite file at rest, or migrate to PostgreSQL with column-level encryption.
4. **Separate signing service**: Isolate the wallet signing logic into a separate, minimal-footprint service with network policy restrictions.
5. **Audit logging**: Use an append-only, tamper-evident log (e.g., CloudTrail) for all signing operations.
6. **Multi-sig / timelock**: For production funds, require multi-signature approval for large transactions.
7. **Key rotation**: Implement a key rotation schedule and process.
