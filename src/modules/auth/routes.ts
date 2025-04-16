// src/modules/auth/routes.ts - Updated for server-side authentication
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { AuthService } from "./service";
import { config } from "../../config";
import { LoginRequest } from "./types";
import { authMiddleware, authService } from "./middleware";

export async function authRoutes(fastify: FastifyInstance, options: FastifyPluginOptions): Promise<void> {
  // Simple auth trigger route - no credentials needed from client
  fastify.post("/trigger-auth", async (request, reply) => {
    try {
      return reply.code(200).send({
        success: true,
        message: "Authentication successful",
        isAuthenticated: true,
      });
    } catch (error) {
      const err = error as Error;
      return reply.code(401).send({
        success: false,
        message: err.message,
        isAuthenticated: false,
      });
    }
  });

  fastify.post<{ Body: LoginRequest }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      return authService.login(req, reply);
    }
  );

  fastify.post(
    "/logout",
    {
      preHandler: [authMiddleware],
    },
    async (req, reply) => {
      return authService.logout(req, reply);
    }
  );

  // Get auth status
  fastify.post("/status", async (req: any, reply) => {
    const sessionToken = req.body?.sessionToken as string;

    if (sessionToken && authService.validateSession(sessionToken)) {
      return {
        success: true,
        isAuthenticated: true,
      };
    }

    return {
      success: true,
      isAuthenticated: false,
    };
  });

  // Sign out route
  fastify.post("/sign-out", async (request, reply) => {
    AuthService.clearAuth();
    return {
      success: true,
      message: "Signed out successfully",
      isAuthenticated: false,
    };
  });
}
