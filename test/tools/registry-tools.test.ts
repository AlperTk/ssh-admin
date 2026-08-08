import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerRegistryTools } from "../../src/tools/registry-tools.js";
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

describe("registerRegistryTools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPool: ReturnType<typeof createMockPool>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPool = createMockPool();
    resetInstructionCalled();
    setInstructionCalled();
  });

  it("should register all 5 registry tools", () => {
    registerRegistryTools(mockServer as any, mockPool as any);

    const names = mockServer.getRegisteredNames();
    expect(names).toContain("registry_add_server");
    expect(names).toContain("registry_list_servers");
    expect(names).toContain("registry_get_server");
    expect(names).toContain("registry_update_server");
    expect(names).toContain("registry_delete_server");
    expect(names).toHaveLength(5);
  });

  it("should call registerTool for write operations (add, update, delete)", () => {
    registerRegistryTools(mockServer as any, mockPool as any);

    expect(mockServer.registerTool).toHaveBeenCalledWith("registry_add_server", expect.any(Object), expect.any(Function));
    expect(mockServer.registerTool).toHaveBeenCalledWith("registry_update_server", expect.any(Object), expect.any(Function));
    expect(mockServer.registerTool).toHaveBeenCalledWith("registry_delete_server", expect.any(Object), expect.any(Function));
  });

  it("should call tool for list and registerTool for get", () => {
    registerRegistryTools(mockServer as any, mockPool as any);

    expect(mockServer.tool).toHaveBeenCalledWith("registry_list_servers", expect.stringContaining("List"), expect.any(Function));
    expect(mockServer.registerTool).toHaveBeenCalledWith("registry_get_server", expect.any(Object), expect.any(Function));
  });

  it("registry_add_server should have correct input schema fields", () => {
    registerRegistryTools(mockServer as any, mockPool as any);
    const addTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "registry_add_server");
    expect(addTool).toBeDefined();
    const inputSchema = addTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("alias");
    expect(inputSchema).toHaveProperty("host");
    expect(inputSchema).toHaveProperty("port");
    expect(inputSchema).toHaveProperty("username");
    expect(inputSchema).toHaveProperty("authMethod");
    expect(inputSchema).toHaveProperty("keyPath");
  });

  it("registry_get_server should require alias parameter", () => {
    registerRegistryTools(mockServer as any, mockPool as any);
    const getTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "registry_get_server");
    expect(getTool).toBeDefined();
    const inputSchema = getTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("alias");
  });

  it("registry_update_server should have optional update fields", () => {
    registerRegistryTools(mockServer as any, mockPool as any);
    const updateTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "registry_update_server");
    expect(updateTool).toBeDefined();
    const inputSchema = updateTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("alias");
    expect(inputSchema).toHaveProperty("username");
    expect(inputSchema).toHaveProperty("authMethod");
    expect(inputSchema).toHaveProperty("keyPath");
  });

  it("registry_delete_server should require alias parameter", () => {
    registerRegistryTools(mockServer as any, mockPool as any);
    const deleteTool = mockServer.registerTool.mock.calls.find((c: any[]) => c[0] === "registry_delete_server");
    expect(deleteTool).toBeDefined();
    const inputSchema = deleteTool![1].inputSchema;
    expect(inputSchema).toHaveProperty("alias");
  });

  it("should not register any extra tools", () => {
    registerRegistryTools(mockServer as any, mockPool as any);
    const names = mockServer.getRegisteredNames();
    expect(names).not.toContain("connection_open");
    expect(names).not.toContain("command_execute");
  });
});
