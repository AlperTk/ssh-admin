export type ErrorCode =
  | "NOT_FOUND"
  | "DUPLICATE"
  | "INVALID_INPUT"
  | "CONNECTION_FAILED"
  | "COMMAND_FAILED"
  | "TIMEOUT"
  | "READONLY_BLOCKED"
  | "INSTRUCTION_REQUIRED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
