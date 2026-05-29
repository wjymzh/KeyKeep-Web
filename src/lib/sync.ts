/**
 * KeyKeep Sync Client — communicates with the Cloudflare Worker backend.
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
  private masterPassword = '';
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
  hasMasterPassword(): boolean { return !!this.masterPassword; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() { this.listeners.forEach((fn) => fn()); }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    const { token, ...rest } = this.state;
    localStorage.setItem('keykeep_sync', JSON.stringify(rest));
    sessionStorage.setItem('keykeep_token', token);
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('keykeep_sync');
      if (stored) {
        const data = JSON.parse(stored);
        const token = sessionStorage.getItem('keykeep_token') || '';
        this.state = { ...data, token, loggedIn: !!data.userId && !!token };
      }
    } catch { /* ignore */ }
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

    this.masterPassword = masterPassword;
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

    this.masterPassword = masterPassword;
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
    this.masterPassword = '';
    this.state = { loggedIn: false, email: '', token: '', userId: '', salt: '', secretKey: '', vaultVersion: 0 };
    localStorage.removeItem('keykeep_sync');
    sessionStorage.removeItem('keykeep_token');
    this.notify();
  }

  setMasterPassword(mp: string) {
    this.masterPassword = mp;
  }

  async pushVault(credentials: Credential[]): Promise<void> {
    if (!this.state.loggedIn || !this.masterPassword) {
      throw new Error('请先登录并解锁');
    }

    const encKey = await deriveEncryptionKey(
      this.masterPassword, this.state.secretKey, this.state.salt, this.state.email
    );

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
    if (!this.state.loggedIn || !this.masterPassword) {
      throw new Error('请先登录并解锁');
    }

    let vaultData: { vault: { encrypted_data: string; iv: string; version: number } };
    try {
      vaultData = await this.request('/api/vault', { method: 'GET' });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('保险库尚未创建')) return null;
      throw e;
    }

    const encKey = await deriveEncryptionKey(
      this.masterPassword, this.state.secretKey, this.state.salt, this.state.email
    );

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
