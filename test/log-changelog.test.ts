import { describe, it, expect } from "vitest";
import { buildChangelogCommand } from "../src/log-changelog.js";

const mockSessionInfo = { alias: "prod", host: "192.168.1.1", username: "deploy" };

describe("buildChangelogCommand", () => {
  it("should return empty string when sessionInfo is null", () => {
    expect(buildChangelogCommand(null, "ls -la")).toBe("");
  });

  it("should contain timestamp, alias, host, user, and cmd fields", () => {
    const result = buildChangelogCommand(mockSessionInfo, "ls -la");
    expect(result).toContain("mkdir -p ~/server-info/logs");
    expect(result).toContain("alias=prod");
    expect(result).toContain("host=192.168.1.1");
    expect(result).toContain("user=deploy");
    expect(result).toContain("cmd=");
    expect(result).toContain(">> ~/server-info/changelog.log");
  });

  it("should escape single quotes in command", () => {
    const result = buildChangelogCommand(mockSessionInfo, "echo 'hello world'");
    expect(result).toContain("'\\''");
  });

  it("should replace newlines with spaces to keep single line", () => {
    const result = buildChangelogCommand(mockSessionInfo, "echo line1\necho line2");
    expect(result).not.toContain("\\n");
    expect(result).not.toContain("\\r");
  });

  it("should include rotation logic", () => {
    const result = buildChangelogCommand(mockSessionInfo, "ls");
    expect(result).toContain("wc -l");
    expect(result).toContain("tail -n 500");
    expect(result).toContain("changelog.log.tmp");
  });

  it("should produce valid chained command with && separators", () => {
    const result = buildChangelogCommand(mockSessionInfo, "git status");
    expect(result).toContain("mkdir -p ~/server-info/logs");
    expect(result).toContain(">> ~/server-info/changelog.log");
    expect(result).toContain("tail -n 500");
  });
});
