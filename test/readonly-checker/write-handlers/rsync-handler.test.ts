import { describe, it, expect } from "vitest";
import { rsyncHasWriteArg } from "../../../src/readonly-checker/write-handlers/rsync-handler.js";

describe("rsyncHasWriteArg", () => {
  it("should always return true (rsync is always write)", () => {
    expect(rsyncHasWriteArg()).toBe(true);
  });
});
