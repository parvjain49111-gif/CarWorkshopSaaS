import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { prisma } from "../app";

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
      const userId = request.user.userId as string;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.code(401).send({ error: "User not found" });
      // attach user object with workshop-scoped context
      request.user = { userId: user.id, role: user.role, workshopId: user.workshopId };
    } catch (err) {
      return reply.send(err);
    }
  });
}

export default fp(authPlugin, { name: "auth-plugin" });
