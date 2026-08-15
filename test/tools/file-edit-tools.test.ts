import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerFileEditTool } from "../../src/tools/file-edit-tools.js";
import { setInstructionCalled, resetInstructionCalled } from "../../src/instruction-guard.js";

const SESSION_ID = "test-server-550e8400-e29b-41d4-a716-446655440000";

const createMockServer = () => {
  const registeredTools = new Map<string, { config: unknown; handler: Function }>();
  return {
    registeredTools,
    registerTool: vi.fn((name: string, config: unknown, handler: Function) => {
      registeredTools.set(name, { config, handler });
    }),
    getRegisteredNames: () => Array.from(registeredTools.keys()),
  };
};

const createMockPool = () => ({
  open: vi.fn(),
  close: vi.fn(),
  list: vi.fn(),
  executeCommand: vi.fn(),
  getSessionCount: vi.fn(),
  getSessionInfo: vi.fn(),
});

const APPLY_ENVELOPE = [
  "__FILEEDIT_COUNT__ 1",
  "__FILEEDIT_BACKUP__ /tmp/tmp.aBc123/nginx.conf.20260815T191905Z",
  "__FILEEDIT_DIFF__",
  "-listen 80;",
  "+listen 8080;",
  "__FILEEDIT_END__",
].join("\n");

describe("registerFileEditTool", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPool = createMockPool();
    resetInstructionCalled();
    setInstructionCalled();
  });

  const getHandler = (): Function => {
    registerFileEditTool(mockServer as any, mockPool as any);
    const entry = mockServer.registeredTools.get("file_edit");
    return entry!.handler;
  };

  it("registers the file_edit tool", () => {
    registerFileEditTool(mockServer as any, mockPool as any);
    expect(mockServer.getRegisteredNames()).toContain("file_edit");
  });

  it("has title and a description mentioning targeted edit", () => {
    registerFileEditTool(mockServer as any, mockPool as any);
    const config = mockServer.registeredTools.get("file_edit")!.config as any;
    expect(config.title).toBe("Edit File");
    expect(config.description).toContain("targeted edit");
  });

  it("exposes the expected input schema fields", () => {
    registerFileEditTool(mockServer as any, mockPool as any);
    const config = mockServer.registeredTools.get("file_edit")!.config as any;
    for (const field of ["sessionId", "path", "mode", "find", "replace", "all", "startLine", "endLine", "dryRun", "timeout"]) {
      expect(config.inputSchema).toHaveProperty(field);
    }
  });

  describe("handler", () => {
    it("blocks when the instruction tool has not been called", async () => {
      resetInstructionCalled();
      const handler = getHandler();
      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "replace", find: "a", replace: "b" });
      expect(result).toHaveProperty("isError", true);
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.error).toContain("instruction");
    });

    it("rejects an invalid sessionId format", async () => {
      const handler = getHandler();
      const result = await handler({ sessionId: "no-uuid-here", path: "/x", mode: "replace", find: "a", replace: "b" });
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Invalid sessionId");
    });

    it("rejects replace mode without a non-empty find", async () => {
      const handler = getHandler();
      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "replace", find: "", replace: "b" });
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("'find' is required");
    });

    it("rejects a multi-line find (steers to range mode)", async () => {
      const handler = getHandler();
      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "replace", find: "a\nb", replace: "c" });
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("single line");
    });

    it("rejects range mode missing startLine/endLine", async () => {
      const handler = getHandler();
      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "range", replace: "new" });
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("startLine");
    });

    it("rejects range mode when endLine < startLine", async () => {
      const handler = getHandler();
      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "range", startLine: 10, endLine: 5, replace: "new" });
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("endLine' must be >= 'startLine");
    });

    it("returns success with parsed data on apply", async () => {
      const handler = getHandler();
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "prod", host: "1.2.3.4", username: "deploy" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: APPLY_ENVELOPE, stderr: "", exitCode: 0, durationMs: 40 });

      const result = await handler({ sessionId: SESSION_ID, path: "/etc/nginx/nginx.conf", mode: "replace", find: "listen 80;", replace: "listen 8080;" });

      expect(result).not.toHaveProperty("isError");
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(true);
      expect(parsed.data.changed).toBe(true);
      expect(parsed.data.count).toBe(1);
      expect(parsed.data.backup).toContain("/tmp/");
      expect(parsed.data.backup).toContain("nginx.conf.");
      expect(parsed.data.diff).toContain("+listen 8080;");
    });

    it("surfaces a logical error from the envelope", async () => {
      const handler = getHandler();
      (mockPool.getSessionInfo as any).mockReturnValue(null);
      (mockPool.executeCommand as any).mockResolvedValue({
        stdout: "__FILEEDIT_COUNT__ 0\n__FILEEDIT_ERROR__ No match found for the given 'find' in /x. Nothing changed.",
        stderr: "",
        exitCode: 0,
        durationMs: 10,
      });

      const result = await handler({ sessionId: SESSION_ID, path: "/x", mode: "replace", find: "missing", replace: "b" });
      expect(result).toHaveProperty("isError", true);
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("No match found");
    });

    it("logs to the changelog before running the edit when sessionInfo exists", async () => {
      const handler = getHandler();
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "prod", host: "1.2.3.4", username: "deploy" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: APPLY_ENVELOPE, stderr: "", exitCode: 0, durationMs: 40 });

      await handler({ sessionId: SESSION_ID, path: "/etc/nginx/nginx.conf", mode: "replace", find: "listen 80;", replace: "listen 8080;" });

      expect(mockPool.executeCommand).toHaveBeenCalledTimes(2);
      const [changelogSession, changelogCmd] = (mockPool.executeCommand as any).mock.calls[0];
      expect(changelogSession).toBe(SESSION_ID);
      expect(changelogCmd).toContain("mkdir -p ~/server-info/logs");
      expect(changelogCmd).toContain("file_edit(replace)");
      // The second call is the actual edit command.
      const [, editCmd] = (mockPool.executeCommand as any).mock.calls[1];
      expect(editCmd).toContain("base64 -d");
    });
  });
});
