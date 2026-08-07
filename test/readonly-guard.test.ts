import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setReadonlyMode, resetReadonlyMode, requireWrite, isReadonlyMode } from "../src/readonly-guard.js";

describe("readonly-guard", () => {
  const originalEnv = process.env.MCP_SSH_READONLY;

  beforeEach(() => {
    resetReadonlyMode();
    delete process.env.MCP_SSH_READONLY;
  });

  afterEach(() => {
    resetReadonlyMode();
    if (originalEnv !== undefined) {
      process.env.MCP_SSH_READONLY = originalEnv;
    } else {
      delete process.env.MCP_SSH_READONLY;
    }
  });

  describe("requireWrite", () => {
    it("should return null when not in readonly mode", () => {
      const result = requireWrite();
      expect(result).toBeNull();
    });

    it("should return error response when in readonly mode via env", () => {
      process.env.MCP_SSH_READONLY = "true";
      const result = requireWrite();
      expect(result).not.toBeNull();
      expect(result?.isError).toBe(true);
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Readonly mode is enabled");
    });

    it("should respect override parameter (true blocks)", () => {
      const result = requireWrite(true);
      expect(result).not.toBeNull();
      expect(result?.isError).toBe(true);
    });

    it("should respect override parameter (false allows even in readonly env)", () => {
      process.env.MCP_SSH_READONLY = "true";
      const result = requireWrite(false);
      expect(result).toBeNull();
    });

    it("should allow writes by default (env not set)", () => {
      delete process.env.MCP_SSH_READONLY;
      const result = requireWrite();
      expect(result).toBeNull();
    });

    it("should not allow non-true env values", () => {
      process.env.MCP_SSH_READONLY = "false";
      const result = requireWrite();
      expect(result).toBeNull();
    });

    it("should not allow non-true env values (e.g. '1')", () => {
      process.env.MCP_SSH_READONLY = "1";
      const result = requireWrite();
      expect(result).toBeNull();
    });
  });

  describe("isReadonlyMode", () => {
    it("should return false when not in readonly mode", () => {
      expect(isReadonlyMode()).toBe(false);
    });

    it("should return true when in readonly mode via env", () => {
      process.env.MCP_SSH_READONLY = "true";
      expect(isReadonlyMode()).toBe(true);
    });

    it("should respect override parameter (true)", () => {
      expect(isReadonlyMode(true)).toBe(true);
    });

    it("should respect override parameter (false)", () => {
      process.env.MCP_SSH_READONLY = "true";
      expect(isReadonlyMode(false)).toBe(false);
    });

    it("should return false for non-true env values", () => {
      process.env.MCP_SSH_READONLY = "false";
      expect(isReadonlyMode()).toBe(false);
    });
  });

  describe("setReadonlyMode / resetReadonlyMode", () => {
    it("should set readonly mode via setReadonlyMode", () => {
      setReadonlyMode(true);
      expect(isReadonlyMode()).toBe(true);
      expect(requireWrite()).not.toBeNull();
    });

    it("should unset readonly mode via setReadonlyMode(false)", () => {
      process.env.MCP_SSH_READONLY = "true";
      setReadonlyMode(false);
      expect(isReadonlyMode()).toBe(false);
      expect(requireWrite()).toBeNull();
    });

    it("should reset to env-based behavior after resetReadonlyMode", () => {
      setReadonlyMode(false);
      expect(isReadonlyMode()).toBe(false);
      resetReadonlyMode();
      process.env.MCP_SSH_READONLY = "true";
      expect(isReadonlyMode()).toBe(true);
    });

    it("should allow re-setting after reset", () => {
      setReadonlyMode(true);
      resetReadonlyMode();
      setReadonlyMode(true);
      expect(isReadonlyMode()).toBe(true);
    });

    it("should use override over setReadonlyMode value", () => {
      setReadonlyMode(true);
      expect(isReadonlyMode(false)).toBe(false);
      expect(isReadonlyMode(true)).toBe(true);
    });
  });
});
