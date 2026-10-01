import { AppError, type ErrorCode } from "./errors.js";

export function successResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }, null, 2) }],
  };
}

export function errorResponse(message: string, code?: ErrorCode) {
  const payload =
    code === undefined
      ? { success: false, error: message }
      : { success: false, error: message, code };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError: true,
  };
}

export function formatError(err: unknown): { message: string; code?: ErrorCode } {
  if (err instanceof AppError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: String(err) };
}

type ToolResponse = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

export function handleToolCall(fn: () => ToolResponse | Promise<ToolResponse>): () => Promise<ToolResponse> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const { message, code } = formatError(err);
      return errorResponse(message, code);
    }
  };
}
