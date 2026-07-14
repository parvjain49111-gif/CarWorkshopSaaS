import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError, ZodTypeAny } from "zod";

export function validateBody<T extends ZodTypeAny>(schema: T, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.format();
    const message = formatZodErrors(result.error);
    throw new Error(message);
  }
  return result.data;
}

function formatZodErrors(error: ZodError) {
  return error.errors.map((item) => item.message).join("; ");
}

export function validationErrorHandler(request: FastifyRequest, reply: FastifyReply, error: Error) {
  if (error instanceof ZodError) {
    reply.status(422).send({ success: false, error: { code: "validation_error", message: formatZodErrors(error) } });
    return;
  }
  reply.status(400).send({ success: false, error: { code: "invalid_request", message: error.message } });
}
