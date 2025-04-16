// src/modules/scheduler/routes.ts
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authMiddleware, requireAuth } from "../auth/middleware";
import { schedulerService } from "./service";

export async function schedulerRoutes(fastify: FastifyInstance, options: FastifyPluginOptions): Promise<void> {
  // Apply auth check to all scheduler routes
  fastify.addHook("onRequest", requireAuth);

  // Start a price update schedule
  fastify.post("/start", async (request, reply) => {
    try {
      const { interval, adjustment, action, runImmediately } = request.body as {
        interval: number;
        adjustment: number;
        action: "increase" | "decrease";
        runImmediately?: boolean;
      };

      // Validate input
      if (!interval || interval < 1) {
        return reply.code(400).send({
          success: false,
          message: "Interval must be at least 1 minute",
        });
      }

      if (adjustment === undefined || isNaN(adjustment) || adjustment <= 0) {
        return reply.code(400).send({
          success: false,
          message: "Adjustment must be a positive number",
        });
      }

      if (!["increase", "decrease"].includes(action)) {
        return reply.code(400).send({
          success: false,
          message: 'Action must be either "increase" or "decrease"',
        });
      }

      // Use a static ID for now - only allowing one schedule at a time
      const scheduleId = "price-update-schedule";

      // Create the schedule
      const schedule = schedulerService.createSchedule(scheduleId, interval, adjustment, action, runImmediately !== false);

      return {
        success: true,
        message: `Price update schedule started, running every ${interval} minutes`,
        schedule,
      };
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });

  // Stop the price update schedule
  fastify.post("/stop", async (request, reply) => {
    try {
      // Use static ID
      const scheduleId = "price-update-schedule";

      const stopped = schedulerService.stopSchedule(scheduleId);

      if (stopped) {
        return {
          success: true,
          message: "Price update schedule stopped",
        };
      } else {
        return {
          success: false,
          message: "No active schedule found",
        };
      }
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        message: err.message,
      });
    }
  });

  // Get the status of the price update schedule
  fastify.get("/status", async (request, reply) => {
    try {
      // Use static ID
      const scheduleId = "price-update-schedule";

      const schedule = schedulerService.getSchedule(scheduleId);

      return {
        success: true,
        schedule,
        hasActiveSchedule: !!schedule && schedule.isActive,
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
