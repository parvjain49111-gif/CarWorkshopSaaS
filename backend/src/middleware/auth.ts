import { FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";

export async function authPlugin(fastify: FastifyPluginAsync) {
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
}
