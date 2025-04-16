import { Session } from "./types";
import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";

// src/stores/auth-store.ts
export interface AuthStore {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  posId?: string;
  partnerExtId?: string;
  marketingNameExtId?: string;
  expiresAt?: Date;
  username?: string;
  password?: string;
}

// In-memory store for simplicity; in a production app, consider more secure options
const authStore: AuthStore = {
  // Set default values
  username: "994998000187-761",
  password: "1Xc1Vu1m",
};

export class AuthStoreService {
  static getStore(): AuthStore {
    return { ...authStore };
  }

  static updateStore(data: Partial<AuthStore>): void {
    authStore.accessToken = data.accessToken ?? authStore.accessToken;
    authStore.refreshToken = data.refreshToken ?? authStore.refreshToken;
    authStore.apiKey = data.apiKey ?? authStore.apiKey;
    authStore.posId = data.posId ?? authStore.posId;
    authStore.partnerExtId = data.partnerExtId ?? authStore.partnerExtId;
    authStore.marketingNameExtId = data.marketingNameExtId ?? authStore.marketingNameExtId;
    authStore.expiresAt = data.expiresAt ?? authStore.expiresAt;
    authStore.username = data.username ?? authStore.username;
    authStore.password = data.password ?? authStore.password;
  }

  static clearStore(): void {
    this.updateStore({
      accessToken: undefined,
      refreshToken: undefined,
      apiKey: undefined,
      posId: undefined,
      partnerExtId: undefined,
      marketingNameExtId: undefined,
      expiresAt: undefined,
    });
  }

  static isAuthenticated(): boolean {
    return !!authStore.accessToken && !!authStore.expiresAt && authStore.expiresAt > new Date();
  }

  static setCredentials(username: string, password: string): void {
    const store = this.getStore();

    // Update store with credentials
    this.updateStore({
      ...store,
      username,
      password,
    });
  }

  static getCredentials(): { username: string; password: string } | null {
    const store = this.getStore();

    if (!store.username || !store.password) {
      return null;
    }

    return {
      username: store.username,
      password: store.password,
    };
  }
}

export class SessionStore {
  private sessions: Map<string, Session> = new Map();

  createSession(username: string): Session {
    // Generate a random session ID
    const id = crypto.randomBytes(16).toString("hex");
    const session: Session = {
      id,
      username,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  removeSession(id: string): boolean {
    return this.sessions.delete(id);
  }
}

// Create a single instance of the session store
export const sessionStore = new SessionStore();

// Hardcoded credentials (for demonstration only)
// In a real application, you would use a secure database with hashed passwords
export const VALID_CREDENTIALS = [
  { username: "994998000187-761", password: "1Xc1Vu1m" },
];
