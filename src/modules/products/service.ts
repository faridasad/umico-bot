// src/modules/products/service.ts
import axios from "axios";
import { HttpClient } from "../../utils/http-client";
import { wait } from "../../utils/time";
import { AuthService } from "../auth/service";
import { AuthStoreService } from "../auth/store";
import { ProductStoreService } from "./store";
import { ProductOffer, ProductResponse } from "./types";

import * as fs from "fs";
import * as path from "path";

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

      // Save products to local JSON file with minimum price limits
      await this.saveProductsToJsonFile();

      return ProductStoreService.getStore();
    } catch (error) {
      ProductStoreService.setLoading(false);
      const err = error as Error;
      console.error("Failed to load products:", err);
      throw new Error(`Failed to load products: ${err.message}`);
    }
  }

  static async saveProductsToJsonFile() {
    try {
      // Define file paths
      const dataDir = path.join(__dirname, "../../data");
      const filePath = path.join(dataDir, "products.json");
      const backupFilePath = path.join(dataDir, "products.backup.json");

      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Get current products from store
      const currentProducts = ProductStoreService.getStore().offers;

      // Prepare data to write (only id, name, and minimumPriceLimit)
      const productsData = currentProducts.map((product) => ({
        id: product.id,
        name: product.attributes.product.name_az,
        price: product.attributes.retail_price,
        minimumPriceLimit: Math.round(product.attributes.retail_price * 0.9), // Default to 90% of price
      }));

      // Read existing file if it exists
      let existingData = [];
      if (fs.existsSync(filePath)) {
        // Create backup of current file
        fs.copyFileSync(filePath, backupFilePath);

        // Read existing data
        const fileContent = fs.readFileSync(filePath, "utf8");
        existingData = JSON.parse(fileContent);
      }

      // Merge existing data with new data
      const existingProductsMap = new Map();
      existingData.forEach((product: ProductOffer) => {
        existingProductsMap.set(product.id, product);
      });

      // Update existing products and add new ones
      productsData.forEach((product) => {
        if (existingProductsMap.has(product.id)) {
          // Product exists, preserve minimumPriceLimit if it was manually set
          const existingProduct = existingProductsMap.get(product.id);
          product.minimumPriceLimit = existingProduct.minimumPriceLimit;
        }
        existingProductsMap.set(product.id, product);
      });

      // Convert map back to array
      const mergedProducts = Array.from(existingProductsMap.values());

      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(mergedProducts, null, 2));

      console.log(`Wrote ${mergedProducts.length} products to ${filePath}`);

      return true;
    } catch (error) {
      const err = error as Error;
      console.error("Failed to write products to JSON file:", err);
      throw new Error(`Failed to write products to JSON file: ${err.message}`);
    }
  }

  /**
   * Fetch a single page of products from the API
   */
  private static async fetchProductPage(page: number): Promise<ProductResponse> {
    // Build URL with query parameters
    const url = `${this.API_URL}?page=${page}&per_page=${this.MAX_PER_PAGE}&q[s]=updated_at+desc&q[merchant_uuid_eq]=${this.MERCHANT_UUID}&q[active_eq]=true`;

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

  static async loadProductLimits(): Promise<Map<string, number>> {
    try {
      const fs = require("fs");
      const path = require("path");

      const filePath = path.join(__dirname, "../../data/products.json");
      if (!fs.existsSync(filePath)) {
        console.log("Products file not found, no price limits available");
        return new Map();
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      const products = JSON.parse(fileContent);

      const limitsMap = new Map<string, number>();
      products.forEach((product) => {
        if (product.id && product.minimumPriceLimit) {
          limitsMap.set(product.id, product.minimumPriceLimit);
        }
      });

      console.log(`Loaded minimum price limits for ${limitsMap.size} products`);
      return limitsMap;
    } catch (error) {
      console.error("Failed to load product limits:", error);
      return new Map();
    }
  }

  /**
   * Update multiple products' prices with retry mechanism
   * @param adjustment The amount to adjust prices by (positive = increase, negative = decrease)
   * @param productIds Optional array of product IDs to update (if not provided, updates all products)
   * @param maxRetries Maximum number of retry attempts for failed updates
   * @param retryDelay Base delay between retries in milliseconds (will increase with backoff)
   */
  static async bulkUpdatePrices(
    adjustment: number,
    productIds?: string[],
    maxRetries: number = 3,
    retryDelay: number = 500
  ): Promise<{ success: number; failed: number; skipped: number; belowLimit: number; total: number; failedIds: string[]; belowLimitIds: string[] }> {
    try {
      const start = new Date();

      // Load minimum price limits from the JSON file
      const priceLimits = await this.loadProductLimits();
      console.log(`Loaded ${priceLimits.size} price limits from file`);

      // If no product IDs provided, use all products in the store
      const products = ProductStoreService.getOffers();
      const initialIds = productIds || products.map((p) => p.id);
      console.log("Initial products to evaluate:", initialIds.length);

      // Pre-filter products from store 1044 (Velosport)
      const idsToUpdate: string[] = [];
      const skippedIds: string[] = [];

      // Track success/failure and failed IDs
      const result = {
        success: 0,
        failed: 0,
        skipped: 0,
        belowLimit: 0, // New status for products below minimum price limit
        total: initialIds.length,
        failedIds: [] as string[],
        belowLimitIds: [] as string[], // New array to track products below minimum price
      };

      // Pre-process to filter out products from store 1044
      for (const id of initialIds) {
        try {
          // Find the product
          const product = products.find((p) => p.id === id);
          if (!product) {
            result.failed++;
            result.failedIds.push(id);
            console.log(`Product ${id} not found in local store`);
            continue;
          }

          const globalProductId = product.attributes.product.id;
          if (!globalProductId) {
            console.log(`No global product ID found for product ${id}, skipping`);
            result.skipped++;
            skippedIds.push(id);
            continue;
          }

          // Fetch global product details to check if it's from Velosport and get price
          console.log(`Fetching global product details for ID ${globalProductId}`);
          const productDetailsUrl = `https://mp-catalog.umico.az/api/v1/products/${globalProductId}`;

          try {
            const productDetails: any = await HttpClient.get(productDetailsUrl);

            // Store the global product details for later use during batch processing
            // This prevents having to make the same API call twice
            product.globalDetails = productDetails;

            if (!productDetails.default_offer || !productDetails.default_offer.retail_price) {
              console.log(`No retail price found in global data for product ${id}, skipping update`);
              result.skipped++;
              skippedIds.push(id);
              continue;
            }

            if (productDetails.default_offer && productDetails.default_offer.seller && productDetails.default_offer.seller.marketing_name) {
              const marketingName = productDetails.default_offer.seller.marketing_name;

              if (marketingName.id === 1044) {
                console.log(`Product ${id} (global ID: ${globalProductId}) is from Velosport, skipping update`);
                result.skipped++;
                skippedIds.push(id);
                continue;
              } else {
                console.log(`Product ${id} (global ID: ${globalProductId}) is NOT from Velosport (${marketingName.name}), will check price`);
                // Log the current price from global data
                const currentPrice = productDetails.default_offer.retail_price;
                console.log(`Current global price for product ${id}: ${currentPrice}`);

                // Check if the new price would be below the minimum limit
                const newPrice = currentPrice + adjustment;
                const minimumLimit = priceLimits.get(id);

                if (minimumLimit && newPrice < minimumLimit) {
                  console.log(`New price ${newPrice} would be below minimum limit ${minimumLimit} for product ${id}, skipping`);
                  result.belowLimit++;
                  result.belowLimitIds.push(id);
                  continue;
                }

                idsToUpdate.push(id);
              }
            } else {
              console.log(`Product ${id} (global ID: ${globalProductId}) doesn't have expected seller info, will check price limit`);
              // We still need to check minimum price limit here
              const currentPrice = productDetails.default_offer.retail_price;
              const newPrice = currentPrice + adjustment;
              const minimumLimit = priceLimits.get(id);

              if (minimumLimit && newPrice < minimumLimit) {
                console.log(`New price ${newPrice} would be below minimum limit ${minimumLimit} for product ${id}, skipping`);
                result.belowLimit++;
                result.belowLimitIds.push(id);
                continue;
              }

              idsToUpdate.push(id);
            }
          } catch (detailsError) {
            console.error(`Failed to fetch product details for global ID ${globalProductId}:`, detailsError);
            // If we can't determine the store, include it in the update
            console.log(`Unable to verify store for product ${id}, will include in update`);
            idsToUpdate.push(id);
          }
        } catch (error) {
          console.error(`Error preprocessing product ${id}:`, error);
          result.failed++;
          result.failedIds.push(id);
        }
      }

      console.log(
        `After filtering: ${idsToUpdate.length} products to update, ${skippedIds.length} products skipped, ${result.belowLimit} products below price limit, ${result.failed} products failed preliminary checks`
      );

      const batchSize = 20;
      for (let batchIndex = 0; batchIndex < idsToUpdate.length; batchIndex += batchSize) {
        console.log(`Processing batch ${Math.floor(batchIndex / batchSize) + 1} of ${Math.ceil(idsToUpdate.length / batchSize)}`);

        // Get current batch
        const batch = idsToUpdate.slice(batchIndex, batchIndex + batchSize);

        // Process each product in the batch
        for (const id of batch) {
          let retryCount = 0;
          let success = false;

          while (!success && retryCount <= maxRetries) {
            try {
              // Find the product
              const product = products.find((p) => p.id === id);
              if (!product) {
                result.failed++;
                result.failedIds.push(id);
                console.log(`Product ${id} not found in local store`);
                break;
              }

              // Use the global product details that we cached during pre-processing
              let productDetails = product.globalDetails;

              // If we don't have the cached global details for some reason, fetch them
              if (!productDetails) {
                const globalProductId = product.attributes.product.id;
                if (!globalProductId) {
                  result.failed++;
                  result.failedIds.push(id);
                  console.log(`No global product ID found for product ${id}`);
                  break;
                }

                // Fetch global product details
                console.log(`No cached global details, fetching details for ID ${globalProductId}`);
                const productDetailsUrl = `https://mp-catalog.umico.az/api/v1/products/${globalProductId}`;
                productDetails = await HttpClient.get(productDetailsUrl);
              }

              // Extract current price from global product data
              const currentPrice = productDetails.default_offer.retail_price;
              if (!currentPrice) {
                result.failed++;
                result.failedIds.push(id);
                console.log(`No retail price found in global data for product ${id}`);
                break;
              }

              console.log(`Current global price for product ${id}: ${currentPrice}`);
              const newPrice = currentPrice + adjustment;

              // Double check minimum price limit (in case it wasn't caught in pre-processing)
              const minimumLimit = priceLimits.get(id);
              if (minimumLimit && newPrice < minimumLimit) {
                console.log(`New price ${newPrice} would be below minimum limit ${minimumLimit} for product ${id}, skipping update`);
                result.belowLimit++;
                result.belowLimitIds.push(id);
                break;
              }

              // Prepare update data
              const updateData = {
                retail_price: newPrice,
              };

              // Update the product
              await this.updateProduct(id, updateData);
              result.success++;
              success = true;
              console.log(
                `Product ${id} updated successfully with new price ${newPrice} (old price: ${currentPrice}) - success: ${result.success}, failed: ${result.failed}, skipped: ${result.skipped}, below limit: ${result.belowLimit}`
              );

              // Short wait between individual product updates
              // await wait(100);
            } catch (error: any) {
              // The HttpClient now handles 429 errors internally
              // But we still check here in case the error gets through
              if (error.response && error.response.status === 429) {
                console.log("Rate limit reached (HTTP 429). Attempting to refresh access token...");
                try {
                  // Log the current token before refresh
                  const oldToken = AuthStoreService.getStore().accessToken;
                  console.log("Current access token:", oldToken ? oldToken.slice(-10) : "none");

                  // First try to refresh token if available
                  const refreshResult = await AuthService.refreshToken();

                  // If refresh failed or wasn't available, try a full sign-in
                  if (!refreshResult) {
                    console.log("Token refresh failed or unavailable, attempting full sign-in...");
                    await AuthService.signIn();
                  }

                  // Get the new token after authentication
                  const newToken = AuthStoreService.getStore().accessToken;
                  console.log("New access token:", newToken ? newToken.slice(-10) : "none");

                  // Explicitly update the token in the Axios instance
                  if (newToken) {
                    HttpClient.updateToken(newToken);
                    console.log("HTTP client headers updated with new token");

                    // Wait a moment to ensure everything is updated
                    await wait(1000);

                    // Continue processing without counting this as a retry
                    continue;
                  } else {
                    throw new Error("Authentication succeeded but no token was returned");
                  }
                } catch (error) {
                  console.error("Failed to refresh token:", error);
                  // Continue with normal retry logic
                }
              }

              retryCount++;
              console.warn(`Attempt ${retryCount}/${maxRetries} failed for product ${id}:`, error?.message);

              if (retryCount <= maxRetries) {
                // Exponential backoff: wait longer between each retry
                const backoffDelay = retryDelay * Math.pow(2, retryCount - 1);
                console.log(`Retrying after ${backoffDelay}ms...`);
                await wait(backoffDelay);
              } else {
                // Max retries exceeded
                result.failed++;
                result.failedIds.push(id);
                console.error(`Failed to update product ${id} after ${maxRetries} retries`);
              }
            }
          }
        }

        // Wait between batches to avoid rate limiting
        if (batchIndex + batchSize < idsToUpdate.length) {
          const batchWaitTime = 3000; // 3 seconds between batches
          console.log(`Batch complete. Waiting ${batchWaitTime / 1000} seconds before processing next batch...`);
          await wait(batchWaitTime);
        }
      }

      // Log summary
      console.log(`Bulk update complete. Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}, Below limit: ${result.belowLimit}, Total: ${result.total}`);
      if (result.failedIds.length > 0) {
        console.log(`Failed IDs: ${result.failedIds.join(", ")}`);
      }
      if (result.belowLimitIds.length > 0) {
        console.log(`Below limit IDs: ${result.belowLimitIds.join(", ")}`);
      }

      // human readable time taken to locale string
      const timeTaken = new Date().getTime() - start.getTime();
      console.log(`Time taken: ${timeTaken} ms (${(timeTaken / 1000).toFixed(2)} seconds)`);

      return result;
    } catch (error) {
      console.error("Error in bulk update:", error);
      throw error;
    }
  }

  static async updateMinimumPriceLimit(id: string, name: string, minimumPriceLimit: number): Promise<boolean> {
    try {
      const dataDir = path.join(__dirname, "../../data");
      const filePath = path.join(dataDir, "products.json");
      const backupFilePath = path.join(dataDir, "products.backup.json");

      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let products = [] as any;
      let existingProduct = null as any;

      // Read existing file if it exists
      if (fs.existsSync(filePath)) {
        // Create backup
        fs.copyFileSync(filePath, backupFilePath);

        // Read existing data
        const fileContent = fs.readFileSync(filePath, "utf8");
        products = JSON.parse(fileContent);

        // Find product to update
        existingProduct = products.find((p) => p.id === id);
      }

      if (existingProduct) {
        // Update existing product
        existingProduct.minimumPriceLimit = minimumPriceLimit;
        console.log(`Updated minimum price limit for product ${id} (${name}) to ${minimumPriceLimit}`);
      } else {
        // Get product price from store
        const productStore = ProductStoreService.getOffers();
        const product = productStore.find((p) => p.id === id);

        if (!product) {
          throw new Error(`Product ${id} not found in store`);
        }

        // Add new product
        products.push({
          id,
          name: product.attributes.product.name_az,
          price: product.attributes.retail_price,
          minimumPriceLimit,
        });

        console.log(`Added product ${id} (${name}) with minimum price limit ${minimumPriceLimit}`);
      }

      // Write updated data to file
      fs.writeFileSync(filePath, JSON.stringify(products, null, 2));

      return true;
    } catch (error) {
      const err = error as Error;
      console.error("Failed to update minimum price limit:", err);
      throw new Error(`Failed to update minimum price limit: ${err.message}`);
    }
  }

  static async getAllProductLimits(): Promise<any[]> {
    try {
      const dataDir = path.join(__dirname, "../../data");
      const filePath = path.join(dataDir, "products.json");

      if (!fs.existsSync(filePath)) {
        return [];
      }

      const fileContent = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error("Failed to get product limits:", error);
      return [];
    }
  }
}
