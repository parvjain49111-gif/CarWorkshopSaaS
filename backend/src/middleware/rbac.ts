import { FastifyReply, FastifyRequest } from "fastify";
import { UserRole } from "@prisma/client";

export function requireRole(role: UserRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role: UserRole } | undefined;
    if (!user || user.role !== role) {
      reply.status(403).send({ success: false, error: { code: "forbidden", message: "Insufficient permissions" } });
    }
  };
}

export function requireRoles(roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role: UserRole } | undefined;
    if (!user || !roles.includes(user.role)) {
      reply.status(403).send({ success: false, error: { code: "forbidden", message: "Insufficient permissions" } });
    }
  };
}
