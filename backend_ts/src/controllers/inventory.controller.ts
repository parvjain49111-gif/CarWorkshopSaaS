import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import { requireRoles, ROLE } from "../utils/roles";

export async function createPartController(req: FastifyRequest, reply: FastifyReply) {
  if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.ACCOUNTANT])) return;
  const body = req.body as any;
  if (!body.partNumber || !body.name) return reply.status(422).send({ error: "Missing fields" });
  const p = await prisma.part.create({ data: { partNumber: body.partNumber, name: body.name, category: body.category || null, brand: body.brand || null, purchasePrice: body.purchasePrice || undefined, mrp: body.mrp || undefined, gstPercent: body.gstPercent || undefined, quantity: body.quantity || 0, workshopId: body.workshopId || undefined } });
  return reply.send(p);
}

export async function listPartsController(req: FastifyRequest, reply: FastifyReply) {
  const q = (req.query as any)?.q;
  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { partNumber: { contains: q } }];
  const items = await prisma.part.findMany({ where, orderBy: { name: "asc" } });
  return reply.send(items);
}

export async function getPartController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const p = await prisma.part.findUnique({ where: { id } });
  if (!p) return reply.status(404).send({ error: "Part not found" });
  return reply.send(p);
}

export async function stockMoveController(req: FastifyRequest, reply: FastifyReply) {
  if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.ACCOUNTANT])) return;
  const id = (req.params as any).id;
  const body = req.body as any;
  const qty = Number(body.quantity || 0);
  if (!qty) return reply.status(422).send({ error: "Invalid quantity" });
  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) return reply.status(404).send({ error: "Part not found" });
  const newQty = part.quantity + qty;
  if (newQty < 0) return reply.status(400).send({ error: "Insufficient stock" });
  await prisma.part.update({ where: { id }, data: { quantity: newQty } });
  // Ideally record InventoryTransaction (omitted for brevity)
  return reply.send({ ok: true, quantity: newQty });
}
