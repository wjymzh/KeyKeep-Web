/**
 * KeyKeep Sync Client — communicates with the Cloudflare Worker backend.
 *
 * Security model:
 *   - Master password is used only during login/register, then immediately discarded
 *   - The derived CryptoKey (extractable: false) is stored in IndexedDB
 *   - Even XSS cannot export the raw key bytes from a non-extractable CryptoKey
 *   - JWT token and account metadata are stored in localStorage
 */

import type { Credential } from './crypto';
import {
  generateSalt,
  generateSecretKey,
  deriveAuthVerifier,
  deriveEncryptionKey,
  encryptVault,
  decryptVault,
} from './key-derivation';
import {
  storeEncryptionKey,
  loadEncryptionKey,
  clearEncryptionKey,
  hasEncryptionKey,
} from './key-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://keykeep-api.octopus-labs.top';

type SyncState = {
  loggedIn: boolean;
  email: string;
  token: string;
  userId: string;
  salt: string;
  secretKey: string;
  vaultVersion: number;
};

type Listener = () => void;

class SyncClient {
  private state: SyncState = {
    loggedIn: false, email: '', token: '', userId: '',
    salt: '', secretKey: '', vaultVersion: 0,
  };
  private cachedKey: CryptoKey | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  getState(): Readonly<SyncState> { return this.state; }
  isLoggedIn(): boolean { return this.state.loggedIn; }
  getEmail(): string { return this.state.email; }
  getSecretKey(): string { return this.state.secretKey; }

  async isReady(): Promise<boolean> {
    if (!this.state.loggedIn) return false;
    if (this.cachedKey) return true;
    return hasEncryptionKey();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((fn) => fn()); }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('keykeep_sync', JSON.stringify(this.state));
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('keykeep_sync');
      if (stored) {
        const data = JSON.parse(stored);
        this.state = { ...data, loggedIn: !!data.userId && !!data.token };
      }
    } catch { /* ignore */ }
  }

  private async getEncKey(): Promise<CryptoKey> {
    if (this.cachedKey) return this.cachedKey;

    const key = await loadEncryptionKey();
    if (!key) throw new Error('加密密钥不可用，请重新登录');

    this.cachedKey = key;
    return key;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.state.token ? { Authorization: `Bearer ${this.state.token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `请求失败 (${res.status})`);
    return data as T;
  }

  async register(email: string, masterPassword: string): Promise<{ secretKey: string }> {
    const salt = generateSalt();
    const secretKey = generateSecretKey();
    const verifier = await deriveAuthVerifier(masterPassword, salt, email);

    const res = await this.request<{ user: { id: string; email: string }; token: string }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify({ email, salt, verifier }) }
    );

    const encKey = await deriveEncryptionKey(masterPassword, secretKey, salt, email);
    await storeEncryptionKey(encKey);
    this.cachedKey = encKey;

    this.state = {
      loggedIn: true,
      email: res.user.email,
      token: res.token,
      userId: res.user.id,
      salt,
      secretKey,
      vaultVersion: 0,
    };
    this.saveToStorage();
    this.notify();

    return { secretKey };
  }

  async login(email: string, masterPassword: string, secretKey: string): Promise<void> {
    const saltRes = await this.request<{ salt: string }>(
      '/api/auth/login/salt',
      { method: 'POST', body: JSON.stringify({ email }) }
    );

    const verifier = await deriveAuthVerifier(masterPassword, saltRes.salt, email);
    const loginRes = await this.request<{ user: { id: string; email: string }; token: string }>(
      '/api/auth/login/verify',
      { method: 'POST', body: JSON.stringify({ email, verifier }) }
    );

    const encKey = await deriveEncryptionKey(masterPassword, secretKey, saltRes.salt, email);
    await storeEncryptionKey(encKey);
    this.cachedKey = encKey;

    this.state = {
      loggedIn: true,
      email: loginRes.user.email,
      token: loginRes.token,
      userId: loginRes.user.id,
      salt: saltRes.salt,
      secretKey,
      vaultVersion: 0,
    };
    this.saveToStorage();
    this.notify();
  }

  async logout(): Promise<void> {
    try {
      if (this.state.token) {
        await this.request('/api/auth/logout', { method: 'POST' });
      }
    } catch { /* ignore */ }

    this.cachedKey = null;
    await clearEncryptionKey();

    this.state = { loggedIn: false, email: '', token: '', userId: '', salt: '', secretKey: '', vaultVersion: 0 };
    localStorage.removeItem('keykeep_sync');
    this.notify();
  }

  async pushVault(credentials: Credential[]): Promise<void> {
    if (!this.state.loggedIn) throw new Error('请先登录');

    const encKey = await this.getEncKey();
    const json = JSON.stringify(credentials);
    const { encrypted_data, iv } = await encryptVault(json, encKey);

    const res = await this.request<{ vault: { version: number; updated_at: number } }>(
      '/api/vault',
      {
        method: 'PUT',
        body: JSON.stringify({
          encrypted_data,
          iv,
          expected_version: this.state.vaultVersion,
        }),
      }
    );

    this.state.vaultVersion = res.vault.version;
    this.saveToStorage();
    this.notify();
  }

  async pullVault(): Promise<Credential[] | null> {
    if (!this.state.loggedIn) throw new Error('请先登录');

    const encKey = await this.getEncKey();

    let vaultData: { vault: { encrypted_data: string; iv: string; version: number } };
    try {
      vaultData = await this.request('/api/vault', { method: 'GET' });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('保险库尚未创建')) return null;
      throw e;
    }

    const json = await decryptVault(
      vaultData.vault.encrypted_data,
      vaultData.vault.iv,
      encKey
    );

    this.state.vaultVersion = vaultData.vault.version;
    this.saveToStorage();
    this.notify();

    return JSON.parse(json) as Credential[];
  }
}

export const syncClient = new SyncClient();
