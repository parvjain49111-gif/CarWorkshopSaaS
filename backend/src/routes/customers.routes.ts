import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../repositories/prisma";
import { sendSuccess } from "../utils/response";

const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

export default async function customerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/", async (request, reply) => {
    const body = createCustomerSchema.parse(request.body);
    const jwt = request.user as { workshopId: string };
    const customer = await prisma.customer.create({
      data: {
        workshopId: jwt.workshopId,
        name: body.name,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        email: body.email,
        address: body.address,
        gstNumber: body.gstNumber,
        notes: body.notes,
      },
    });
    return sendSuccess(reply, customer);
  });

  app.get("/", async (request, reply) => {
    const jwt = request.user as { workshopId: string };
    const customers = await prisma.customer.findMany({
      where: { workshopId: jwt.workshopId },
      orderBy: { updatedAt: "desc" },
    });
    return sendSuccess(reply, customers);
  });
}
