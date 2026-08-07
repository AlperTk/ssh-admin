import { AppError } from "./errors.js";

export function successResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }, null, 2) }],
  };
}

export function errorResponse(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }) }],
    isError: true,
  };
}

export function formatError(err: unknown): { message: string; code: string } {
  if (err instanceof AppError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof Error) {
    return { message: err.message, code: "UNKNOWN_ERROR" };
  }
  return { message: String(err), code: "UNKNOWN_ERROR" };
}
