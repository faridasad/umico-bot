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
        timeout: 15000,
      });

      // Add request interceptor to automatically add auth headers
      this.instance.interceptors.request.use((config) => {
        const authStore = AuthStoreService.getStore();

        if (authStore.accessToken) {
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
