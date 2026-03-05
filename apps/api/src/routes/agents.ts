import { Router, type Request, type Response } from 'express';
import { Keypair } from '@solana/web3.js';
import { v4 as uuidv4 } from 'uuid';
import type { AgentRecord, AgentWithBalances } from '@aws/core';
import { getSolBalance, getSplBalance } from '@aws/core';
import { CreateAgentsSchema } from '../validators.js';
import { apiKeyAuth } from '../middleware/auth.js';
import { writeLimiter, readLimiter } from '../middleware/rateLimiter.js';
import {
  insertAgent,
  getAllAgents,
  getAgentById,
  getActiveSplMint,
  getLastActionForAgent,
  upsertSplMint,
} from '../services/db.js';
import {
  airdropSolWithRetry,
  createSplMint,
  mintTokensToAgent,
  getConnection,
} from '../services/solana.js';
import { encryptSecretKey } from '../services/encryption.js';
import { runAgentOnce } from '../harness/runner.js';
import { logger } from '../logger.js';

export const agentsRouter = Router();

// GET /agents — list all agents with balance snapshots
agentsRouter.get('/', readLimiter, async (_req: Request, res: Response) => {
  try {
    const agents = getAllAgents();
    const connection = getConnection();
    const splMint = getActiveSplMint();

    const withBalances: AgentWithBalances[] = await Promise.all(
      agents.map(async (a) => {
        const [solBalance, splBalance] = await Promise.all([
          getSolBalance(connection, a.publicKey).catch(() => 0),
          splMint ? getSplBalance(connection, a.publicKey, splMint.mint).catch(() => 0) : Promise.resolve(0),
        ]);
        const lastAction = getLastActionForAgent(a.id);
        return {
          ...a,
          solBalance,
          splBalance,
          splMint: splMint?.mint ?? null,
          lastActionStatus: lastAction?.status ?? null,
          lastActionAt: lastAction?.startedAt ?? null,
        };
      })
    );

    res.json({ agents: withBalances, count: withBalances.length });
  } catch (err) {
    logger.error({ err }, 'GET /agents error');
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// GET /agents/:id — single agent detail
agentsRouter.get('/:id', readLimiter, async (req: Request, res: Response) => {
  try {
    const agent = getAgentById(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    const connection = getConnection();
    const splMint = getActiveSplMint();
    const [solBalance, splBalance] = await Promise.all([
      getSolBalance(connection, agent.publicKey).catch(() => 0),
      splMint ? getSplBalance(connection, agent.publicKey, splMint.mint).catch(() => 0) : Promise.resolve(0),
    ]);
    const lastAction = getLastActionForAgent(agent.id);
    const withBalances: AgentWithBalances = {
      ...agent,
      solBalance,
      splBalance,
      splMint: splMint?.mint ?? null,
      lastActionStatus: lastAction?.status ?? null,
      lastActionAt: lastAction?.startedAt ?? null,
    };
    res.json({ agent: withBalances });
  } catch (err) {
    logger.error({ err }, 'GET /agents/:id error');
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// POST /agents/create — create N agents
agentsRouter.post('/create', apiKeyAuth, writeLimiter, async (req: Request, res: Response) => {
  const parsed = CreateAgentsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  const { count, fundSol, mintTokens } = parsed.data;

  try {
    // Ensure we have a SPL mint
    let splMint = getActiveSplMint();

    // Create one mint authority keypair for SPL operations
    // In a real system this would be loaded from a persisted keypair
    const mintAuthority = Keypair.generate();

    const created: AgentRecord[] = [];

    for (let i = 0; i < count; i++) {
      const keypair = Keypair.generate();
      const agentId = uuidv4();
      const name = `Agent-${agentId.slice(0, 8)}`;

      const agent: AgentRecord = {
        id: agentId,
        name,
        publicKey: keypair.publicKey.toBase58(),
        encryptedPrivateKey: encryptSecretKey(keypair.secretKey),
        createdAt: new Date().toISOString(),
      };

      insertAgent(agent);
      created.push(agent);
      logger.info({ agentId, publicKey: agent.publicKey }, 'Agent created');

      // Fund with SOL via airdrop
      if (fundSol > 0) {
        try {
          await airdropSolWithRetry(agent.publicKey, fundSol);
        } catch (err) {
          logger.warn({ agentId, err: (err as Error).message }, 'Airdrop failed; agent will have no SOL');
        }
      }
    }

    // Create SPL mint if not exists and mint to all new agents
    if (mintTokens && created.length > 0) {
      // Fund mint authority first
      try {
        await airdropSolWithRetry(mintAuthority.publicKey.toBase58(), 1);
      } catch {
        logger.warn('Could not fund mint authority; SPL minting may fail');
      }

      if (!splMint) {
        try {
          const { mint } = await createSplMint(mintAuthority, 6);
          upsertSplMint(mint, 6);
          splMint = { mint, decimals: 6 };
          logger.info({ mint }, 'SPL mint created and stored');
        } catch (err) {
          logger.error({ err }, 'SPL mint creation failed');
        }
      }

      if (splMint) {
        for (const agent of created) {
          try {
            // Fund mint authority again if needed
            await mintTokensToAgent(
              mintAuthority,
              splMint.mint,
              agent.publicKey,
              BigInt(1_000_000) // 1 token with 6 decimals
            );
          } catch (err) {
            logger.warn({ agentId: agent.id, err: (err as Error).message }, 'Token minting failed');
          }
        }
      }
    }

    res.status(201).json({
      created: created.map((a) => ({ id: a.id, name: a.name, publicKey: a.publicKey })),
      count: created.length,
      splMint: splMint?.mint ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'POST /agents/create error');
    res.status(500).json({ error: 'Failed to create agents' });
  }
});

// POST /agents/:id/run-once — run 1 action cycle for a single agent
agentsRouter.post('/:id/run-once', apiKeyAuth, writeLimiter, async (req: Request, res: Response) => {
  const agent = getAgentById(req.params.id);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  try {
    const action = await runAgentOnce(req.params.id);
    res.json({ action });
  } catch (err) {
    logger.error({ agentId: req.params.id, err }, 'run-once error');
    res.status(500).json({ error: (err as Error).message });
  }
});
