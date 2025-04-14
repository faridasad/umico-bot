// src/utils/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { AuthStoreService } from "../modules/auth/store";
import { config } from "../config";

export class HttpClient {
  private static instance: AxiosInstance;

  static getInstance(): AxiosInstance {
    if (!this.instance) {
      this.instance = axios.create({
        baseURL: config.api.baseUrl,
      });

      // Add request interceptor to dynamically get auth headers for each request
      this.instance.interceptors.request.use((config) => {
        // Get fresh auth data for every request
        const authStore = AuthStoreService.getStore();

        // Use the current token (not the one captured at instance creation)
        if (authStore.accessToken) {
          console.log(`Using token: ${authStore.accessToken.slice(-10)}`);
          config.headers.Authorization = `Bearer ${authStore.accessToken}`;
        }

        if (authStore.apiKey) {
          config.headers["X-API-Key"] = authStore.apiKey;
        }

        return config;
      });
    }

    return this.instance;
  }

  // Force creation of a new instance (useful after re-authentication)
  static resetInstance(): void {
    this.instance = undefined as any;
    console.log("HTTP client instance reset - will use new token on next request");
  }

  static updateToken(token: string): void {
    if (!token) {
      console.warn("Attempted to update token with empty value");
      return;
    }

    console.log(`Explicitly setting token in Axios headers: ${token.slice(-10)}`);

    // Get the instance (creates one if it doesn't exist)
    const instance = this.getInstance();

    // Update the Authorization header in the default headers
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // You can also update the header for specific methods if needed
    instance.defaults.headers.get["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.post["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.put["Authorization"] = `Bearer ${token}`;
    instance.defaults.headers.delete["Authorization"] = `Bearer ${token}`;
  }

  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const instance = this.getInstance();
    const response = await instance.get<T>(url, config);
    return response.data;
  }

  static async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const instance = this.getInstance();
    const response = await instance.post<T>(url, data, config);
    return response.data;
  }

  static async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const instance = this.getInstance();
    const response = await instance.put<T>(url, data, config);
    return response.data;
  }

  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const instance = this.getInstance();
    const response = await instance.delete<T>(url, config);
    return response.data;
  }
}
