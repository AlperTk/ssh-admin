import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCommandTool } from "../../src/tools/command-tools.js";
import { setInstructionCalled, resetInstructionCalled } from "../../src/instruction-guard.js";

const createMockServer = () => {
  const registeredTools = new Map<string, { schema: unknown; handler: Function }>();
  return {
    registeredTools,
    registerTool: vi.fn((name: string, schema: unknown, handler: Function) => {
      registeredTools.set(name, { schema, handler });
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

describe("registerCommandTool", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPool = createMockPool();
    resetInstructionCalled();
    setInstructionCalled();
  });

  it("should register command_execute_read and command_execute_write tools", () => {
    registerCommandTool(mockServer as any, mockPool as any);

    const names = mockServer.getRegisteredNames();
    expect(names).toContain("command_execute_read");
    expect(names).toContain("command_execute_write");
    expect(names).toHaveLength(2);
  });

  it("command_execute_read should have sessionId, command, and timeout parameters", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_read");
    expect(tool).toBeDefined();
    const inputSchema = tool![1].inputSchema;
    expect(inputSchema).toHaveProperty("sessionId");
    expect(inputSchema).toHaveProperty("command");
    expect(inputSchema).toHaveProperty("timeout");
  });

  it("command_execute_read title should be 'Execute Command'", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_read");
    expect(tool).toBeDefined();
    expect(tool![1].title).toBe("Execute Command");
  });

  it("command_execute_read description should mention SSH session", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_read");
    expect(tool).toBeDefined();
    expect(tool![1].description).toContain("SSH session");
  });

  it("command_execute_write should have correct title and description", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_write");
    expect(tool).toBeDefined();
    expect(tool![1].title).toBe("Execute Write Command");
    expect(tool![1].description).toContain("modifies the system");
  });

  it("should not register any extra tools", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const names = mockServer.getRegisteredNames();
    expect(names).not.toContain("registry_add_server");
    expect(names).not.toContain("connection_open");
  });

  describe("command_execute_write handler", () => {
    it("should call getSessionInfo before executing command", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_write");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "test", host: "10.0.0.1", username: "user" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "", stderr: "", exitCode: 0, durationMs: 100 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.getSessionInfo).toHaveBeenCalledWith("test-server-550e8400");
    });

    it("should call executeCommand twice — once for changelog, once for the actual command", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_write");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "prod", host: "1.2.3.4", username: "deploy" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0, durationMs: 50 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.executeCommand).toHaveBeenCalledTimes(2);
      // The first call is the actual command; the audit runs after it resolves.
      const [firstSession, firstCmd] = (mockPool.executeCommand as any).mock.calls[0];
      expect(firstSession).toBe("test-server-550e8400");
      expect(firstCmd).toBe("systemctl restart nginx");
      const [, changelogCmd] = (mockPool.executeCommand as any).mock.calls[1];
      expect(changelogCmd).toContain("mkdir -p ~/server-info/logs");
      expect(changelogCmd).toContain("alias=prod");
      expect(changelogCmd).toContain("cmd='systemctl restart nginx'");
    });

    it("should not call executeCommand for changelog when sessionInfo is null", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_write");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue(null);
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0, durationMs: 50 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.executeCommand).toHaveBeenCalledTimes(1);
    });

    it("should block read-only commands and redirect to command_execute_read", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_write");
      const handler = tool![2];

      const result = await handler({ sessionId: "test-server-550e8400", command: "ls -la" });

      expect(result).toHaveProperty("isError", true);
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("read-only command");
      expect(parsed.error).toContain("command_execute_read");
    });
  });
});
