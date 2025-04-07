// src/modules/products/service.ts
import { HttpClient } from "../../utils/http-client";
import { wait } from "../../utils/time";
import { ProductStoreService } from "./store";
import { ProductResponse } from "./types";

export class ProductsService {
  private static readonly MAX_PER_PAGE = 100;
  private static readonly API_URL = "https://catalog-admin-web.umico.az/v1/product_offers";
  private static readonly MERCHANT_UUID = "b6cdebb3-ff9f-4701-8f99-81fc31c446a1";

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
      console.log("First page response:", firstPageResponse);

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
      console.error("Failed to load products:", err);
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

  /**
   * Update a product's price and quantity
   */
  static async updateProduct(uuid: string, updateData: { retail_price?: number; old_price?: number; qty?: number }) {
    try {
      // Build URL for the specific product
      const url = `${this.API_URL}/${uuid}`;

      // Prepare the update data in the format expected by the API
      const payload = {
        ...updateData,
      };

      // Make the API request
      const response = await HttpClient.put<any>(url, payload);

      // If successful, update the product in the store
      if (response && response.data) {
        const updatedProduct = response.data;

        // Find and update the product in the store
        const products = ProductStoreService.getOffers();
        const index = products.findIndex((p) => p.attributes.uuid === uuid);

        if (index !== -1) {
          products[index] = updatedProduct;
          ProductStoreService.setOffers(products);
        }

        return updatedProduct;
      }

      throw new Error("Failed to update product");
    } catch (error) {
      console.error(`Error updating product ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple products' prices
   * @param adjustment The amount to adjust prices by (positive = increase, negative = decrease)
   * @param productIds Optional array of product IDs to update (if not provided, updates all products)
   */
  static async bulkUpdatePrices(adjustment: number, productIds?: string[]): Promise<{ success: number; failed: number; total: number }> {
    try {
      // If no product IDs provided, use all products in the store
      const products = ProductStoreService.getOffers();

      const idsToUpdate = productIds || products.map((p) => p.id);

      console.log("Products to update:", idsToUpdate);

      // Track success/failure
      const result = {
        success: 0,
        failed: 0,
        total: idsToUpdate.length,
      };

      // Process each product
      for (const id of idsToUpdate) {
        try {
          // Find the product
          const product = products.find((p) => p.id === id);
          if (!product) {
            result.failed++;
            continue;
          }

          // Calculate new prices
          const currentPrice = product.attributes.retail_price;

          console.log(currentPrice, adjustment);

          const newPrice = Math.max(0, currentPrice + adjustment); // Ensure price doesn't go below 0

          // Prepare update data
          const updateData = {
            retail_price: newPrice,
          };

          // Update the product
          await this.updateProduct(id, updateData);
          result.success++;
          console.log(`Product ${id} updated successfully with new price ${newPrice} (old price: ${currentPrice}) - success: ${result.success}, failed: ${result.failed}`);
          await wait(200);
        } catch (error) {
          console.error(`Failed to update product ${id}:`, error);
          result.failed++;
        }
      }

      return result;
    } catch (error) {
      console.error("Error in bulk update:", error);
      throw error;
    }
  }
}
