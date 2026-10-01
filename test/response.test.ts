import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, formatError, handleToolCall } from "../src/response.js";
import { AppError } from "../src/errors.js";

describe("successResponse", () => {
  it("should return a success response with data", () => {
    const result = successResponse({ key: "value" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ key: "value" });
  });

  it("should serialize null data", () => {
    const result = successResponse(null);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toBeNull();
  });

  it("should serialize array data", () => {
    const result = successResponse([1, 2, 3]);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data).toEqual([1, 2, 3]);
  });

  it("should not have isError flag", () => {
    const result = successResponse({});
    expect(result.isError).toBeUndefined();
  });
});

describe("errorResponse", () => {
  it("should return an error response with message", () => {
    const result = errorResponse("something went wrong");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe("something went wrong");
  });

  it("should have isError flag set to true", () => {
    const result = errorResponse("fail");
    expect(result.isError).toBe(true);
  });

  it("should handle empty message", () => {
    const result = errorResponse("");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("");
  });

  it("should handle special characters in message", () => {
    const msg = 'quote " and backslash \\ and newline\n';
    const result = errorResponse(msg);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe(msg);
  });

  it("should include code in payload when provided", () => {
    const result = errorResponse("not found", "NOT_FOUND");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe("not found");
    expect(parsed.code).toBe("NOT_FOUND");
  });

  it("should omit code field when not provided", () => {
    const result = errorResponse("no code");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBeUndefined();
  });
});

describe("formatError", () => {
  it("should extract message and code from AppError subclass", () => {
    const err = new AppError("Host 'myhost' not found in registry", "NOT_FOUND");
    const result = formatError(err);
    expect(result.message).toBe("Host 'myhost' not found in registry");
    expect(result.code).toBe("NOT_FOUND");
  });

  it("should extract message and code from generic AppError", () => {
    const err = new AppError("SSH connection failed for 'server1': timeout", "CONNECTION_FAILED");
    const result = formatError(err);
    expect(result.message).toBe("SSH connection failed for 'server1': timeout");
    expect(result.code).toBe("CONNECTION_FAILED");
  });

  it("should extract message and code from credential AppError", () => {
    const err = new AppError("No credentials found for host 'server1': no password", "INVALID_INPUT");
    const result = formatError(err);
    expect(result.message).toBe("No credentials found for host 'server1': no password");
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("should extract message and code from custom AppError", () => {
    const err = new AppError("custom error", "DUPLICATE");
    const result = formatError(err);
    expect(result.message).toBe("custom error");
    expect(result.code).toBe("DUPLICATE");
  });

  it("should default to INTERNAL_ERROR when no code is provided", () => {
    const err = new AppError("something broke");
    const result = formatError(err);
    expect(result.message).toBe("something broke");
    expect(result.code).toBe("INTERNAL_ERROR");
  });

  it("should omit code for plain Error", () => {
    const err = new Error("plain error");
    const result = formatError(err);
    expect(result.message).toBe("plain error");
    expect(result.code).toBeUndefined();
  });

  it("should convert non-Error values to string", () => {
    const result = formatError("string error");
    expect(result.message).toBe("string error");
    expect(result.code).toBeUndefined();
  });

  it("should handle number input", () => {
    const result = formatError(42);
    expect(result.message).toBe("42");
    expect(result.code).toBeUndefined();
  });

  it("should handle object input", () => {
    const obj = { foo: "bar" };
    const result = formatError(obj);
    expect(result.message).toBe("[object Object]");
    expect(result.code).toBeUndefined();
  });

  it("should handle undefined input", () => {
    const result = formatError(undefined);
    expect(result.message).toBe("undefined");
    expect(result.code).toBeUndefined();
  });

  it("should handle null input", () => {
    const result = formatError(null);
    expect(result.message).toBe("null");
    expect(result.code).toBeUndefined();
  });
});

describe("handleToolCall", () => {
  it("should pass through a sync handler's return value", async () => {
    const data = { key: "value" };
    const handler = handleToolCall(() => successResponse(data));
    const result = await handler();
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(data);
  });

  it("should pass through an async handler's return value", async () => {
    const data = { id: 42 };
    const handler = handleToolCall(async () => successResponse(data));
    const result = await handler();
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual(data);
  });

  it("should return errorResponse shape when handler throws a plain Error", async () => {
    const handler = handleToolCall(() => {
      throw new Error("something broke");
    });
    const result = await handler();
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe("something broke");
    expect(parsed.code).toBeUndefined();
  });

  it("should include code in response when handler throws AppError", async () => {
    const handler = handleToolCall(() => {
      throw new AppError("Host 'myhost' not found", "NOT_FOUND");
    });
    const result = await handler();
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe("Host 'myhost' not found");
    expect(parsed.code).toBe("NOT_FOUND");
  });

  it("should handle non-Error thrown values", async () => {
    const handler = handleToolCall(() => {
      throw "string failure";
    });
    const result = await handler();
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("string failure");
  });
});
