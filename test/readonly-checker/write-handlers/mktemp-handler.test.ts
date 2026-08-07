import { describe, it, expect } from "vitest";
import { mktempHasWriteArg } from "../../../src/readonly-checker/write-handlers/mktemp-handler.js";

describe("mktempHasWriteArg", () => {
  it("should always return true (mktemp creates files)", () => {
    expect(mktempHasWriteArg()).toBe(true);
  });
});
