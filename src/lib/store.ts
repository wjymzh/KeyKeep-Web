import { Credential } from "./crypto";

type Listener = () => void;

class CredentialStore {
  private credentials: Credential[] = [];
  private listeners: Set<Listener> = new Set();
  private passphrase: string = "";

  getAll(): Credential[] {
    return this.credentials;
  }

  setAll(credentials: Credential[]) {
    this.credentials = [...credentials];
    this.notify();
  }

  getById(id: string): Credential | undefined {
    return this.credentials.find((c) => c.id === id);
  }

  add(credential: Credential) {
    this.credentials = [credential, ...this.credentials];
    this.notify();
  }

  update(credential: Credential) {
    this.credentials = this.credentials.map((c) =>
      c.id === credential.id ? credential : c
    );
    this.notify();
  }

  remove(id: string) {
    this.credentials = this.credentials.filter((c) => c.id !== id);
    this.notify();
  }

  search(query: string): Credential[] {
    if (!query.trim()) return this.credentials;
    const q = query.toLowerCase();
    return this.credentials.filter(
      (c) =>
        c.platform.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.tags.toLowerCase().includes(q)
    );
  }

  getPassphrase(): string {
    return this.passphrase;
  }

  setPassphrase(p: string) {
    this.passphrase = p;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const store = new CredentialStore();
