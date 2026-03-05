import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
// import fastifySwaggerUI from "@fastify/swagger-ui";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "./lib/auth.js";
import { aiRoutes } from "./routes/ai.js";
import { homeRoutes } from "./routes/home.js";
import { meRoutes } from "./routes/me.js";
import { statsRoutes } from "./routes/stats.js";
import { workoutPlansRoutes } from "./routes/workout-plans.js";

const fastify = Fastify({
  logger: true,
});

// Configure CORS policies
fastify.register(fastifyCors, {
  origin: "http://localhost:3000",
  credentials: true,
});

// Configure JSON schema validation and serialization
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Register Swagger documentation
await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Gestão de Treinos API",
      description: "API para gestão de treinos",
      version: "1.0.0",
    },
    servers: [{ description: "Localhost", url: "http://localhost:3000" }],
  },
  transform: jsonSchemaTransform,
});

// Register API reference endpoint
await fastify.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Bootcamp Treinos API",
        slug: "bootcamp-treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

// Register hello world endpoint
fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello World",
    tags: ["Hello World"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello World",
    };
  },
});

// Register swagger.json endpoint
fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return fastify.swagger();
  },
});

// Register authentication endpoint
fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      console.log("request => ", request.body);
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      fastify.log.error(`Authentication Error: ${error}`);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

// Routes
await fastify.register(homeRoutes, { prefix: "/home" });
await fastify.register(meRoutes, { prefix: "/me" });
await fastify.register(statsRoutes, { prefix: "/stats" });
await fastify.register(workoutPlansRoutes, { prefix: "/workout-plans" });
await fastify.register(aiRoutes, { prefix: "/ai" });

fastify.listen({ port: Number(process.env.PORT) ?? 3000 }, function (err) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
