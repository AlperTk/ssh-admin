import * as crypto from "crypto";
import { Client, ClientChannel, ConnectConfig, ExecOptions } from "ssh2";
import { SessionInfo, CommandResult } from "./types.js";
import { getServer, resolveCredentials } from "./registry.js";
import { AppError } from "./errors.js";
import { DEFAULT_COMMAND_TIMEOUT_MS, DEFAULT_CONNECTION_TIMEOUT_MS } from "./constants.js";

interface InternalSession {
  sessionId: string;
  alias: string;
  host: string;
  port: number;
  username: string;
  client: Client;
  connected: boolean;
  connectedAt: Date;
  lastUsed: Date;
  authConfig: { keyPath?: string; hasPassword: boolean };
}

interface OpenContext {
  client: Client;
  alias: string;
  sessionId: string;
  hostConfig: ReturnType<typeof getServer>;
  timeout: number;
  hasPassword: boolean;
  timer: ReturnType<typeof setTimeout>;
  session: InternalSession | null;
  resolve: (result: { sessionId: string; status: string; verified: boolean }) => void;
  reject: (error: Error) => void;
}

interface CommandStreamState {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class ConnectionPool {
  private sessions = new Map<string, InternalSession>();
  private hostToSession = new Map<string, string>(); // host → sessionId (max 1 per host)

  async open(alias: string, timeout: number = DEFAULT_CONNECTION_TIMEOUT_MS): Promise<{ sessionId: string; status: string; verified: boolean }> {
    const hostConfig = getServer(alias);
    const credentials = resolveCredentials(alias, hostConfig);

    const existingSessionId = this.getReusableSessionId(hostConfig.host);
    if (existingSessionId) {
      return { sessionId: existingSessionId, status: "already_connected", verified: true };
    }

    const sessionId = `${alias}-${crypto.randomUUID().slice(0, 8)}`;
    const client = new Client();
    const { options: connectOpts, hasPassword } = this.buildConnectOptions(hostConfig, credentials, timeout);

    return new Promise((resolve, reject) => {
      const ctx = this.createOpenContext(client, alias, sessionId, hostConfig, timeout, hasPassword, resolve, reject);
      this.attachReadyHandler(ctx);
      this.attachErrorHandler(ctx);
      this.attachCloseHandler(ctx);
      this.startConnection(ctx, connectOpts);
    });
  }

  private getReusableSessionId(host: string): string | null {
    const existingSessionId = this.hostToSession.get(host);
    if (!existingSessionId) {
      return null;
    }
    const existing = this.sessions.get(existingSessionId);
    if (existing?.connected) {
      return existingSessionId;
    }
    // Stale session, clean up
    this.sessions.delete(existingSessionId);
    this.hostToSession.delete(host);
    return null;
  }

  private buildConnectOptions(
    hostConfig: ReturnType<typeof getServer>,
    credentials: ReturnType<typeof resolveCredentials>,
    timeout: number
  ): { options: ConnectConfig; hasPassword: boolean } {
    const options: ConnectConfig = {
      host: hostConfig.host,
      port: hostConfig.port,
      username: hostConfig.username,
      readyTimeout: timeout,
      keepaliveInterval: Math.max(10000, timeout / 3),
      keepaliveCountMax: 10,
      ...(hostConfig.forceIPv4 && { forceIPv4: true }),
    };

    if (hostConfig.authMethod === "key" && credentials.key) {
      options.privateKey = credentials.key;
    }
    const hasPassword = !!credentials.password;
    if (credentials.password) {
      options.password = credentials.password;
      credentials.password = undefined;
    }
    return { options, hasPassword };
  }

  private createOpenContext(
    client: Client,
    alias: string,
    sessionId: string,
    hostConfig: ReturnType<typeof getServer>,
    timeout: number,
    hasPassword: boolean,
    resolve: (result: { sessionId: string; status: string; verified: boolean }) => void,
    reject: (error: Error) => void
  ): OpenContext {
    const timer = setTimeout(() => {
      client.end();
      reject(new AppError(`Connection to '${alias}' timed out after ${timeout / 1000}s`, "TIMEOUT"));
    }, timeout);
    return {
      client,
      alias,
      sessionId,
      hostConfig,
      timeout,
      hasPassword,
      timer,
      session: null,
      resolve,
      reject,
    };
  }

  private attachReadyHandler(ctx: OpenContext): void {
    const { client, alias, timeout, timer } = ctx;
    client.on("ready", () => {
      clearTimeout(timer);
      const verifyTimer = setTimeout(() => {
        client.end();
        ctx.reject(new AppError(`Connection verification timed out after ${Math.max(30, timeout / 1000)}s for '${alias}'`, "TIMEOUT"));
      }, Math.max(30000, timeout));

      const sentinel = `__SSH_ADMIN_VERIFY_${crypto.randomUUID()}__`;
      client.exec(`echo ${sentinel}`, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          clearTimeout(verifyTimer);
          client.end();
          ctx.reject(new AppError(`Connection verification failed for '${alias}': ${err.message}`, "CONNECTION_FAILED"));
          return;
        }
        this.handleVerificationStream(ctx, stream, verifyTimer, sentinel);
      });
    });
  }

  private handleVerificationStream(ctx: OpenContext, stream: ClientChannel, verifyTimer: ReturnType<typeof setTimeout>, sentinel: string): void {
    const { client, alias, sessionId } = ctx;
    let output = "";
    stream.on("data", (data: Buffer) => {
      output += data.toString();
    });

    stream.on("close", () => {
      clearTimeout(verifyTimer);
      if (output.includes(sentinel)) {
        this.storeSession(ctx);
        ctx.resolve({ sessionId, status: "connected", verified: true });
      } else {
        client.end();
        ctx.reject(new AppError(`Connection verification failed for '${alias}': unexpected response '${output.trim()}'`, "CONNECTION_FAILED"));
      }
    });

    stream.on("error", (err: Error) => {
      clearTimeout(verifyTimer);
      client.end();
      ctx.reject(new AppError(`Connection verification stream error for '${alias}': ${err.message}`, "CONNECTION_FAILED"));
    });
  }

  private storeSession(ctx: OpenContext): void {
    const { sessionId, alias, hostConfig, hasPassword, client } = ctx;
    const session: InternalSession = {
      sessionId,
      alias,
      host: hostConfig.host,
      port: hostConfig.port,
      username: hostConfig.username,
      client,
      connected: true,
      connectedAt: new Date(),
      lastUsed: new Date(),
      authConfig: { keyPath: hostConfig.keyPath, hasPassword },
    };
    ctx.session = session;
    this.sessions.set(sessionId, session);
    this.hostToSession.set(hostConfig.host, sessionId);
  }

  private attachErrorHandler(ctx: OpenContext): void {
    const { client, alias, sessionId, hostConfig, timer } = ctx;
    client.on("error", (err: Error) => {
      clearTimeout(timer);
      if (ctx.session) {
        ctx.session.connected = false;
        this.sessions.delete(sessionId);
      }
      this.hostToSession.delete(hostConfig.host);
      ctx.reject(new AppError(`SSH connection failed for '${alias}': ${err.message}`, "CONNECTION_FAILED"));
    });
  }

  private attachCloseHandler(ctx: OpenContext): void {
    const { client, sessionId, hostConfig } = ctx;
    client.on("close", () => {
      if (ctx.session) {
        ctx.session.connected = false;
      }
      this.sessions.delete(sessionId);
      this.hostToSession.delete(hostConfig.host);
    });
  }

  private startConnection(ctx: OpenContext, connectOpts: ConnectConfig): void {
    try {
      ctx.client.connect(connectOpts);
    } catch (e: unknown) {
      clearTimeout(ctx.timer);
      const message = e instanceof Error ? e.message : String(e);
      ctx.reject(new AppError(`Connection failed: ${message}`, "CONNECTION_FAILED"));
    }
  }

  close(sessionId: string): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: `Session '${sessionId}' not found` };
    }

    const host = session.host;
    this.hostToSession.delete(host);
    this.sessions.delete(sessionId);
    session.client.end();
    return { success: true, message: `Session '${sessionId}' closed` };
  }

  private toSessionInfo(s: InternalSession): SessionInfo {
    return {
      sessionId: s.sessionId,
      alias: s.alias,
      host: s.host,
      username: s.username,
      connectedAt: s.connectedAt,
      lastUsed: s.lastUsed,
    };
  }

  list(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => this.toSessionInfo(s));
  }

  async executeCommand(
    sessionId: string,
    command: string,
    timeout: number = DEFAULT_COMMAND_TIMEOUT_MS
  ): Promise<CommandResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AppError(`Session '${sessionId}' not found or closed. Try calling pool.open() again to establish a new connection.`, "NOT_FOUND");
    }

    // Update last used
    session.lastUsed = new Date();

    return new Promise((resolve, reject) => {
      const start = Date.now();
      try {
        session.client.exec(command, { env: { TERM: "xterm" } } as ExecOptions, (err: Error | undefined, stream: ClientChannel) => {
          if (err) {
            reject(new AppError(`Command execution failed: ${err.message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`, "COMMAND_FAILED"));
            return;
          }
          this.wireStreamEvents(stream, start, timeout, resolve, reject);
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        reject(new AppError(`Command execution failed: ${message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`, "COMMAND_FAILED"));
      }
    });
  }

  private wireStreamEvents(
    stream: ClientChannel,
    start: number,
    timeout: number,
    resolve: (result: CommandResult) => void,
    reject: (error: Error) => void
  ): void {
    const state: CommandStreamState = { stdout: "", stderr: "", exitCode: null };
    const timer = setTimeout(() => {
      stream.close();
      reject(new AppError(`Command timed out after ${timeout}ms`, "TIMEOUT"));
    }, timeout);

    stream.on("data", (data: Buffer) => {
      state.stdout += data.toString();
    });
    if (stream.stderr) {
      stream.stderr.on("data", (data: Buffer) => {
        state.stderr += data.toString();
      });
    }

    stream.on("exit", (code: number) => {
      state.exitCode = code;
      clearTimeout(timer);
      resolve(this.buildResult(state.stdout, state.stderr, code ?? -1, start));
    });
    stream.on("close", () => {
      if (state.exitCode === null) {
        clearTimeout(timer);
        resolve(this.buildResult(state.stdout, state.stderr, 1, start));
      }
    });
    stream.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(new AppError(`Stream error: ${err.message}`, "COMMAND_FAILED"));
    });
  }

  private buildResult(stdout: string, stderr: string, exitCode: number, start: number): CommandResult {
    return {
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      exitCode,
      durationMs: Date.now() - start,
    };
  }

  getSessionInfo(sessionId: string): SessionInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    return this.toSessionInfo(session);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  closeAll(): void {
    for (const session of this.sessions.values()) {
      try {
        session.client.end();
      } catch {
        // ignore errors during shutdown
      }
    }
    this.sessions.clear();
    this.hostToSession.clear();
  }
}

export const pool = new ConnectionPool();
