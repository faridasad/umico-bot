import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './service';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!AuthService.isAuthenticated()) {
    reply.code(401).send({
      success: false,
      message: 'Authentication required',
      isAuthenticated: false
    });
  }
}