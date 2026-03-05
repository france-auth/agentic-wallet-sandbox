import type { ActionType } from '../types.js';

export interface DecisionContext {
  solBalance: number; // SOL
  splBalance: number; // token units
  lastActionType: ActionType | null;
  cycleIndex: number;
}

/**
 * Rule-based agent decision engine.
 * Simulates an "AI agent" choosing the next action.
 *
 * Priority rules:
 * 1. If sol < 0.002, skip everything (not enough to act)
 * 2. Rotate through SOL_TRANSFER -> SPL_TRANSFER -> JUPITER_SWAP
 * 3. Skip SPL if no SPL balance
 */
export function decideNextAction(ctx: DecisionContext): ActionType {
  const actions: ActionType[] = ['ACTION_SOL_TRANSFER', 'ACTION_SPL_TRANSFER', 'ACTION_JUPITER_SWAP'];

  // Not enough SOL to do anything useful — attempt swap anyway (will be skipped by harness)
  if (ctx.solBalance < 0.001) {
    return 'ACTION_SOL_TRANSFER'; // Will fail gracefully
  }

  // Round-robin based on cycle index
  const base = ctx.cycleIndex % actions.length;
  const chosen = actions[base];

  // If chose SPL but no SPL balance, fall back to SOL transfer
  if (chosen === 'ACTION_SPL_TRANSFER' && ctx.splBalance === 0) {
    return 'ACTION_SOL_TRANSFER';
  }

  return chosen;
}

/**
 * Returns a human-readable description of the action for logging.
 */
export function describeAction(type: ActionType): string {
  switch (type) {
    case 'ACTION_SOL_TRANSFER':
      return 'Transfer a small amount of SOL to receiver';
    case 'ACTION_SPL_TRANSFER':
      return 'Transfer a small amount of SPL tokens to receiver';
    case 'ACTION_JUPITER_SWAP':
      return 'Attempt a Jupiter swap (SOL -> output token)';
  }
}
