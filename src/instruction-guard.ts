import { errorResponse } from "./response.js";

let _instructionCalled = false;

export function setInstructionCalled(): void {
  _instructionCalled = true;
}

export function isInstructionCalled(): boolean {
  return _instructionCalled;
}

export function resetInstructionCalled(): void {
  _instructionCalled = false;
}

export function requireInstruction(): ReturnType<typeof errorResponse> | null {
  if (!_instructionCalled) {
    return errorResponse("Please call the 'instruction' tool first to receive system instructions.");
  }
  return null;
}
