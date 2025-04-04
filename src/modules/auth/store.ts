// src/stores/auth-store.ts
export interface AuthStore {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  posId?: string;
  partnerExtId?: string;
  marketingNameExtId?: string;
  expiresAt?: Date;
}

// In-memory store for simplicity; in a production app, consider more secure options
const authStore: AuthStore = {};

export class AuthStoreService {
  static getStore(): AuthStore {
    return { ...authStore };
  }

  static updateStore(data: Partial<AuthStore>): void {
    Object.assign(authStore, data);
  }

  static clearStore(): void {
    Object.keys(authStore).forEach((key) => {
      delete authStore[key as keyof AuthStore];
    });
  }

  static isAuthenticated(): boolean {
    return !!authStore.accessToken && !!authStore.expiresAt && authStore.expiresAt > new Date();
  }
}
