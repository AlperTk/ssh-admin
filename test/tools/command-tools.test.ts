import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCommandTool } from "../../src/tools/command-tools.js";

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
});

describe("registerCommandTool", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPool = createMockPool();
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
});
