// src/modules/auth/service.ts
import axios from "axios";
import { SignInRequest, SignInResponse } from "./types";
import { config } from "../../config";
import { AuthStoreService } from "./store";

export class AuthService {
  static async signIn(credentials: SignInRequest): Promise<void> {
    try {
      const response = await axios.post<SignInResponse>(`${config.api.baseUrl}/auth/sign-in`, credentials);

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

  static isAuthenticated(): boolean {
    return AuthStoreService.isAuthenticated();
  }

  static clearAuth(): void {
    AuthStoreService.clearStore();
  }
}
