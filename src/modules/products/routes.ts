// src/modules/products/routes.ts

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ProductsService } from "./service";
import { requireAuth } from "../auth/middleware";
import { AuthService } from "../auth/service";
import { AuthStoreService } from "../auth/store";
import * as fs from 'fs';
import * as path from 'path';

export async function productRoutes(fastify: FastifyInstance, options: FastifyPluginOptions): Promise<void> {
  // Apply auth check to all product routes
  fastify.addHook("onRequest", requireAuth);

  // Load all products
  fastify.post("/load", async (request, reply) => {
    try {
      const products = await ProductsService.loadAllProducts();
      return {
        success: true,
        message: `Loaded ${products.offers.length} products`,
        totalProducts: products.meta.totalProducts,
        lastUpdated: products.meta.lastUpdated,
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });

  // Get all products
  fastify.get("/", async () => {
    const products = ProductsService.getProducts();
    const metadata = ProductsService.getMetadata();
    return {
      success: true,
      products,
      totalProducts: products.length,
      lastUpdated: metadata.lastUpdated,
    };
  });

  // Update product price and quantity
  fastify.put("/:uuid", async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const updateData = request.body as { retail_price?: number; old_price?: number; qty?: number };

      // Validate input
      if (!uuid) {
        return reply.code(400).send({
          success: false,
          message: "Product UUID is required",
        });
      }

      if (!updateData.retail_price && !updateData.old_price && !updateData.qty) {
        return reply.code(400).send({
          success: false,
          message: "At least one of retail_price, old_price, or qty is required",
        });
      }

      const updatedProduct = await ProductsService.updateProduct(uuid, updateData);
      return {
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });

  // Get minimum price limits for all products
  fastify.get("/min-price-limits", async (request, reply) => {
    try {
      const minPriceLimits = await ProductsService.loadProductLimits();
      
      // Convert Map to a regular object for JSON response
      const limitsObject: Record<string, number> = {};
      minPriceLimits.forEach((value, key) => {
        limitsObject[key] = value;
      });
      
      return {
        success: true,
        limits: limitsObject
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });
  
  // Get minimum price limit for a specific product
  fastify.get("/min-price-limit/:uuid", async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      
      if (!uuid) {
        return reply.code(400).send({
          success: false,
          message: "Product UUID is required",
        });
      }
      
      const minPriceLimits = await ProductsService.loadProductLimits();
      const limit = minPriceLimits.get(uuid);
      
      return {
        success: true,
        productId: uuid,
        minimumPriceLimit: limit || null
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });
  
  // Update minimum price limit for a product
  fastify.put("/min-price-limit/:uuid", async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const { minimumPriceLimit } = request.body as { minimumPriceLimit: number };
      
      if (!uuid) {
        return reply.code(400).send({
          success: false,
          message: "Product UUID is required",
        });
      }
      
      if (minimumPriceLimit === undefined || isNaN(minimumPriceLimit)) {
        return reply.code(400).send({
          success: false,
          message: "Valid minimum price limit is required",
        });
      }
      
      // Get product name for better logging/response
      let productName = uuid;
      const allProducts = ProductsService.getProducts();
      const product = allProducts.find(p => p.id === uuid);
      if (product && product.attributes && product.attributes.product) {
        productName = product.attributes.product.name_az || uuid;
      }
      
      // Update the minimum price limit
      await ProductsService.updateMinimumPriceLimit(uuid, productName, minimumPriceLimit);
      
      return {
        success: true,
        message: `Updated minimum price limit for ${productName}`,
        productId: uuid,
        minimumPriceLimit
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });

  fastify.post("/bulk-update-prices", async (request, reply) => {
    try {
      const { adjustment, productIds } = request.body as {
        adjustment: number;
        productIds?: string[];
      };

      // Validate input
      if (adjustment === undefined) {
        return reply.code(400).send({
          success: false,
          message: "Price adjustment amount is required",
        });
      }

      // Parse to ensure we have a number
      const adjustmentAmount = parseFloat(adjustment.toString());
      if (isNaN(adjustmentAmount)) {
        return reply.code(400).send({
          success: false,
          message: "Invalid price adjustment amount",
        });
      }

      // Perform bulk update
      const result = await ProductsService.bulkUpdatePrices(adjustmentAmount, productIds);
      return {
        success: true,
        message: `Updated ${result.success} of ${result.total} products (${result.belowLimit} below limit)`,
        result,
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });
}