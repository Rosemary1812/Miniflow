import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
  const keyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY is not set. ' +
        'Please add it to your .env.local file.'
    );
  }
  if (keyHex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters ` +
        `(${KEY_LENGTH} bytes / 256 bits). Got ${keyHex.length} characters.`
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the ciphertext (with auth tag appended) and the IV used.
 */
export function encrypt(plaintext: string): { encryptedValue: string; iv: string } {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Append auth tag to ciphertext for storage
  return {
    encryptedValue: encrypted + authTag.toString('hex'),
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypts a ciphertext (with auth tag appended) using AES-256-GCM.
 */
export function decrypt(encryptedValue: string, iv: string): string {
  const key = getKey();

  const ivBuffer = Buffer.from(iv, 'hex');
  if (ivBuffer.length !== IV_LENGTH) {
    throw new Error(`IV must be ${IV_LENGTH} bytes. Got ${ivBuffer.length}.`);
  }

  // Extract auth tag (last 32 hex chars = 16 bytes)
  const authTagHex = encryptedValue.slice(-AUTH_TAG_LENGTH * 2);
  const authTag = Buffer.from(authTagHex, 'hex');

  // Extract ciphertext (everything except auth tag)
  const ciphertext = encryptedValue.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
