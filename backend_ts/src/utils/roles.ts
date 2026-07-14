import { FastifyReply, FastifyRequest } from "fastify";

export const ROLE = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  SERVICE_ADVISOR: "SERVICE_ADVISOR",
  MECHANIC: "MECHANIC",
  ACCOUNTANT: "ACCOUNTANT",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export function requireRoles(req: FastifyRequest, reply: FastifyReply, allowed: Role[] | Role) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  const user = (req as any).user;
  if (!user) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  if (!roles.includes(user.role)) {
    reply.code(403).send({ error: "Forbidden" });
    return false;
  }
  return true;
}

export function hasRole(req: FastifyRequest, role: Role) {
  const user = (req as any).user;
  return !!user && user.role === role;
}
