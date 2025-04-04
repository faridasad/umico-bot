import fastify, { FastifyInstance } from 'fastify';
import { requireAuth } from './modules/auth/middleware';
import path from "path"
import { authRoutes } from './modules/auth/routes';
import fastifyStatic from '@fastify/static';
import { productRoutes } from './modules/products/routes';


export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: true,
  });
  
  // Register plugins
  app.register(require('@fastify/cors'));
  app.register(require('@fastify/formbody'));

  app.register(fastifyStatic, {
    root: path.join(__dirname, './public'),
    prefix: '/',
  });

  // Register routes
  app.register(authRoutes, { prefix: '/auth' });
  app.register(productRoutes, { prefix: '/api/products' });

  // Example of a protected route that requires authentication
  app.register(
    async (instance) => {
      // Apply auth check to all routes in this plugin
      instance.addHook('onRequest', requireAuth);
      
      // Protected routes go here
      instance.get('/dashboard', async () => {
        return { message: 'Business dashboard data' };
      });
    },
    { prefix: '/api' }
  );

  app.get('/', async (request, reply) => {
    return reply.sendFile('index.html');
  });
  app.get('/products', async (request, reply) => {
    return reply.sendFile('products.html');
  });

  return app;
}