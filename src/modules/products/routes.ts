// src/modules/products/routes.ts
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ProductsService } from './service';
import { requireAuth } from '../auth/middleware';

export async function productRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Apply auth check to all product routes
  fastify.addHook('onRequest', requireAuth);
  
  // Load all products
  fastify.post('/load', async (request, reply) => {
    try {
      const products = await ProductsService.loadAllProducts();
      
      return {
        success: true,
        message: `Loaded ${products.offers.length} products`,
        totalProducts: products.meta.totalProducts,
        lastUpdated: products.meta.lastUpdated
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message
      });
    }
  });
  
  // Get all products
  fastify.get('/', async () => {
    const products = ProductsService.getProducts();
    const metadata = ProductsService.getMetadata();
    
    return {
      success: true,
      products,
      totalProducts: products.length,
      lastUpdated: metadata.lastUpdated
    };
  });
}