import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaClient, PaymentStatus, VehicleStatus } from "@prisma/client";
import { sendSuccess } from "../utils/response";

const prisma = new PrismaClient();

const createJobSchema = z.object({
  customerId: z.string().cuid().optional(),
  vehicleId: z.string().cuid().optional(),
  registrationNumber: z.string().min(3),
  vin: z.string().optional(),
  odometerReading: z.number().optional(),
  assignedAdvisorId: z.string().cuid().optional(),
  assignedMechanicId: z.string().cuid().optional(),
  serviceType: z.string().min(1),
  complaintDescription: z.string().min(5),
  technicianNotes: z.string().optional(),
  labourCharges: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  vehicleStatus: z.nativeEnum(VehicleStatus).optional(),
});

const updateJobSchema = z.object({
  assignedAdvisorId: z.string().cuid().optional(),
  assignedMechanicId: z.string().cuid().optional(),
  serviceType: z.string().optional(),
  complaintDescription: z.string().optional(),
  technicianNotes: z.string().optional(),
  labourCharges: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  vehicleStatus: z.nativeEnum(VehicleStatus).optional(),
});

export default async function jobRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/", async (request, reply) => {
    const body = createJobSchema.parse(request.body);
    const jwt = request.user as { userId: string; workshopId: string };

    const customer = body.customerId
      ? await prisma.customer.findUnique({ where: { id: body.customerId } })
      : null;

    const vehicle = body.vehicleId
      ? await prisma.vehicle.findUnique({ where: { id: body.vehicleId } })
      : null;

    const jobCard = await prisma.jobCard.create({
      data: {
        jobCardNumber: `JC-${Date.now()}`,
        workshopId: jwt.workshopId,
        customerId: customer?.id ?? "",
        vehicleId: vehicle?.id ?? "",
        registrationNumber: body.registrationNumber.toUpperCase(),
        vin: body.vin,
        odometerReading: body.odometerReading,
        assignedAdvisorId: body.assignedAdvisorId,
        assignedMechanicId: body.assignedMechanicId,
        serviceType: body.serviceType,
        complaintDescription: body.complaintDescription,
        technicianNotes: body.technicianNotes,
        labourCharges: body.labourCharges ?? 0,
        gstPercent: body.gstPercent ?? 18,
        discountAmount: body.discountAmount ?? 0,
        totalAmount: body.totalAmount ?? 0,
        paymentStatus: body.paymentStatus ?? PaymentStatus.PENDING,
        vehicleStatus: body.vehicleStatus ?? VehicleStatus.VEHICLE_RECEIVED,
      },
    });

    await prisma.jobStatusHistory.create({
      data: {
        jobCardId: jobCard.id,
        status: jobCard.vehicleStatus,
        changedById: jwt.userId,
      },
    });

    return sendSuccess(reply, jobCard);
  });

  app.get("/", async (request, reply) => {
    const jwt = request.user as { workshopId: string };
    const jobs = await prisma.jobCard.findMany({
      where: { workshopId: jwt.workshopId },
      orderBy: { createdAt: "desc" },
      include: { customer: true, vehicle: true },
    });
    return sendSuccess(reply, jobs);
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const jwt = request.user as { workshopId: string };
    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId: jwt.workshopId },
      include: { customer: true, vehicle: true, statuses: true, parts: true },
    });
    if (!job) {
      return reply.status(404).send({ success: false, error: { code: "not_found", message: "Job card not found" } });
    }
    return sendSuccess(reply, job);
  });

  app.patch("/:id", async (request, reply) => {
    const body = updateJobSchema.parse(request.body);
    const { id } = request.params as { id: string };
    const jwt = request.user as { workshopId: string; userId: string };

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId: jwt.workshopId } });
    if (!job) {
      return reply.status(404).send({ success: false, error: { code: "not_found", message: "Job card not found" } });
    }

    const updated = await prisma.jobCard.update({ where: { id }, data: body });
    if (body.vehicleStatus) {
      await prisma.jobStatusHistory.create({
        data: {
          jobCardId: id,
          status: body.vehicleStatus,
          changedById: jwt.userId,
        },
      });
    }
    return sendSuccess(reply, updated);
  });
}
