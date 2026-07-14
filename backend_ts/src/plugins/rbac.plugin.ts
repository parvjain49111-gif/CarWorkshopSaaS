import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

async function rbacPlugin(fastify: FastifyInstance) {
  fastify.decorate("authorize", function (roles: string[] | string) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return async function (request: any, reply: any) {
      const user = request.user;
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      if (!allowed.includes(user.role)) return reply.code(403).send({ error: "Forbidden" });
      return;
    };
  });
}

export default fp(rbacPlugin, { name: "rbac-plugin" });
