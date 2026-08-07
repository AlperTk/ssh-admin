export interface HostConfig {
  alias: string;
  host: string;
  port: number;
  username: string;
  authMethod: "key" | "password";
  keyPath?: string;
  // Never store passwords in the registry — use env vars
}

export interface ServerInfo {
  alias: string;
  host: string;
  port: number;
  username: string;
  authMethod: "key" | "password";
}

export interface SessionInfo {
  sessionId: string;
  alias: string;
  host: string;
  username: string;
  connectedAt: Date;
  lastUsed: Date;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface ServerRegistry {
  hosts: HostConfig[];
}
