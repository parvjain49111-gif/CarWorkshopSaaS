import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

const ACCESS_EXPIRES = "15m";
const REFRESH_DAYS = 30;

export async function registerController(payload: any, req: FastifyRequest, reply: FastifyReply) {
  const { name, email, password } = payload;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return reply.status(409).send({ error: "Email already registered" });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash: hash } });
  return { user: { id: user.id, email: user.email, name: user.name } };
}

export async function loginController(payload: any, req: FastifyRequest, reply: FastifyReply) {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.status(401).send({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return reply.status(401).send({ error: "Invalid credentials" });
  const accessToken = (req as any).server.jwt.sign({ userId: user.id, role: user.role, workshopId: user.workshopId }, { expiresIn: ACCESS_EXPIRES });

  // create refresh token
  const refreshToken = nanoid(48);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function refreshController(payload: any, req: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = payload;
  const rec = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!rec || rec.revoked) return reply.status(401).send({ error: "Invalid refresh token" });
  if (rec.expiresAt < new Date()) return reply.status(401).send({ error: "Refresh token expired" });
  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) return reply.status(401).send({ error: "User not found" });

  // rotate
  await prisma.refreshToken.update({ where: { id: rec.id }, data: { revoked: true } });
  const newToken = nanoid(48);
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: newToken, userId: user.id, expiresAt } });

  const accessToken = (req as any).server.jwt.sign({ userId: user.id, role: user.role, workshopId: user.workshopId }, { expiresIn: ACCESS_EXPIRES });
  return { accessToken, refreshToken: newToken };
}

export async function logoutController(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user;
  if (!user) return reply.status(401).send({ error: "Unauthorized" });
  // revoke all tokens for user
  await prisma.refreshToken.updateMany({ where: { userId: user.userId }, data: { revoked: true } });
  return { ok: true };
}

export async function meController(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req as any).user?.userId;
  if (!userId) return reply.status(401).send({ error: "Unauthorized" });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, workshopId: true } });
  if (!user) return reply.status(404).send({ error: "User not found" });
  return user;
}
