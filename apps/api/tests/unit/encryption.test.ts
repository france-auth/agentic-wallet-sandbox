import { describe, it, expect, beforeAll } from 'vitest';

// Set up env before importing anything that reads config
process.env.AGENT_MASTER_KEY = 'dGVzdC1tYXN0ZXIta2V5LXRoaXMtaXMtMzItYnl0ZXM=';
process.env.API_KEY = 'test-api-key-12345678';
process.env.RECEIVER_PUBLIC_KEY = '11111111111111111111111111111111';

import {
  encrypt,
  decrypt,
  serializeEncrypted,
  deserializeEncrypted,
  encryptSecretKey,
  decryptSecretKey,
} from '../../src/services/encryption.js';
import { Keypair } from '@solana/web3.js';

describe('Encryption Service', () => {
  it('encrypts and decrypts arbitrary bytes', () => {
    const plaintext = Buffer.from('hello world secret');
    const payload = encrypt(plaintext);

    expect(payload.iv).toBeDefined();
    expect(payload.tag).toBeDefined();
    expect(payload.data).toBeDefined();
    expect(payload.data).not.toBe(plaintext.toString('hex'));

    const decrypted = decrypt(payload);
    expect(decrypted.toString('utf-8')).toBe('hello world secret');
  });

  it('serializes and deserializes encrypted payload', () => {
    const plaintext = Buffer.from('round-trip test');
    const payload = encrypt(plaintext);
    const serialized = serializeEncrypted(payload);

    expect(typeof serialized).toBe('string');

    const deserialized = deserializeEncrypted(serialized);
    const decrypted = decrypt(deserialized);
    expect(decrypted.toString('utf-8')).toBe('round-trip test');
  });

  it('encrypts and decrypts a Solana keypair secret key', () => {
    const keypair = Keypair.generate();
    const originalSecretKey = keypair.secretKey;

    const stored = encryptSecretKey(originalSecretKey);
    expect(typeof stored).toBe('string');
    // Should not contain raw key bytes
    expect(stored).not.toContain(Buffer.from(originalSecretKey).toString('hex'));

    const recovered = decryptSecretKey(stored);
    expect(recovered.length).toBe(64);
    expect(Buffer.from(recovered).equals(Buffer.from(originalSecretKey))).toBe(true);
  });

  it('throws on tampered ciphertext (auth tag failure)', () => {
    const plaintext = Buffer.from('tamper test');
    const payload = encrypt(plaintext);
    // Flip a byte in the encrypted data
    const dataBytes = Buffer.from(payload.data, 'hex');
    dataBytes[0] ^= 0xff;
    const tampered = { ...payload, data: dataBytes.toString('hex') };

    expect(() => decrypt(tampered)).toThrow();
  });

  it('different encryptions of same plaintext produce different ciphertexts (random IV)', () => {
    const plaintext = Buffer.from('same message');
    const payload1 = encrypt(plaintext);
    const payload2 = encrypt(plaintext);
    expect(payload1.iv).not.toBe(payload2.iv);
    expect(payload1.data).not.toBe(payload2.data);
  });
});
