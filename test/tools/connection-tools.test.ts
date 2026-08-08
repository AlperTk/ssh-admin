import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerConnectionTools } from "../../src/tools/connection-tools.js";
import { setInstructionCalled, resetInstructionCalled } from "../../src/instruction-guard.js";

const createMockServer = () => {
  const registeredTools = new Map<string, { schema: unknown; handler: Function }>();
  return {
    registeredTools,
    registerTool: vi.fn((name: string, schema: unknown, handler: Function) => {
      registeredTools.set(name, { schema, handler });
    }),
    tool: vi.fn((name: string, description: string, handler: Function) => {
      registeredTools.set(name, { schema: undefined, handler });
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

describe("registerConnectionTools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPool = createMockPool();
    resetInstructionCalled();
    setInstructionCalled();
  });

  it("should register all 3 connection tools", () => {
    registerConnectionTools(mockServer as any, mockPool as any);

    const names = mockServer.getRegisteredNames();
    expect(names).toContain("connection_open");
    expect(names).toContain("connection_close");
    expect(names).toContain("connection_list");
    expect(names).toHaveLength(3);
  });

  it("connection_open should have alias and timeout parameters", () => {
    registerConnectionTools(mockServer as any, mockPool as any);
    const openTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "connection_open");
    expect(openTool).toBeDefined();
    const inputSchema = openTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("alias");
    expect(inputSchema).toHaveProperty("timeout");
  });

  it("connection_close should require sessionId parameter", () => {
    registerConnectionTools(mockServer as any, mockPool as any);
    const closeTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "connection_close");
    expect(closeTool).toBeDefined();
    const inputSchema = closeTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("sessionId");
  });

  it("connection_list should be registered via tool() (no schema)", () => {
    registerConnectionTools(mockServer as any, mockPool as any);
    expect(mockServer.tool).toHaveBeenCalledWith(
      "connection_list",
      expect.stringContaining("active"),
      expect.any(Function)
    );
  });

  it("should not register any extra tools", () => {
    registerConnectionTools(mockServer as any, mockPool as any);
    const names = mockServer.getRegisteredNames();
    expect(names).not.toContain("registry_add_server");
    expect(names).not.toContain("command_execute");
  });
});
