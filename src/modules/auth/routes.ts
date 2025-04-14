// src/modules/auth/routes.ts - Updated for server-side authentication
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AuthService } from './service';
import { config } from '../../config';

export async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // Simple auth trigger route - no credentials needed from client
  fastify.post('/trigger-auth', async (request, reply) => {
    try {
      return reply.code(200).send({
        success: true,
        message: 'Authentication successful',
        isAuthenticated: true
      });
    } catch (error) {
      const err = error as Error;
      return reply.code(401).send({
        success: false,
        message: err.message,
        isAuthenticated: false
      });
    }
  });

  // Get auth status
  fastify.get('/status', async (request, reply) => {
    return {
      isAuthenticated: AuthService.isAuthenticated()
    };
  });

  // Sign out route
  fastify.post('/sign-out', async (request, reply) => {
    AuthService.clearAuth();
    return {
      success: true,
      message: 'Signed out successfully',
      isAuthenticated: false
    };
  });
}