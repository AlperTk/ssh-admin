import { describe, it, expect } from "vitest";
import { resolveCommand, getFirstToken } from "../../../src/readonly-checker/resolution/command-resolver.js";

describe("getFirstToken", () => {
  it("should extract first token", () => {
    expect(getFirstToken("ls -la")).toBe("ls");
    expect(getFirstToken("git status")).toBe("git");
    expect(getFirstToken("sudo rm file.txt")).toBe("sudo");
  });
  it("should respect single quotes", () => {
    expect(getFirstToken("'hello world'")).toBe("hello world");
  });
  it("should respect double quotes", () => {
    expect(getFirstToken('"hello world"')).toBe('hello world');
  });
});

describe("resolveCommand", () => {
  describe("sudo peel-through", () => {
    it("should resolve sudo to target command", () => {
      expect(resolveCommand("sudo rm file.txt")).toBe("rm");
      expect(resolveCommand("sudo -n whoami")).toBe("whoami");
      expect(resolveCommand("sudo -n -S whoami")).toBe("whoami");
    });
    it("should resolve sudo with multiple flags", () => {
      expect(resolveCommand("sudo --whoami")).toBe("--whoami");
    });
  });

  describe("su peel-through", () => {
    it("should resolve su -c to target command", () => {
      expect(resolveCommand("su -c 'id'")).toBe("id");
      expect(resolveCommand("su -c 'rm file.txt'")).toBe("rm");
    });
  });

  describe("ssh peel-through", () => {
    it("should resolve ssh host to target command", () => {
      expect(resolveCommand("ssh user@host")).toBe("ssh");
      expect(resolveCommand("ssh user@host ls")).toBe("ls");
      expect(resolveCommand("ssh user@host rm /tmp/file")).toBe("rm");
    });
    it("should handle quoted host", () => {
      expect(resolveCommand("ssh 'user@host'")).toBe("ssh");
      expect(resolveCommand("ssh 'user@host' ls")).toBe("ls");
    });
  });

  describe("non-resolvable commands", () => {
    it("should return first token for non-resolvable commands", () => {
      expect(resolveCommand("ls -la")).toBe("ls");
      expect(resolveCommand("cat file.txt")).toBe("cat");
    });
  });
});
