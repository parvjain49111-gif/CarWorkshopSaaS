import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyJwt from "@fastify/jwt";
import sensible from "fastify-sensible";
import path from "path";
import { authPlugin } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import jobRoutes from "./routes/jobs.routes";
import { logger } from "./utils/logger";

export function buildApp() {
  const app = fastify({ logger });

  app.register(sensible);
  app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(",") || ["*"];
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  app.register(helmet);
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "supersecret-change-me",
    cookie: {
      cookieName: "workshop_token",
      signed: false,
    },
    sign: {
      expiresIn: "1h",
    },
  });

  app.register(authPlugin);
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(jobRoutes, { prefix: "/api/jobs" });

  app.get("/api/health", async () => ({ status: "ok", service: "workshop-management-backend" }));

  return app;
}
