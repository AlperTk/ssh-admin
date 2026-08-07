import { describe, it, expect } from "vitest";
import { extractLoopBody } from "../../../src/readonly-checker/parsing/loop-extractor.js";

describe("extractLoopBody", () => {
  describe("for loop extraction", () => {
    it("should extract for var body", () => {
      const result = extractLoopBody("for user in $(cut -f1 -d: /etc/passwd); do crontab -l -u \"$user\"; done");
      expect(result).toContain("crontab -l -u");
    });
    it("should extract for f in glob body", () => {
      const result = extractLoopBody("for f in *.txt; do grep 'pattern' \"$f\"; done");
      expect(result).toContain("grep 'pattern'");
    });
    it("should extract for i in seq body", () => {
      const result = extractLoopBody("for i in 1 2 3; do echo $i; done");
      expect(result).toContain("echo $i");
    });
    it("should handle for with explicit do", () => {
      const result = extractLoopBody("for f in /var/spool/cron/crontabs/*; do cat \"$f\"; done");
      expect(result).toContain("cat");
    });
  });

  describe("while loop extraction", () => {
    it("should extract while body", () => {
      const result = extractLoopBody("while true; do echo hello; done");
      expect(result).toContain("echo hello");
    });
    it("should extract while true body", () => {
      const result = extractLoopBody("while true; do uptime; sleep 1; done");
      expect(result).toContain("uptime");
      expect(result).toContain("sleep 1");
    });
  });

  describe("non-loop input", () => {
    it("should return null for non-loop commands", () => {
      expect(extractLoopBody("ls -la")).toBeNull();
      expect(extractLoopBody("cat file.txt")).toBeNull();
      expect(extractLoopBody("grep pattern file.txt")).toBeNull();
    });
  });
});
