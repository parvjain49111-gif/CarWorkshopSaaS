import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../repositories/prisma";
import { sendSuccess } from "../utils/response";

const createPartSchema = z.object({
  partNumber: z.string().min(1),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  oemNumber: z.string().optional(),
  name: z.string().min(1),
  category: z.string().optional(),
  brand: z.string().optional(),
  supplierId: z.string().cuid().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  mrp: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  quantity: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  warehouseLocation: z.string().optional(),
});

export default async function inventoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/parts", async (request, reply) => {
    const body = createPartSchema.parse(request.body);
    const jwt = request.user as { workshopId: string };
    const part = await prisma.part.create({
      data: {
        workshopId: jwt.workshopId,
        partNumber: body.partNumber,
        barcode: body.barcode,
        qrCode: body.qrCode,
        oemNumber: body.oemNumber,
        name: body.name,
        category: body.category,
        brand: body.brand,
        supplierId: body.supplierId,
        purchasePrice: body.purchasePrice ?? 0,
        mrp: body.mrp ?? 0,
        gstPercent: body.gstPercent ?? 18,
        quantity: body.quantity ?? 0,
        minimumStock: body.minimumStock ?? 0,
        warehouseLocation: body.warehouseLocation,
      },
    });
    return sendSuccess(reply, part);
  });

  app.get("/parts", async (request, reply) => {
    const jwt = request.user as { workshopId: string };
    const parts = await prisma.part.findMany({
      where: { workshopId: jwt.workshopId },
      orderBy: { updatedAt: "desc" },
    });
    return sendSuccess(reply, parts);
  });
}
