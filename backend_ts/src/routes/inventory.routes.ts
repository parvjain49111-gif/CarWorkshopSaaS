import { FastifyInstance } from "fastify";
import { createPartController, listPartsController, getPartController, stockMoveController } from "../controllers/inventory.controller";

export default async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.post("/", { preValidation: [fastify.authenticate as any] }, createPartController);
  fastify.get("/", { preValidation: [fastify.authenticate as any] }, listPartsController);
  fastify.get("/:id", { preValidation: [fastify.authenticate as any] }, getPartController);
  fastify.post("/:id/stock-move", { preValidation: [fastify.authenticate as any] }, stockMoveController);
}
