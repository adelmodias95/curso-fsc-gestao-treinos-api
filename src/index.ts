import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async () => {
  return { hello: "world" };
});

fastify.listen({ port: Number(process.env.PORT) ?? 3000 }, function (err) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
