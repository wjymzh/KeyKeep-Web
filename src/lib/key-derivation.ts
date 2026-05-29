/**
 * Zero-knowledge key derivation for KeyKeep cloud sync.
 *
 * Key hierarchy:
 *   Master Password + Salt → PBKDF2 (600K) → stretched_key
 *   stretched_key → HKDF("auth")    → auth_key   → SHA256 → verifier (sent to server)
 *   stretched_key + Secret Key → HKDF("enc") → enc_key (never leaves client)
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

const SECRET_KEY_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return bufferToBase64(salt);
}

export function generateSecretKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(26));
  const chars = Array.from(bytes, (b) => SECRET_KEY_CHARS[b % SECRET_KEY_CHARS.length]);
  return `A3-${chars.slice(0, 6).join('')}-${chars.slice(6, 12).join('')}-${chars.slice(12, 17).join('')}-${chars.slice(17, 22).join('')}-${chars.slice(22, 26).join('')}`;
}

function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer as ArrayBuffer;
}

async function stretchKey(masterPassword: string, salt: string, email: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const saltBytes = base64ToBuffer(salt);
  const emailBytes = enc.encode(email.toLowerCase());
  const combinedSalt = concatBuffers(saltBytes.buffer as ArrayBuffer, emailBytes.buffer as ArrayBuffer);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: combinedSalt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
}

async function hkdfDerive(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: string,
  length: number = 256
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(info) },
    key,
    length
  );
}

export async function deriveAuthVerifier(
  masterPassword: string,
  salt: string,
  email: string
): Promise<string> {
  const stretched = await stretchKey(masterPassword, salt, email);
  const saltBytes = base64ToBuffer(salt);
  const authKey = await hkdfDerive(stretched, saltBytes.buffer as ArrayBuffer, 'keykeep-auth-key');
  const hash = await crypto.subtle.digest('SHA-256', authKey);
  return bufferToBase64(hash);
}

export async function deriveEncryptionKey(
  masterPassword: string,
  secretKey: string,
  salt: string,
  email: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const stretched = await stretchKey(masterPassword, salt, email);
  const secretBytes = enc.encode(secretKey);
  const combined = concatBuffers(stretched, secretBytes.buffer as ArrayBuffer);
  const saltBytes = base64ToBuffer(salt);
  const rawKey = await hkdfDerive(combined, saltBytes.buffer as ArrayBuffer, 'keykeep-encryption-key');

  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptVault(
  data: string,
  encKey: CryptoKey
): Promise<{ encrypted_data: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encKey,
    new TextEncoder().encode(data)
  );
  return {
    encrypted_data: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

export async function decryptVault(
  encryptedData: string,
  iv: string,
  encKey: CryptoKey
): Promise<string> {
  const ivBuf = base64ToBuffer(iv);
  const dataBuf = base64ToBuffer(encryptedData);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuf.buffer as ArrayBuffer },
    encKey,
    dataBuf.buffer as ArrayBuffer
  );
  return new TextDecoder().decode(decrypted);
}
