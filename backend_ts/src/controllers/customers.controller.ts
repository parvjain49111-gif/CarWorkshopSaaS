import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import { requireRoles, ROLE } from "../utils/roles";

export async function createCustomerController(req: FastifyRequest, reply: FastifyReply) {
  if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.SERVICE_ADVISOR])) return;
  const body = req.body as any;
  if (!body.name || !body.phone) return reply.status(422).send({ error: "Missing fields" });
  const customer = await prisma.customer.create({ data: { name: body.name, phone: body.phone, altPhone: body.altPhone || null, email: body.email || null, address: body.address || null, workshopId: body.workshopId || undefined } });
  return reply.send(customer);
}

export async function listCustomersController(req: FastifyRequest, reply: FastifyReply) {
  const q = (req.query as any)?.q;
  const where: any = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }];
  const items = await prisma.customer.findMany({ where, take: 200, orderBy: { createdAt: "desc" } });
  return reply.send(items);
}

export async function getCustomerController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const cust = await prisma.customer.findUnique({ where: { id }, include: { vehicles: true } });
  if (!cust) return reply.status(404).send({ error: "Customer not found" });
  return reply.send(cust);
}
