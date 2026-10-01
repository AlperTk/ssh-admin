// Single source of truth for timing-related constants.

/** Default timeout (ms) for remote command execution. */
export const DEFAULT_COMMAND_TIMEOUT_MS = 60_000;

/** Default timeout (ms) for opening an SSH connection. */
export const DEFAULT_CONNECTION_TIMEOUT_MS = 5_000;

/** Timeout (ms) for the changelog audit command issued after write operations. */
export const AUDIT_COMMAND_TIMEOUT_MS = 5_000;
