// src/modules/products/routes.ts
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ProductsService } from "./service";
import { requireAuth } from "../auth/middleware";

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
        message: `Updated ${result.success} of ${result.total} products`,
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
