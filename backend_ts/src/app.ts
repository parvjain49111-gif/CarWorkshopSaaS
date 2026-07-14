import Fastify from "fastify";
import cors from "fastify-cors";
import fastifyJwt from "fastify-jwt";
import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import jobsRoutes from "./routes/jobs.routes";
import authPlugin from "./plugins/auth.plugin";
import * as authController from "./controllers/auth.controller";
import customersRoutes from "./routes/customers.routes";
import inventoryRoutes from "./routes/inventory.routes";
import invoicesRoutes from "./routes/invoices.routes";
import rbacPlugin from "./plugins/rbac.plugin";

dotenv.config();

export const prisma = new PrismaClient();

export function buildApp() {
  const app = Fastify({ logger });

  app.register(cors, { origin: process.env.CORS_ORIGINS || "*" });

  app.register(fastifyJwt, { secret: process.env.JWT_SECRET || "dev-secret" });

  // Health
  app.get("/api/", async () => ({ status: "ok", service: "workshopops" }));

  // auth plugin (adds `authenticate` decorator)
  app.register(authPlugin);
  app.register(rbacPlugin);

  // Register domain routes
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(jobsRoutes, { prefix: "/api/jobs" });
  app.register(customersRoutes, { prefix: "/api/customers" });
  app.register(inventoryRoutes, { prefix: "/api/inventory" });
  app.register(invoicesRoutes, { prefix: "/api/invoices" });

  // attach controllers for route delegations that need access to closures
  (app as any).refreshController = authController.refreshController;
  (app as any).logoutController = authController.logoutController;

  // graceful shutdown
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
