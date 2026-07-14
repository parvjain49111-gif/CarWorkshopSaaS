import { FastifyInstance } from "fastify";
import { createCustomerController, listCustomersController, getCustomerController } from "../controllers/customers.controller";

export default async function customersRoutes(fastify: FastifyInstance) {
  fastify.post("/", { preValidation: [fastify.authenticate as any] }, createCustomerController);
  fastify.get("/", { preValidation: [fastify.authenticate as any] }, listCustomersController);
  fastify.get("/:id", { preValidation: [fastify.authenticate as any] }, getCustomerController);
}
