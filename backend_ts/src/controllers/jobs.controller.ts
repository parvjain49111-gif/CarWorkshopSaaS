import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../app";
import { nanoid } from "nanoid";
import { requireRoles, ROLE } from "../utils/roles";

export async function createJobController(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as any;
  const user = (req as any).user;
  if (!user) return reply.status(401).send({ error: "Unauthorized" });
  // only owners, managers, or service advisors can create job cards
  if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.SERVICE_ADVISOR])) return;
  // Basic validation
  if (!body.customer_name || !body.car_name || !body.car_number || !body.customer_problems) {
    return reply.status(422).send({ error: "Missing fields" });
  }

  // Upsert customer and vehicle
  const workshopId = user.workshopId || "";

  const customer = await prisma.customer.upsert({
    where: { phone: body.customer_phone || "__unknown__" },
    create: { name: body.customer_name, phone: body.customer_phone || "", workshopId: workshopId },
    update: { name: body.customer_name },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { registration: body.car_number.toUpperCase() },
    create: { registration: body.car_number.toUpperCase(), model: body.model_year || null, customerId: customer.id },
    update: { model: body.model_year || undefined },
  });

  const jobCardNumber = `JC${nanoid(8)}`;
  const job = await prisma.jobCard.create({
    data: {
      jobCardNumber,
      workshopId: workshopId,
      customerId: customer.id,
      vehicleId: vehicle.id,
      registration: body.car_number.toUpperCase(),
      complaint: body.customer_problems,
      technicianNotes: body.mechanic_findings || null,
    },
  });

  return reply.send(job);
}

export async function listJobsController(req: FastifyRequest, reply: FastifyReply) {
  const q = (req.query as any)?.q;
  const status = (req.query as any)?.status;
  const where: any = {};
  if (status && status !== "all") where.vehicleStatus = status;
  if (q) where.OR = [{ registration: { contains: q, mode: "insensitive" } }, { complaint: { contains: q, mode: "insensitive" } }];
  const items = await prisma.jobCard.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  return reply.send(items);
}

export async function getJobController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const job = await prisma.jobCard.findUnique({ where: { id } });
  if (!job) return reply.status(404).send({ error: "Job not found" });
  return reply.send(job);
}

export async function updateJobController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const body = req.body as any;
  const update: any = { updatedAt: new Date() };
  // Role-sensitive updates:
  // - status changes require at least a service advisor
  if (body.status) {
    if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.SERVICE_ADVISOR, ROLE.MECHANIC])) return;
    update.vehicleStatus = body.status;
  }
  if (body.mechanic_findings) {
    // mechanics and above can set findings
    if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.SERVICE_ADVISOR, ROLE.MECHANIC])) return;
    update.technicianNotes = body.mechanic_findings;
  }
  if (typeof body.estimated_cost === "number") update.totalAmount = body.estimated_cost;
  if (Array.isArray(body.spare_parts)) {
    // create JobPartUsage entries
    const parts = body.spare_parts as any[];
    // spare parts manipulation allowed for mechanics, advisors, managers, owners
    if (!requireRoles(req, reply, [ROLE.OWNER, ROLE.MANAGER, ROLE.SERVICE_ADVISOR, ROLE.MECHANIC])) return;
    for (const p of parts) {
      await prisma.jobPartUsage.create({ data: { jobId: id, name: p.name, quantity: p.quantity || 1, unitPrice: p.price || undefined, status: p.status || "pending" } });
    }
  }
  const res = await prisma.jobCard.update({ where: { id }, data: update });
  return reply.send(res);
}

export async function deleteJobController(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id;
  const user = (req as any).user;
  if (!user || user.role !== "OWNER") return reply.status(403).send({ error: "Only owners can delete jobs" });
  try {
    await prisma.jobCard.delete({ where: { id } });
    return reply.send({ ok: true });
  } catch (e) {
    return reply.status(404).send({ error: "Job not found" });
  }
}
