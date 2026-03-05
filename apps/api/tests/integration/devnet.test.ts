import { describe, it, expect, beforeAll } from 'vitest';
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const SKIP_MESSAGE = '⚠️  Devnet unavailable — integration test skipped';

async function isDevnetAvailable(connection: Connection): Promise<boolean> {
  try {
    await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function airdropWithRetry(
  connection: Connection,
  pubkey: string,
  sol: number,
  maxRetries = 3
): Promise<string> {
  const { PublicKey } = await import('@solana/web3.js');
  let lastErr: unknown;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const sig = await connection.requestAirdrop(new PublicKey(pubkey), sol * LAMPORTS_PER_SOL);
      const lbh = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...lbh }, 'confirmed');
      return sig;
    } catch (err) {
      lastErr = err;
      const delay = 2000 * i;
      console.log(`  Airdrop attempt ${i} failed, waiting ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Airdrop failed: ${(lastErr as Error).message}`);
}

describe('Devnet Integration', () => {
  let connection: Connection;
  let devnetAvailable: boolean;

  beforeAll(async () => {
    connection = new Connection(RPC_URL, { commitment: 'confirmed', confirmTransactionInitialTimeout: 60_000 });
    devnetAvailable = await isDevnetAvailable(connection);
    if (!devnetAvailable) {
      console.warn(SKIP_MESSAGE);
    }
  }, 20_000);

  it('connects to devnet and gets slot', async () => {
    if (!devnetAvailable) {
      console.warn(SKIP_MESSAGE);
      return;
    }
    const slot = await connection.getSlot();
    expect(typeof slot).toBe('number');
    expect(slot).toBeGreaterThan(0);
  });

  it('airdrops SOL to a fresh keypair', async () => {
    if (!devnetAvailable) {
      console.warn(SKIP_MESSAGE);
      return;
    }
    const keypair = Keypair.generate();
    const sig = await airdropWithRetry(connection, keypair.publicKey.toBase58(), 0.5);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(20);

    const balance = await connection.getBalance(keypair.publicKey);
    expect(balance).toBeGreaterThan(0);
    console.log(`  ✅ Airdrop successful. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  }, 60_000);

  it('sends a tiny SOL transfer and confirms', async () => {
    if (!devnetAvailable) {
      console.warn(SKIP_MESSAGE);
      return;
    }

    const sender = Keypair.generate();
    const receiver = Keypair.generate();

    // Fund sender
    await airdropWithRetry(connection, sender.publicKey.toBase58(), 0.1);

    // Small transfer
    const transferLamports = 1000;
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: receiver.publicKey,
        lamports: transferLamports,
      })
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [sender], {
      commitment: 'confirmed',
      maxRetries: 3,
    });

    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(20);

    const receiverBalance = await connection.getBalance(receiver.publicKey);
    expect(receiverBalance).toBe(transferLamports);

    console.log(`  ✅ Transfer confirmed: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  }, 90_000);
});
