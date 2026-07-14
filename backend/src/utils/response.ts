import { FastifyReply } from "fastify";

export function sendSuccess(reply: FastifyReply, data: unknown) {
  return reply.status(200).send({ success: true, data });
}

export function sendError(reply: FastifyReply, message: string, code = "error") {
  return reply.status(400).send({ success: false, error: { code, message } });
}
