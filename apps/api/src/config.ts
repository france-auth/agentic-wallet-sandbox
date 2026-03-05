import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  API_KEY: z.string().min(8, 'API_KEY must be at least 8 characters'),
  AGENT_MASTER_KEY: z
    .string()
    .min(1, 'AGENT_MASTER_KEY is required')
    .refine((v) => {
      try {
        return Buffer.from(v, 'base64').length === 32;
      } catch {
        return false;
      }
    }, 'AGENT_MASTER_KEY must be a base64-encoded 32-byte key'),
  RECEIVER_PUBLIC_KEY: z.string().min(32, 'RECEIVER_PUBLIC_KEY is required'),
  SPL_MINT_DECIMALS: z.coerce.number().default(6),
  JUPITER_SLIPPAGE_BPS: z.coerce.number().default(50),
  JUPITER_SWAP_AMOUNT_LAMPORTS: z.coerce.number().default(10000),
  JUPITER_INPUT_MINT: z
    .string()
    .default('So11111111111111111111111111111111111111112'),
  JUPITER_OUTPUT_MINT: z
    .string()
    .default('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  HARNESS_INTERVAL_MS: z.coerce.number().default(30000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

function loadConfig() {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const config = loadConfig();
export type Config = typeof config;
