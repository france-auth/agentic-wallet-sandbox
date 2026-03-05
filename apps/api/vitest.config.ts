import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: {
      PORT: '3099',
      SOLANA_RPC_URL: 'https://api.devnet.solana.com',
      API_KEY: 'test-api-key-12345678',
      // 32 random bytes base64 for tests
      AGENT_MASTER_KEY: 'dGVzdC1tYXN0ZXIta2V5LXRoaXMtaXMtMzItYnl0ZXM=',
      RECEIVER_PUBLIC_KEY: '11111111111111111111111111111111',
      JUPITER_OUTPUT_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      LOG_LEVEL: 'error',
    },
  },
});
