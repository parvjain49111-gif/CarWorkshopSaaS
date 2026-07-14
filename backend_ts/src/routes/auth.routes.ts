import { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerController, loginController, meController } from "../controllers/auth.controller";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", async (req, reply) => {
    const body = z
      .object({ name: z.string(), email: z.string().email(), password: z.string().min(6) })
      .parse(req.body);
    return registerController({ ...body }, req, reply);
  });

  fastify.post("/login", async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    return loginController(body, req, reply);
  });

  // Token refresh (rotating refresh tokens)
  fastify.post("/refresh", async (req, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(req.body);
    return (fastify as any).refreshController
      ? (fastify as any).refreshController(body, req, reply)
      : reply.status(501).send({ error: "Not implemented" });
  });

  fastify.post("/logout", { preValidation: [fastify.authenticate as any] }, async (req, reply) => {
    return (fastify as any).logoutController
      ? (fastify as any).logoutController(req, reply)
      : reply.status(501).send({ error: "Not implemented" });
  });

  fastify.get("/me", { preValidation: [fastify.authenticate as any] }, async (req, reply) => {
    return meController(req, reply);
  });
}
