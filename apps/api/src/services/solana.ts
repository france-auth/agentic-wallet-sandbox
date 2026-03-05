import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { config } from '../config.js';
import { logger } from '../logger.js';

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (_connection) return _connection;
  _connection = new Connection(config.SOLANA_RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60_000,
  });
  logger.info({ rpcUrl: config.SOLANA_RPC_URL }, 'Solana connection initialized');
  return _connection;
}

// ─── Airdrop with retries ────────────────────────────────────────────────────

export async function airdropSolWithRetry(
  publicKey: string,
  solAmount: number = 1,
  maxRetries: number = 5
): Promise<string> {
  const connection = getConnection();
  const pubkey = new PublicKey(publicKey);
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug({ publicKey, attempt, solAmount }, 'Requesting airdrop');
      const sig = await connection.requestAirdrop(pubkey, lamports);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed');
      logger.info({ publicKey, sig, solAmount }, 'Airdrop successful');
      return sig;
    } catch (err) {
      lastError = err;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      logger.warn(
        { publicKey, attempt, delay, err: (err as Error).message },
        'Airdrop attempt failed, retrying...'
      );
      await sleep(delay);
    }
  }
  throw new Error(`Airdrop failed after ${maxRetries} attempts: ${(lastError as Error).message}`);
}

// ─── SPL mint creation ───────────────────────────────────────────────────────

export interface CreateMintResult {
  mint: string;
  signature: string;
}

/**
 * Create a new SPL token mint on devnet (payer = authority).
 */
export async function createSplMint(
  authorityKeypair: Keypair,
  decimals: number = config.SPL_MINT_DECIMALS
): Promise<CreateMintResult> {
  const connection = getConnection();
  const mintPubkey = await createMint(
    connection,
    authorityKeypair,
    authorityKeypair.publicKey,
    null, // freeze authority = none
    decimals
  );
  logger.info({ mint: mintPubkey.toBase58(), decimals }, 'SPL mint created');
  return { mint: mintPubkey.toBase58(), signature: '' };
}

/**
 * Mint SPL tokens to a recipient's associated token account.
 */
export async function mintTokensToAgent(
  payerKeypair: Keypair,
  mintPubkeyStr: string,
  recipientPubkeyStr: string,
  amount: bigint
): Promise<string> {
  const connection = getConnection();
  const mintPubkey = new PublicKey(mintPubkeyStr);
  const recipientPubkey = new PublicKey(recipientPubkeyStr);

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    mintPubkey,
    recipientPubkey
  );

  const sig = await mintTo(connection, payerKeypair, mintPubkey, ata.address, payerKeypair, amount);
  logger.info({ recipient: recipientPubkeyStr, amount: amount.toString() }, 'Minted tokens');
  return sig;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep };
