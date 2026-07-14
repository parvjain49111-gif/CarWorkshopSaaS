import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import { requireRoles, ROLE } from "../utils/roles";
import { nanoid } from "nanoid";

export async function createInvoiceController(req: FastifyRequest, reply: FastifyReply) {
  if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.ACCOUNTANT])) return;
  const body = req.body as any;
  if (!body.customerId || !body.jobCardId) return reply.status(422).send({ error: "Missing fields" });
  const invoiceNumber = `INV${nanoid(8)}`;
  const inv = await prisma.invoice.create({ data: { invoiceNumber, workshopId: body.workshopId || undefined, customerId: body.customerId, jobCardId: body.jobCardId, totalAmount: body.totalAmount || 0 } });
  return reply.send(inv);
}

export async function listInvoicesController(req: FastifyRequest, reply: FastifyReply) {
  const items = await prisma.invoice.findMany({ orderBy: { issueDate: "desc" }, take: 200 });
  return reply.send(items);
}

export async function getInvoiceController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return reply.status(404).send({ error: "Invoice not found" });
  return reply.send(inv);
}
