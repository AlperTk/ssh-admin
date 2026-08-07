export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HostNotFoundError extends AppError {
  constructor(alias: string) {
    super(`Host '${alias}' not found in registry`, "HOST_NOT_FOUND");
  }
}

export class SessionNotFoundError extends AppError {
  constructor(sessionId: string) {
    super(`Session '${sessionId}' not found or closed`, "SESSION_NOT_FOUND");
  }
}

export class ConnectionError extends AppError {
  constructor(alias: string, cause?: string) {
    super(cause ? `SSH connection failed for '${alias}': ${cause}` : `SSH connection failed for '${alias}'`, "CONNECTION_FAILED");
  }
}

export class ReadOnlyViolationError extends AppError {
  constructor(reason: string) {
    super(`Write operation detected: ${reason}`, "READ_ONLY_VIOLATION");
  }
}

export class CredentialError extends AppError {
  constructor(alias: string, detail: string) {
    super(`No credentials found for host '${alias}': ${detail}`, "CREDENTIAL_ERROR");
  }
}

export class DuplicateHostError extends AppError {
  constructor(alias: string) {
    super(`Host with alias '${alias}' already exists`, "DUPLICATE_HOST");
  }
}

export class InvalidUpdateError extends AppError {
  constructor(field: string) {
    super(`Cannot update '${field}' directly. Delete and re-add the server.`, "INVALID_UPDATE");
  }
}
