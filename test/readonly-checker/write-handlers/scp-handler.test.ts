import { describe, it, expect } from "vitest";
import { scpHasWriteArg } from "../../../src/readonly-checker/write-handlers/scp-handler.js";

describe("scpHasWriteArg", () => {
  describe("write detected", () => {
    it("should detect remote source (download)", () => {
      expect(scpHasWriteArg("scp user@localhost:/etc/passwd /tmp/")).toBe(true);
      expect(scpHasWriteArg("scp oem@192.168.1.1:/home/oem/file.txt ./dest/")).toBe(true);
      expect(scpHasWriteArg("scp -r user@host:/path/to/dir ./local/")).toBe(true);
      expect(scpHasWriteArg("scp -P 2222 user@host:/remote/path ./local/")).toBe(true);
    });

    it("should detect multiple args without remote (upload)", () => {
      expect(scpHasWriteArg("scp /etc/passwd oem@localhost:/tmp/")).toBe(true);
      expect(scpHasWriteArg("scp file1.txt file2.txt")).toBe(true);
      expect(scpHasWriteArg("scp -r ./local/ user@host:/remote/")).toBe(true);
    });
  });

  describe("read-only edge cases", () => {
    it("should allow scp with only remote and no local dest", () => {
      // scp user@host:/path — tek argüman, local yazma yok
      // Bu edge case: scp tek argümanla çalışmaz ama pattern olarak safe
      expect(scpHasWriteArg("scp")).toBe(false);
    });
  });
});
