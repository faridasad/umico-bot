import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./service";
import { AuthStoreService } from "./store";

export const authService = new AuthService();

// Authentication middleware
export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");

  if (!sessionToken || !authService.validateSession(sessionToken)) {
    return reply.code(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!AuthService.isAuthenticated()) {
    reply.code(401).send({
      success: false,
      message: "Authentication required",
      isAuthenticated: false,
    });
  }
}
