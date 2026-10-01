import { describe, it, expect, beforeEach } from "vitest";
import {
  requireInstruction,
  setInstructionCalled,
  resetInstructionCalled,
  isInstructionCalled,
} from "../src/instruction-guard.js";

describe("instruction-guard", () => {
  beforeEach(() => {
    resetInstructionCalled();
  });

  describe("requireInstruction", () => {
    it("should return an error response when no instruction has been set", () => {
      const result = requireInstruction();
      expect(result).not.toBeNull();
      expect(result?.isError).toBe(true);
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("instruction");
    });

    it("should return null when the instruction has been set", () => {
      setInstructionCalled();
      const result = requireInstruction();
      expect(result).toBeNull();
    });

    it("should block again after reset", () => {
      setInstructionCalled();
      expect(requireInstruction()).toBeNull();
      resetInstructionCalled();
      expect(requireInstruction()).not.toBeNull();
    });

    it("should allow re-setting after reset", () => {
      setInstructionCalled();
      resetInstructionCalled();
      setInstructionCalled();
      expect(requireInstruction()).toBeNull();
    });
  });

  describe("isInstructionCalled", () => {
    it("should return false when no instruction has been set", () => {
      expect(isInstructionCalled()).toBe(false);
    });

    it("should return true after setInstructionCalled", () => {
      setInstructionCalled();
      expect(isInstructionCalled()).toBe(true);
    });

    it("should return false after resetInstructionCalled", () => {
      setInstructionCalled();
      expect(isInstructionCalled()).toBe(true);
      resetInstructionCalled();
      expect(isInstructionCalled()).toBe(false);
    });
  });
});
