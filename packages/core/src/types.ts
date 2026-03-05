// ─── Agent & Action shared types ────────────────────────────────────────────

export type ActionType =
  | 'ACTION_SOL_TRANSFER'
  | 'ACTION_SPL_TRANSFER'
  | 'ACTION_JUPITER_SWAP';

export type ActionStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED_NO_ROUTE';

export interface AgentRecord {
  id: string;
  name: string;
  publicKey: string;
  encryptedPrivateKey: string; // AES-256-GCM base64 JSON blob
  createdAt: string;
}

export interface AgentWithBalances extends AgentRecord {
  solBalance: number; // in SOL
  splBalance: number; // in token units
  splMint: string | null;
  lastActionStatus: ActionStatus | null;
  lastActionAt: string | null;
}

export interface ActionRecord {
  id: string;
  agentId: string;
  type: ActionType;
  status: ActionStatus;
  amount: number | null;
  mint: string | null;
  signature: string | null;
  explorerUrl: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

// ─── Wallet operation interfaces ────────────────────────────────────────────

export interface TransferSolParams {
  fromSecretKey: Uint8Array;
  toPublicKey: string;
  lamports: number;
}

export interface TransferSplParams {
  fromSecretKey: Uint8Array;
  toPublicKey: string;
  mint: string;
  amount: bigint;
  decimals: number;
}

export interface JupiterSwapParams {
  agentSecretKey: Uint8Array;
  inputMint: string;
  outputMint: string;
  amountLamports: number;
  slippageBps: number;
}

export interface WalletOpResult {
  signature: string;
  explorerUrl: string;
}

// ─── Harness state ───────────────────────────────────────────────────────────

export interface HarnessStatus {
  running: boolean;
  intervalMs: number;
  startedAt: string | null;
  cyclesRun: number;
}
