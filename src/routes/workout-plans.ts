import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, WorkoutPlansSchema } from "../schemas/index.js";
import { CreateWorkoutPlan, CreateWorkoutPlanOutput } from "../usecases/CreateWorkoutPlan.js";

export const workoutPlansRoutes = async (fastify: FastifyInstance) => {
  // Register workout plans endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      body: WorkoutPlansSchema.omit({ id: true }),
      response: {
        201: WorkoutPlansSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Unauthorized",
          });
        }
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result: CreateWorkoutPlanOutput = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: request.body.name,
          workoutDays: request.body.workoutDays,
        });
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);

        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: error.message,
            message: "NOT_FOUND",
          });
        }

        return reply.status(500).send({
          error: "Internal server error",
          message: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
