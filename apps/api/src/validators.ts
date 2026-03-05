import { z } from 'zod';

export const CreateAgentsSchema = z.object({
  count: z.number().int().min(1).max(20),
  fundSol: z.number().min(0).max(2).optional().default(0.5),
  mintTokens: z.boolean().optional().default(true),
});

export const RunOnceParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ListActionsQuerySchema = z.object({
  agentId: z.string().uuid().optional(),
  status: z
    .enum(['PENDING', 'SUCCESS', 'FAILED', 'SKIPPED_NO_ROUTE'])
    .optional(),
  type: z
    .enum(['ACTION_SOL_TRANSFER', 'ACTION_SPL_TRANSFER', 'ACTION_JUPITER_SWAP'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const HarnessStartSchema = z.object({
  intervalMs: z.number().int().min(5000).max(300_000).optional(),
});

export type CreateAgentsInput = z.infer<typeof CreateAgentsSchema>;
export type ListActionsQuery = z.infer<typeof ListActionsQuerySchema>;
export type HarnessStartInput = z.infer<typeof HarnessStartSchema>;
