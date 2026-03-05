import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { ConflictError, NotFoundError, WorkoutPlanNotActiveError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { CompleteWorkoutSessionBodySchema, CompleteWorkoutSessionParamsSchema, CompleteWorkoutSessionResponseSchema, ErrorSchema, GetWorkoutDayParamsSchema, GetWorkoutDayResponseSchema, GetWorkoutPlanParamsSchema, GetWorkoutPlanResponseSchema, ListWorkoutPlansQuerySchema, ListWorkoutPlansResponseSchema, StartWorkoutSessionParamsSchema, StartWorkoutSessionResponseSchema, WorkoutPlansSchema } from "../schemas/index.js";
import { CompleteWorkoutSession } from "../usecases/CompleteWorkoutSession.js";
import { CreateWorkoutPlan, CreateWorkoutPlanOutput } from "../usecases/CreateWorkoutPlan.js";
import { GetWorkoutDay } from "../usecases/GetWorkoutDay.js";
import { GetWorkoutPlan } from "../usecases/GetWorkoutPlan.js";
import { ListWorkoutPlans } from "../usecases/ListWorkoutPlans.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";

export const workoutPlansRoutes = async (fastify: FastifyInstance) => {
  // List workout plans endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "List workout plans",
      querystring: ListWorkoutPlansQuerySchema,
      response: {
        200: ListWorkoutPlansResponseSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "UNAUTHORIZED",
          });
        }

        const listWorkoutPlans = new ListWorkoutPlans();
        const result = await listWorkoutPlans.execute({
          userId: session.user.id,
          active: request.query.active,
        });

        return reply.status(200).send(result);
      } catch (error) {
        fastify.log.error(error);

        return reply.status(500).send({
          error: "Internal server error",
          message: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  // Register workout plans endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Workout Plan"],
      summary: "Create workout plan",
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

  // Get workout plan endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get a workout plan by ID",
      params: GetWorkoutPlanParamsSchema,
      response: {
        200: GetWorkoutPlanResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "UNAUTHORIZED",
          });
        }

        const getWorkoutPlan = new GetWorkoutPlan();
        const result = await getWorkoutPlan.execute({
          userId: session.user.id,
          workoutPlanId: request.params.id,
        });

        return reply.status(200).send(result);
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

  // Get workout day endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:workoutPlanId/days/:workoutDayId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Get a workout day with exercises and sessions",
      params: GetWorkoutDayParamsSchema,
      response: {
        200: GetWorkoutDayResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "UNAUTHORIZED",
          });
        }

        const getWorkoutDay = new GetWorkoutDay();
        const result = await getWorkoutDay.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
        });

        return reply.status(200).send(result);
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

  // Start workout session endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:workoutPlanId/days/:workoutDayId/sessions",
    schema: {
      tags: ["Workout Plan"],
      summary: "Start workout plan day session",
      params: StartWorkoutSessionParamsSchema,
      response: {
        201: StartWorkoutSessionResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        422: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (!session) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "UNAUTHORIZED",
          });
        }

        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
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

        if (error instanceof WorkoutPlanNotActiveError) {
          return reply.status(422).send({
            error: error.message,
            message: "WORKOUT_PLAN_NOT_ACTIVE",
          });
        }

        if (error instanceof ConflictError) {
          return reply.status(409).send({
            error: error.message,
            message: "CONFLICT",
          });
        }

        return reply.status(500).send({
          error: "Internal server error",
          message: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });

  // Complete workout session endpoint
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:workoutPlanId/days/:workoutDayId/sessions/:sessionId",
    schema: {
      tags: ["Workout Plan"],
      summary: "Complete a workout session",
      params: CompleteWorkoutSessionParamsSchema,
      body: CompleteWorkoutSessionBodySchema,
      response: {
        200: CompleteWorkoutSessionResponseSchema,
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
            message: "UNAUTHORIZED",
          });
        }

        const completeWorkoutSession = new CompleteWorkoutSession();
        const result = await completeWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: request.params.workoutPlanId,
          workoutDayId: request.params.workoutDayId,
          sessionId: request.params.sessionId,
          completedAt: request.body.completedAt,
        });

        return reply.status(200).send(result);
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
