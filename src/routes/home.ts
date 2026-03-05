import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { NotFoundError } from "../errors/index.js";
import { auth } from "../lib/auth.js";
import { ErrorSchema, HomeParamsSchema, HomeResponseSchema } from "../schemas/index.js";
import { GetHomeData } from "../usecases/GetHomeData.js";

export const homeRoutes = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home page data for a specific date",
      params: HomeParamsSchema,
      response: {
        200: HomeResponseSchema,
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

        const getHomeData = new GetHomeData();
        const result = await getHomeData.execute({
          userId: session.user.id,
          date: request.params.date,
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
