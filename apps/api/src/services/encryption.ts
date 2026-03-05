import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // bytes for GCM
const AUTH_TAG_LENGTH = 16; // bytes

export interface EncryptedPayload {
  iv: string;      // hex
  tag: string;     // hex
  data: string;    // hex
}

function getMasterKey(): Buffer {
  return Buffer.from(config.AGENT_MASTER_KEY, 'base64');
}

/**
 * Encrypt arbitrary bytes (e.g., a Uint8Array secret key) with AES-256-GCM.
 * Returns a JSON-serialisable object — never store the plaintext.
 */
export function encrypt(plaintext: Uint8Array | Buffer): EncryptedPayload {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

/**
 * Decrypt a payload produced by {@link encrypt}.
 * Throws if authentication fails (tampered data).
 */
export function decrypt(payload: EncryptedPayload): Buffer {
  const key = getMasterKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const data = Buffer.from(payload.data, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Serialize encrypted payload to a single base64 JSON string for DB storage.
 */
export function serializeEncrypted(payload: EncryptedPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Deserialize from DB storage back to structured payload.
 */
export function deserializeEncrypted(raw: string): EncryptedPayload {
  return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as EncryptedPayload;
}

/**
 * Convenience: encrypt a Uint8Array secret key and return DB-ready string.
 */
export function encryptSecretKey(secretKey: Uint8Array): string {
  return serializeEncrypted(encrypt(Buffer.from(secretKey)));
}

/**
 * Convenience: decrypt DB string back to raw Uint8Array secret key.
 */
export function decryptSecretKey(stored: string): Uint8Array {
  const payload = deserializeEncrypted(stored);
  return new Uint8Array(decrypt(payload));
}
