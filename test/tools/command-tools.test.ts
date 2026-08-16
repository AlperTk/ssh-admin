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

  it("should register command_execute and command_execute_raw tools", () => {
    registerCommandTool(mockServer as any, mockPool as any);

    const names = mockServer.getRegisteredNames();
    expect(names).toContain("command_execute");
    expect(names).toContain("command_execute_raw");
    expect(names).toHaveLength(2);
  });

  it("command_execute should have sessionId, command, and timeout parameters", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute");
    expect(tool).toBeDefined();
    const inputSchema = tool![1].inputSchema;
    expect(inputSchema).toHaveProperty("sessionId");
    expect(inputSchema).toHaveProperty("command");
    expect(inputSchema).toHaveProperty("timeout");
  });

  it("command_execute title should be 'Execute Command'", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute");
    expect(tool).toBeDefined();
    expect(tool![1].title).toBe("Execute Command");
  });

  it("command_execute description should mention SSH session", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute");
    expect(tool).toBeDefined();
    expect(tool![1].description).toContain("SSH session");
  });

  it("command_execute_raw should have correct title and description", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_raw");
    expect(tool).toBeDefined();
    expect(tool![1].title).toBe("Execute Command Raw");
    expect(tool![1].description).toContain("write or execute operation");
  });

  it("should not register any extra tools", () => {
    registerCommandTool(mockServer as any, mockPool as any);
    const names = mockServer.getRegisteredNames();
    expect(names).not.toContain("registry_add_server");
    expect(names).not.toContain("connection_open");
  });

  describe("command_execute_raw handler", () => {
    it("should call getSessionInfo before executing command", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_raw");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "test", host: "10.0.0.1", username: "user" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "", stderr: "", exitCode: 0, durationMs: 100 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.getSessionInfo).toHaveBeenCalledWith("test-server-550e8400");
    });

    it("should call executeCommand twice — once for changelog, once for the actual command", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_raw");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue({ alias: "prod", host: "1.2.3.4", username: "deploy" });
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0, durationMs: 50 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.executeCommand).toHaveBeenCalledTimes(2);
      const firstCall = (mockPool.executeCommand as any).mock.calls[0];
      expect(firstCall[1]).toContain("mkdir -p ~/server-info/logs");
      expect(firstCall[1]).toContain("alias=prod");
      expect(firstCall[1]).toContain("cmd='systemctl restart nginx'");
    });

    it("should not call executeCommand for changelog when sessionInfo is null", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_raw");
      const handler = tool![2];
      (mockPool.getSessionInfo as any).mockReturnValue(null);
      (mockPool.executeCommand as any).mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0, durationMs: 50 });

      await handler({ sessionId: "test-server-550e8400", command: "systemctl restart nginx" });

      expect(mockPool.executeCommand).toHaveBeenCalledTimes(1);
    });

    it("should block read-only commands and redirect to command_execute", async () => {
      registerCommandTool(mockServer as any, mockPool as any);
      const tool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "command_execute_raw");
      const handler = tool![2];

      const result = await handler({ sessionId: "test-server-550e8400", command: "ls -la" });

      expect(result).toHaveProperty("isError", true);
      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("read-only command");
      expect(parsed.error).toContain("command_execute");
    });
  });
});
