import { FastifyInstance } from "fastify";
import { createInvoiceController, getInvoiceController, listInvoicesController } from "../controllers/invoices.controller";

export default async function invoicesRoutes(fastify: FastifyInstance) {
  fastify.post("/", { preValidation: [fastify.authenticate as any] }, createInvoiceController);
  fastify.get("/", { preValidation: [fastify.authenticate as any] }, listInvoicesController);
  fastify.get("/:id", { preValidation: [fastify.authenticate as any] }, getInvoiceController);
}
