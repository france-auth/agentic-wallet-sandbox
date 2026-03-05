import { describe, it, expect } from 'vitest';
import {
  CreateAgentsSchema,
  ListActionsQuerySchema,
  HarnessStartSchema,
} from '../../src/validators.js';

describe('Zod Validators', () => {
  describe('CreateAgentsSchema', () => {
    it('accepts valid input', () => {
      const result = CreateAgentsSchema.safeParse({ count: 3 });
      expect(result.success).toBe(true);
    });

    it('rejects count = 0', () => {
      const result = CreateAgentsSchema.safeParse({ count: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects count > 20', () => {
      const result = CreateAgentsSchema.safeParse({ count: 21 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer count', () => {
      const result = CreateAgentsSchema.safeParse({ count: 1.5 });
      expect(result.success).toBe(false);
    });

    it('applies defaults for optional fields', () => {
      const result = CreateAgentsSchema.safeParse({ count: 2 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fundSol).toBe(0.5);
        expect(result.data.mintTokens).toBe(true);
      }
    });

    it('rejects fundSol > 2 (safety cap)', () => {
      const result = CreateAgentsSchema.safeParse({ count: 1, fundSol: 5 });
      expect(result.success).toBe(false);
    });
  });

  describe('ListActionsQuerySchema', () => {
    it('accepts empty query (uses defaults)', () => {
      const result = ListActionsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('accepts valid status enum', () => {
      const result = ListActionsQuerySchema.safeParse({ status: 'SUCCESS' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = ListActionsQuerySchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('accepts valid type enum', () => {
      const result = ListActionsQuerySchema.safeParse({ type: 'ACTION_SOL_TRANSFER' });
      expect(result.success).toBe(true);
    });

    it('coerces string limit to number', () => {
      const result = ListActionsQuerySchema.safeParse({ limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.limit).toBe(10);
    });

    it('rejects limit > 100', () => {
      const result = ListActionsQuerySchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('HarnessStartSchema', () => {
    it('accepts empty body', () => {
      const result = HarnessStartSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts valid intervalMs', () => {
      const result = HarnessStartSchema.safeParse({ intervalMs: 10000 });
      expect(result.success).toBe(true);
    });

    it('rejects intervalMs < 5000 (too fast)', () => {
      const result = HarnessStartSchema.safeParse({ intervalMs: 1000 });
      expect(result.success).toBe(false);
    });

    it('rejects intervalMs > 300000', () => {
      const result = HarnessStartSchema.safeParse({ intervalMs: 999999 });
      expect(result.success).toBe(false);
    });
  });
});
