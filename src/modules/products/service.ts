// src/modules/products/service.ts
import { HttpClient } from '../../utils/http-client';
import { ProductStoreService } from './store';
import { ProductResponse } from './types';

export class ProductsService {
  private static readonly MAX_PER_PAGE = 100;
  private static readonly API_URL = 'https://catalog-admin-web.umico.az/v1/product_offers';
  private static readonly MERCHANT_UUID = 'b6cdebb3-ff9f-4701-8f99-81fc31c446a1';

  /**
   * Load all products by paginating through the API
   */
  static async loadAllProducts() {
    try {
      // Set loading flag and clear existing offers
      ProductStoreService.setLoading(true);
      ProductStoreService.clearOffers();
      
      // Fetch first page to get metadata
      const firstPageResponse = await this.fetchProductPage(1);
      console.log('First page response:', firstPageResponse);
      
      const totalPages = firstPageResponse.meta.total_pages;
      ProductStoreService.setTotalProducts(firstPageResponse.meta.total_entries);
      
      // Add first page results to store
      ProductStoreService.setOffers(firstPageResponse.data);
      
      // Fetch remaining pages in sequence (if any)
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          console.log(`Fetching page ${page} of ${totalPages}`);
          const pageResponse = await this.fetchProductPage(page);
          ProductStoreService.addOffers(pageResponse.data);
        }
      }
      
      // Update last updated timestamp
      ProductStoreService.updateLastUpdated();
      ProductStoreService.setLoading(false);
      
      return ProductStoreService.getStore();
    } catch (error) {
      ProductStoreService.setLoading(false);
      const err = error as Error;
      console.error('Failed to load products:', err);
      throw new Error(`Failed to load products: ${err.message}`);
    }
  }
  
  /**
   * Fetch a single page of products from the API
   */
  private static async fetchProductPage(page: number): Promise<ProductResponse> {
    // Build URL with query parameters
    const url = `${this.API_URL}?page=${page}&per_page=${this.MAX_PER_PAGE}&q[s]=updated_at+desc&q[merchant_uuid_eq]=${this.MERCHANT_UUID}`;
    
    try {
      return await HttpClient.get<ProductResponse>(url);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all products from the store
   */
  static getProducts() {
    return ProductStoreService.getOffers();
  }
  
  /**
   * Get the store metadata
   */
  static getMetadata() {
    return ProductStoreService.getMeta();
  }
}