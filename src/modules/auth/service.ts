import axios from "axios";
import { LoginRequest, SignInRequest, SignInResponse, TokenRefreshResponse } from "./types";
import { config } from "../../config";
import { AuthStoreService, sessionStore, VALID_CREDENTIALS } from "./store";
import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { HttpClient } from "../../utils/http-client";

export class AuthService {
  private static credentials: SignInRequest | null = {
    username: config.auth.username,
    password: config.auth.password,
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
      const response = await axios.post<TokenRefreshResponse>(`${config.api.baseUrl}/auth/refresh`, { refresh_token: authStore.refreshToken });

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

  async login(req: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
    const { username, password } = req.body;

    // Check if credentials are valid
    const isValid = VALID_CREDENTIALS.some((cred) => cred.username === username && cred.password === password);

    await AuthService.signIn();

    // Get the new token after authentication
    const newToken = AuthStoreService.getStore().accessToken;
    console.log("New access token:", newToken ? newToken.slice(-10) : "none");

    // Explicitly update the token in the Axios instance
    if (newToken) {
      HttpClient.updateToken(newToken);
      console.log("HTTP client headers updated with new token");
    }

    if (!isValid) {
      return reply.code(401).send({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Create a new session
    const session = sessionStore.createSession(username);

    return {
      success: true,
      message: "Authentication successful",
      username: session.username,
      sessionToken: session.id,
    };
  }

  /**
   * Signs out a user by removing their session
   */
  async logout(req: FastifyRequest, reply: FastifyReply) {
    const sessionToken = req.headers.authorization?.replace("Bearer ", "");

    if (sessionToken) {
      sessionStore.removeSession(sessionToken);
    }

    return {
      success: true,
      message: "Signed out successfully",
    };
  }

  /**
   * Validates a session token
   */
  validateSession(sessionToken: string): boolean {
    const session = sessionStore.getSession(sessionToken);
    return !!session;
  }
}
