import { FastifyInstance } from "fastify";
import { createJobController, listJobsController, getJobController, updateJobController, deleteJobController } from "../controllers/jobs.controller";

export default async function jobsRoutes(fastify: FastifyInstance) {
  const ownerOnly = fastify.authorize(["OWNER"] as any);
  fastify.post("/", { preValidation: [fastify.authenticate as any] }, createJobController);
  fastify.get("/", { preValidation: [fastify.authenticate as any] }, listJobsController);
  fastify.get("/:id", { preValidation: [fastify.authenticate as any] }, getJobController);
  fastify.patch("/:id", { preValidation: [fastify.authenticate as any] }, updateJobController);
  fastify.delete("/:id", { preValidation: [fastify.authenticate as any, ownerOnly] }, deleteJobController);
}
