import { errorResponse } from "./response.js";

const READONLY_MODE = process.env.MCP_SSH_READONLY === "true";

export function requireWrite(): ReturnType<typeof errorResponse> | null {
  if (READONLY_MODE) {
    return errorResponse("Readonly mode is enabled. Write operations are not allowed.");
  }
  return null;
}

export function isReadonlyMode(): boolean {
  return READONLY_MODE;
}
