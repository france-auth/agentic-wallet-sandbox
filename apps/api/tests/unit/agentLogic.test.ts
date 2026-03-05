import { describe, it, expect } from 'vitest';
import { decideNextAction, describeAction } from '@aws/core';

describe('Agent Decision Logic', () => {
  it('returns SOL_TRANSFER on cycle 0', () => {
    const action = decideNextAction({
      solBalance: 1,
      splBalance: 100,
      lastActionType: null,
      cycleIndex: 0,
    });
    expect(action).toBe('ACTION_SOL_TRANSFER');
  });

  it('returns SPL_TRANSFER on cycle 1', () => {
    const action = decideNextAction({
      solBalance: 1,
      splBalance: 100,
      lastActionType: null,
      cycleIndex: 1,
    });
    expect(action).toBe('ACTION_SPL_TRANSFER');
  });

  it('returns JUPITER_SWAP on cycle 2', () => {
    const action = decideNextAction({
      solBalance: 1,
      splBalance: 100,
      lastActionType: null,
      cycleIndex: 2,
    });
    expect(action).toBe('ACTION_JUPITER_SWAP');
  });

  it('cycles back to SOL_TRANSFER on cycle 3', () => {
    const action = decideNextAction({
      solBalance: 1,
      splBalance: 100,
      lastActionType: null,
      cycleIndex: 3,
    });
    expect(action).toBe('ACTION_SOL_TRANSFER');
  });

  it('falls back to SOL_TRANSFER when SPL balance is 0 on SPL cycle', () => {
    const action = decideNextAction({
      solBalance: 1,
      splBalance: 0,
      lastActionType: null,
      cycleIndex: 1, // would normally be SPL
    });
    expect(action).toBe('ACTION_SOL_TRANSFER');
  });

  it('still attempts actions even with low SOL (graceful failure)', () => {
    const action = decideNextAction({
      solBalance: 0.0001,
      splBalance: 0,
      lastActionType: null,
      cycleIndex: 0,
    });
    // Should return something, not throw
    expect(action).toBeDefined();
  });

  it('describes each action type', () => {
    expect(describeAction('ACTION_SOL_TRANSFER')).toContain('SOL');
    expect(describeAction('ACTION_SPL_TRANSFER')).toContain('SPL');
    expect(describeAction('ACTION_JUPITER_SWAP')).toContain('Jupiter');
  });
});
