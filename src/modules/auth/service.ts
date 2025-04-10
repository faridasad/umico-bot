import axios from "axios";
import { SignInRequest, SignInResponse, TokenRefreshResponse } from "./types";
import { config } from "../../config";
import { AuthStoreService } from "./store";

export class AuthService {
  private static credentials: SignInRequest | null = {
    username: config.auth.username,
    password: config.auth.password
  };

  static async signIn(): Promise<void> {
    try {
      const response = await axios.post<SignInResponse>(`${config.api.baseUrl}/auth/sign-in`, this.credentials);

      const { access_token, refresh_token, api_key, pos_id, partner_ext_id, marketing_name_ext_id, expires_in } = response.data;

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + expires_in);

      // Store auth data
      AuthStoreService.updateStore({
        accessToken: access_token,
        refreshToken: refresh_token,
        apiKey: api_key,
        posId: pos_id,
        partnerExtId: partner_ext_id,
        marketingNameExtId: marketing_name_ext_id,
        expiresAt: expiresAt,
      });
    } catch (error) {
      // Type assertion for better error handling
      const err = error as Error;
      throw new Error(`Authentication failed: ${err.message}`);
    }
  }

  static async refreshToken(): Promise<boolean> {
    try {
      const authStore = AuthStoreService.getStore();
      
      if (!authStore.refreshToken) {
        throw new Error("No refresh token available");
      }

      // Create a clean axios instance that doesn't use our interceptors
      // to avoid circular dependencies when refreshing
      const response = await axios.post<TokenRefreshResponse>(
        `${config.api.baseUrl}/auth/refresh`,
        { refresh_token: authStore.refreshToken }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate new expiration time
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + expires_in);

      // Update only the tokens and expiration
      AuthStoreService.updateStore({
        ...authStore,
        accessToken: access_token,
        refreshToken: refresh_token || authStore.refreshToken, // Use new refresh token if provided
        expiresAt: expiresAt,
      });

      console.log("Token refreshed successfully");
      return true;
    } catch (error) {
      const err = error as Error;
      console.error(`Token refresh failed: ${err.message}`);
      // Clear auth on refresh failure
      this.clearAuth();
      return false;
    }
  }

  static isAuthenticated(): boolean {
    return AuthStoreService.isAuthenticated();
  }

  static clearAuth(): void {
    AuthStoreService.clearStore();
  }
}