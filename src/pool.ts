import * as crypto from "crypto";
import { Client, ClientChannel } from "ssh2";
import { SessionInfo, CommandResult } from "./types.js";
import { getServer, resolveCredentials } from "./registry.js";

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
  authConfig: { keyPath?: string; password?: string };
}

class ConnectionPool {
  private sessions = new Map<string, InternalSession>();
  private hostToSession = new Map<string, string>(); // host → sessionId (max 1 per host)

  async open(alias: string): Promise<{ sessionId: string; status: string }> {
    const hostConfig = getServer(alias);
    const credentials = resolveCredentials(alias, hostConfig);

    // Check if there's already a session for this host
    const existingSessionId = this.hostToSession.get(hostConfig.host);
    if (existingSessionId) {
      const existing = this.sessions.get(existingSessionId);
      if (existing?.connected) {
        return { sessionId: existingSessionId, status: "already_connected" };
      }
      // Stale session, clean up
      this.sessions.delete(existingSessionId);
      this.hostToSession.delete(hostConfig.host);
    }

    const sessionId = crypto.randomUUID();
    const client = new Client();

    const connectOpts: any = {
      host: hostConfig.host,
      port: hostConfig.port,
      username: hostConfig.username,
      readyTimeout: 30000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
      ...credentials,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        client.end();
        reject(new Error(`Connection to '${alias}' timed out after 30s`));
      }, 30000);

      let session: InternalSession | null = null;

      client.on("ready", () => {
        clearTimeout(timer);
        session = {
          sessionId,
          alias,
          host: hostConfig.host,
          port: hostConfig.port,
          username: hostConfig.username,
          client,
          connected: true,
          connectedAt: new Date(),
          lastUsed: new Date(),
          authConfig: credentials,
        };

        this.sessions.set(sessionId, session);
        this.hostToSession.set(hostConfig.host, sessionId);
        resolve({ sessionId, status: "connected" });
      });

      client.on("error", (err: Error) => {
        clearTimeout(timer);
        if (session) {
          session.connected = false;
          this.sessions.delete(sessionId);
        }
        this.hostToSession.delete(hostConfig.host);
        reject(new Error(`SSH connection failed for '${alias}': ${err.message}`));
      });

      client.on("close", () => {
        if (session) {
          session.connected = false;
        }
        this.sessions.delete(sessionId);
        this.hostToSession.delete(hostConfig.host);
      });

      try {
        client.connect(connectOpts);
      } catch (e: any) {
        clearTimeout(timer);
        reject(e);
      }
    });
  }

  close(sessionId: string): { success: boolean; message: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: `Session '${sessionId}' not found` };
    }

    session.client.end();
    this.sessions.delete(sessionId);
    this.hostToSession.delete(session.host);
    return { success: true, message: `Session '${sessionId}' closed` };
  }

  list(): SessionInfo[] {
    const now = new Date();
    return Array.from(this.sessions.values()).map((s) => ({
      sessionId: s.sessionId,
      alias: s.alias,
      host: s.host,
      username: s.username,
      connectedAt: s.connectedAt,
      lastUsed: s.lastUsed,
    }));
  }

  async executeCommand(
    sessionId: string,
    command: string,
    timeout: number = 60000
  ): Promise<CommandResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found or closed`);
    }

    // Update last used
    session.lastUsed = new Date();

    return new Promise((resolve, reject) => {
      const start = Date.now();

      session.client.exec(command, { env: { TERM: "xterm" } }, (err: Error | undefined, stream: any) => {
        if (err) {
          reject(new Error(`Command execution failed: ${err.message}`));
          return;
        }

        let stdout = "";
        let stderr = "";
        let exitCode: number | null = null;

        const timer = setTimeout(() => {
          stream.close();
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("exit", (code: number) => {
          exitCode = code;
          clearTimeout(timer);
          resolve({
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            exitCode: code ?? -1,
            durationMs: Date.now() - start,
          });
        });

        stream.on("close", () => {
          if (exitCode === null) {
            clearTimeout(timer);
            resolve({
              stdout: stdout.trimEnd(),
              stderr: stderr.trimEnd(),
              exitCode: 1,
              durationMs: Date.now() - start,
            });
          }
        });

        stream.on("error", (err: Error) => {
          clearTimeout(timer);
          reject(new Error(`Stream error: ${err.message}`));
        });
      });
    });
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export const pool = new ConnectionPool();
