import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

// Mock ssh2 before importing pool
vi.mock("ssh2", () => ({
  Client: class {
    on(_event: string, _cb: any) {}
    exec(_cmd: string, _opts: any, _cb: any) {}
    end = vi.fn();
    connect(_opts: any) {}
  },
}));

const mockRegistry = {
  getServer: vi.fn(),
  resolveCredentials: vi.fn(),
};

vi.mock("../src/registry.js", () => mockRegistry);

let ConnectionPool: typeof import("../src/pool.js").pool;

beforeAll(async () => {
  const module = await import("../src/pool.js");
  ConnectionPool = module.pool;
});

const createMockSession = (overrides: Partial<import("../src/pool.js").InternalSession> = {}) => {
  const base = {
    sessionId: "test-session-id",
    alias: "test-host",
    host: "192.168.1.1",
    port: 22,
    username: "testuser",
    connected: true,
    connectedAt: new Date(),
    lastUsed: new Date(),
    authConfig: { keyPath: "~/.ssh/id_rsa" },
    client: { end: vi.fn() },
    ...overrides,
  };
  return base;
};

describe("ConnectionPool", () => {
  beforeEach(() => {
    (ConnectionPool as any).sessions.clear();
    (ConnectionPool as any).hostToSession.clear();
  });
  describe("close", () => {
    it("should close an existing session", () => {
      const session = createMockSession({ sessionId: "close-test-id", host: "10.0.0.4" });
      (ConnectionPool as any).sessions.set("close-test-id", session);
      (ConnectionPool as any).hostToSession.set("10.0.0.4", "close-test-id");

      const result = ConnectionPool.close("close-test-id");
      expect(result.success).toBe(true);
      expect(result.message).toContain("closed");
      expect((ConnectionPool as any).sessions.has("close-test-id")).toBe(false);
      expect((ConnectionPool as any).hostToSession.has("10.0.0.4")).toBe(false);
    });

    it("should return failure for non-existent session", () => {
      const result = ConnectionPool.close("nonexistent");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("list", () => {
    it("should return list of active sessions", () => {
      const s1 = createMockSession({ sessionId: "s1", alias: "host1", host: "10.0.0.1" });
      const s2 = createMockSession({ sessionId: "s2", alias: "host2", host: "10.0.0.2" });
      (ConnectionPool as any).sessions.set("s1", s1);
      (ConnectionPool as any).sessions.set("s2", s2);

      const sessions = ConnectionPool.list();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe("s1");
      expect(sessions[1].sessionId).toBe("s2");
      expect(sessions[0]).toHaveProperty("alias");
      expect(sessions[0]).toHaveProperty("host");
      expect(sessions[0]).toHaveProperty("username");
      expect(sessions[0]).toHaveProperty("connectedAt");
      expect(sessions[0]).toHaveProperty("lastUsed");
    });

    it("should return empty array when no sessions", () => {
      // Clear any leftover sessions from other tests
      (ConnectionPool as any).sessions.clear();
      (ConnectionPool as any).hostToSession.clear();
      const sessions = ConnectionPool.list();
      expect(sessions).toHaveLength(0);
    });
  });

  describe("executeCommand", () => {
    it("should throw for non-existent session", async () => {
      await expect(ConnectionPool.executeCommand("ghost-session", "ls")).rejects.toThrow("not found");
    });
  });

  describe("getSessionCount", () => {
    it("should return current session count", () => {
      (ConnectionPool as any).sessions.clear();
      (ConnectionPool as any).hostToSession.clear();
      expect(ConnectionPool.getSessionCount()).toBe(0);

      const s1 = createMockSession({ sessionId: "count-s1" });
      const s2 = createMockSession({ sessionId: "count-s2" });
      (ConnectionPool as any).sessions.set("count-s1", s1);
      (ConnectionPool as any).sessions.set("count-s2", s2);

      expect(ConnectionPool.getSessionCount()).toBe(2);
    });
  });

  describe("closeAll", () => {
    it("should close all sessions and clear maps", () => {
      const s1 = createMockSession({ sessionId: "all-s1", host: "10.0.0.1" });
      const s2 = createMockSession({ sessionId: "all-s2", host: "10.0.0.2" });
      (ConnectionPool as any).sessions.set("all-s1", s1);
      (ConnectionPool as any).sessions.set("all-s2", s2);
      (ConnectionPool as any).hostToSession.set("10.0.0.1", "all-s1");
      (ConnectionPool as any).hostToSession.set("10.0.0.2", "all-s2");

      ConnectionPool.closeAll();

      expect(ConnectionPool.getSessionCount()).toBe(0);
      expect((ConnectionPool as any).hostToSession.size).toBe(0);
    });

    it("should handle empty pool gracefully", () => {
      (ConnectionPool as any).sessions.clear();
      (ConnectionPool as any).hostToSession.clear();
      expect(() => ConnectionPool.closeAll()).not.toThrow();
    });
  });

  describe("getSessionInfo", () => {
    it("should return session info for existing session", () => {
      const s1 = createMockSession({ sessionId: "info-s1", alias: "prod", host: "10.0.0.1", username: "deploy" });
      (ConnectionPool as any).sessions.set("info-s1", s1);

      const info = ConnectionPool.getSessionInfo("info-s1");
      expect(info).toEqual({ alias: "prod", host: "10.0.0.1", username: "deploy" });
    });

    it("should return null for non-existent session", () => {
      const info = ConnectionPool.getSessionInfo("ghost-session");
      expect(info).toBeNull();
    });
  });
});
