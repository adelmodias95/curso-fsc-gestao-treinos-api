import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { auth } from "../lib/auth.js";
import { ErrorSchema, GetUserTrainDataResponseSchema, UpsertUserTrainDataBodySchema, UserTrainDataResponseSchema } from "../schemas/index.js";
import { GetUserTrainData } from "../usecases/GetUserTrainData.js";
import { UpsertUserTrainData } from "../usecases/UpsertUserTrainData.js";

export const meRoutes = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Me"],
      summary: "Get user train data",
      response: {
        200: GetUserTrainDataResponseSchema,
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

        const getUserTrainData = new GetUserTrainData();
        const result = await getUserTrainData.execute({
          userId: session.user.id,
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

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "PUT",
    url: "/",
    schema: {
      tags: ["Me"],
      summary: "Create or update user train data",
      body: UpsertUserTrainDataBodySchema,
      response: {
        200: UserTrainDataResponseSchema,
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

        const upsertUserTrainData = new UpsertUserTrainData();
        const result = await upsertUserTrainData.execute({
          userId: session.user.id,
          weightInGrams: request.body.weightInGrams,
          heightInCentimeters: request.body.heightInCentimeters,
          age: request.body.age,
          bodyFatPercentage: request.body.bodyFatPercentage,
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
};
