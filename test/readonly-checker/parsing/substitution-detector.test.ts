import { describe, it, expect } from "vitest";
import { checkSubstitutions } from "../../../src/readonly-checker/parsing/substitution-detector.js";

describe("checkSubstitutions", () => {
  it("should return null when no substitution found", () => {
    const result = checkSubstitutions("ls -la", () => ({ allowed: true }));
    expect(result).toBeNull();
  });

  it("should pass inner command to checker", () => {
    let capturedCmd = "";
    checkSubstitutions("ls $(whoami)", (cmd) => {
      capturedCmd = cmd;
      return { allowed: true };
    });
    expect(capturedCmd).toBe("whoami");
  });

  it("should return blocked result when inner command is blocked", () => {
    const result = checkSubstitutions("ls $(rm -rf /)", () => ({ allowed: false, reason: "blocked" }));
    expect(result).toEqual({ allowed: false, reason: "blocked" });
  });

  it("should allow when inner command is allowed", () => {
    const result = checkSubstitutions("ls $(whoami)", () => ({ allowed: true }));
    expect(result).toBeNull();
  });

  it("should handle backtick substitution", () => {
    let capturedCmd = "";
    checkSubstitutions("ls `whoami`", (cmd) => {
      capturedCmd = cmd;
      return { allowed: true };
    });
    expect(capturedCmd).toBe("whoami");
  });

  it("should handle multiple substitutions", () => {
    const calls: string[] = [];
    checkSubstitutions("ls $(cmd1) $(cmd2)", (cmd) => {
      calls.push(cmd);
      return { allowed: true };
    });
    expect(calls).toContain("cmd1");
    expect(calls).toContain("cmd2");
  });
});
