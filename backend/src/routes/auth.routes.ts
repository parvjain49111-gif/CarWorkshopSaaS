import { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendSuccess } from "../utils/response";
import { hashSync, compareSync } from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workshopName: z.string().min(3),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !compareSync(body.password, user.passwordHash)) {
      return reply.status(401).send({ success: false, error: { code: "invalid_credentials", message: "Invalid email or password" } });
    }
    const token = app.jwt.sign({ userId: user.id, role: user.role, workshopId: user.workshopId });
    return sendSuccess(reply, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ success: false, error: { code: "user_exists", message: "Email already registered" } });
    }
    const workshop = await prisma.workshop.create({ data: { name: body.workshopName, email: body.email } });
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: hashSync(body.password, 10),
        role: UserRole.OWNER,
        workshopId: workshop.id,
      },
    });
    const token = app.jwt.sign({ userId: user.id, role: user.role, workshopId: user.workshopId });
    return sendSuccess(reply, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: jwt.userId } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: "not_found", message: "User not found" } });
    }
    return sendSuccess(reply, { id: user.id, name: user.name, email: user.email, role: user.role });
  });
}
