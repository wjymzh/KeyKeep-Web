/**
 * AES-256-GCM encryption/decryption matching Android KeyKeep format.
 * Uses Web Crypto API with PBKDF2 key derivation.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function decryptData(encryptedJson: string, passphrase: string): Promise<Credential[]> {
  const wrapper = JSON.parse(encryptedJson);

  if (wrapper.version !== 1) {
    throw new Error(`不支持的格式版本: ${wrapper.version}`);
  }

  const salt = base64ToBuffer(wrapper.salt);
  const iv = base64ToBuffer(wrapper.iv);
  const encryptedData = base64ToBuffer(wrapper.data);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encryptedData.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  const json = decoder.decode(decrypted);
  return JSON.parse(json) as Credential[];
}

export async function encryptData(credentials: Credential[], passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(credentials));

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  );

  const wrapper = {
    version: 1,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    data: bufferToBase64(encrypted),
  };

  return JSON.stringify(wrapper, null, 2);
}

export interface Credential {
  id: string;
  platform: string;
  username: string;
  password: string;
  platformIcon: string;
  websiteUrl: string;
  loginMethod: string;
  verifyMethod: string;
  otpSecret: string;
  linkedAccountId: string;
  note: string;
  tags: string;
  accessCount: number;
  updatedAt: number;
}
