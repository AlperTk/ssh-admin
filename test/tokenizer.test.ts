import { describe, it, expect } from "vitest";
import { tokenize, getFirstToken } from "../src/tokenizer.js";

describe("tokenizer", () => {
  describe("tokenize", () => {
    it("should tokenize a simple command with space separator", () => {
      expect(tokenize("ls -la", { separators: [" "] })).toEqual(["ls", "-la"]);
    });

    it("should preserve double-quoted strings as a single token (quotes retained)", () => {
      expect(tokenize('echo "hello world"', { separators: [" "] })).toEqual(["echo", '"hello world"']);
    });

    it("should preserve single-quoted strings as a single token (quotes retained)", () => {
      expect(tokenize("echo 'hello world'", { separators: [" "] })).toEqual(["echo", "'hello world'"]);
    });

    it("should handle mixed double and single quotes (quotes retained)", () => {
      expect(tokenize("echo \"hello\" 'world'", { separators: [" "] })).toEqual(["echo", '"hello"', "'world'"]);
    });

    it("should keep depth chars (subshells) as a single token", () => {
      expect(
        tokenize("(cmd)", { separators: [" "], depthChar: { open: "(", close: ")" } })
      ).toEqual(["(cmd)"]);
    });

    it("should not split inside depth chars", () => {
      expect(
        tokenize("(cmd | grep foo)", {
          separators: ["|", " "],
          depthChar: { open: "(", close: ")" },
        })
      ).toEqual(["(cmd | grep foo)"]);
    });

    it("should handle pipe separators", () => {
      expect(tokenize("ls | grep foo", { separators: ["|", " "] })).toEqual(["ls", "grep", "foo"]);
    });

    it("should return an empty array for an empty string", () => {
      expect(tokenize("", { separators: [" "] })).toEqual([]);
    });

    it("should return an empty array for whitespace-only input", () => {
      expect(tokenize("   ", { separators: [" "] })).toEqual([]);
    });

    it("should handle leading whitespace", () => {
      expect(tokenize("  ls -la", { separators: [" "] })).toEqual(["ls", "-la"]);
    });

    it("should handle tabs as separators", () => {
      expect(tokenize("ls\t-la", { separators: ["\t", " "] })).toEqual(["ls", "-la"]);
    });

    it("should handle multiple consecutive spaces", () => {
      expect(tokenize("ls   -la", { separators: [" "] })).toEqual(["ls", "-la"]);
    });

    it("should handle secondary depth chars (braces)", () => {
      expect(
        tokenize("cmd { inner }", {
          separators: [" "],
          secondaryDepthChar: { open: "{", close: "}" },
        })
      ).toEqual(["cmd", "{ inner }"]);
    });

    it("should handle multiple tokens with various options (separators skipped, quotes retained)", () => {
      expect(
        tokenize("echo \"hi\" 'there' && true", {
          separators: ["&&", " "],
        })
      ).toEqual(["echo", '"hi"', "'there'", "true"]);
    });
  });

  describe("getFirstToken", () => {
    it("should return the first token from a simple command", () => {
      expect(getFirstToken("ls -la")).toBe("ls");
    });

    it("should return the first token when followed by a single-quoted string", () => {
      expect(getFirstToken("echo 'hello'")).toBe("echo");
    });

    it("should return the first token when followed by a double-quoted string", () => {
      expect(getFirstToken('echo "hello world"')).toBe("echo");
    });

    it("should return an empty string for an empty input", () => {
      expect(getFirstToken("")).toBe("");
    });

    it("should return empty string for leading whitespace", () => {
      expect(getFirstToken("  ls -la")).toBe("");
    });

    it("should return empty string for leading tabs", () => {
      expect(getFirstToken("\tls -la")).toBe("");
    });

    it("should return empty string for multiple leading spaces", () => {
      expect(getFirstToken("   ls")).toBe("");
    });

    it("should stop at semicolons", () => {
      expect(getFirstToken("cmd1; cmd2")).toBe("cmd1");
    });

    it("should return the entire string when there is no separator", () => {
      expect(getFirstToken("singleword")).toBe("singleword");
    });

    it("should handle a string that is only whitespace", () => {
      expect(getFirstToken("   ")).toBe("");
    });
  });
});
