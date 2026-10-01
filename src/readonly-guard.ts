import { errorResponse } from "./response.js";

let _readonlyModeOverride: boolean | null = null;

function getReadonlyMode(): boolean {
  if (_readonlyModeOverride !== null) return _readonlyModeOverride;
  return process.env.MCP_SSH_READONLY === "true";
}

export function setReadonlyMode(readonly: boolean): void {
  _readonlyModeOverride = readonly;
}

export function resetReadonlyMode(): void {
  _readonlyModeOverride = null;
}

export function requireWrite(override?: boolean): ReturnType<typeof errorResponse> | null {
  const readonly = override ?? getReadonlyMode();
  if (readonly) {
    return errorResponse("Readonly mode is enabled. Write operations are not allowed.");
  }
  return null;
}

export function isReadonlyMode(override?: boolean): boolean {
  return override ?? getReadonlyMode();
}

export function logReadonlyMode(): void {
  if (isReadonlyMode()) {
    console.error("[MCP-SSH] Readonly mode ENABLED - write operations will be blocked");
  } else {
    console.error("[MCP-SSH] Readonly mode DISABLED - all operations allowed");
  }
}
