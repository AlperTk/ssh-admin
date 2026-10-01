import * as crypto from "crypto";
import { Client } from "ssh2";
import { getServer, resolveCredentials } from "./registry.js";
import { AppError } from "./errors.js";
import { DEFAULT_COMMAND_TIMEOUT_MS, DEFAULT_CONNECTION_TIMEOUT_MS } from "./constants.js";
export class ConnectionPool {
    sessions = new Map();
    hostToSession = new Map(); // host → sessionId (max 1 per host)
    async open(alias, timeout = DEFAULT_CONNECTION_TIMEOUT_MS) {
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
    getReusableSessionId(host) {
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
    buildConnectOptions(hostConfig, credentials, timeout) {
        const options = {
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
    createOpenContext(client, alias, sessionId, hostConfig, timeout, hasPassword, resolve, reject) {
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
    attachReadyHandler(ctx) {
        const { client, alias, timeout, timer } = ctx;
        client.on("ready", () => {
            clearTimeout(timer);
            const verifyTimer = setTimeout(() => {
                client.end();
                ctx.reject(new AppError(`Connection verification timed out after ${Math.max(30, timeout / 1000)}s for '${alias}'`, "TIMEOUT"));
            }, Math.max(30000, timeout));
            const sentinel = `__SSH_ADMIN_VERIFY_${crypto.randomUUID()}__`;
            client.exec(`echo ${sentinel}`, (err, stream) => {
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
    handleVerificationStream(ctx, stream, verifyTimer, sentinel) {
        const { client, alias, sessionId } = ctx;
        let output = "";
        stream.on("data", (data) => {
            output += data.toString();
        });
        stream.on("close", () => {
            clearTimeout(verifyTimer);
            if (output.includes(sentinel)) {
                this.storeSession(ctx);
                ctx.resolve({ sessionId, status: "connected", verified: true });
            }
            else {
                client.end();
                ctx.reject(new AppError(`Connection verification failed for '${alias}': unexpected response '${output.trim()}'`, "CONNECTION_FAILED"));
            }
        });
        stream.on("error", (err) => {
            clearTimeout(verifyTimer);
            client.end();
            ctx.reject(new AppError(`Connection verification stream error for '${alias}': ${err.message}`, "CONNECTION_FAILED"));
        });
    }
    storeSession(ctx) {
        const { sessionId, alias, hostConfig, hasPassword, client } = ctx;
        const session = {
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
    attachErrorHandler(ctx) {
        const { client, alias, sessionId, hostConfig, timer } = ctx;
        client.on("error", (err) => {
            clearTimeout(timer);
            if (ctx.session) {
                ctx.session.connected = false;
                this.sessions.delete(sessionId);
            }
            this.hostToSession.delete(hostConfig.host);
            ctx.reject(new AppError(`SSH connection failed for '${alias}': ${err.message}`, "CONNECTION_FAILED"));
        });
    }
    attachCloseHandler(ctx) {
        const { client, sessionId, hostConfig } = ctx;
        client.on("close", () => {
            if (ctx.session) {
                ctx.session.connected = false;
            }
            this.sessions.delete(sessionId);
            this.hostToSession.delete(hostConfig.host);
        });
    }
    startConnection(ctx, connectOpts) {
        try {
            ctx.client.connect(connectOpts);
        }
        catch (e) {
            clearTimeout(ctx.timer);
            const message = e instanceof Error ? e.message : String(e);
            ctx.reject(new AppError(`Connection failed: ${message}`, "CONNECTION_FAILED"));
        }
    }
    close(sessionId) {
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
    toSessionInfo(s) {
        return {
            sessionId: s.sessionId,
            alias: s.alias,
            host: s.host,
            username: s.username,
            connectedAt: s.connectedAt,
            lastUsed: s.lastUsed,
        };
    }
    list() {
        return Array.from(this.sessions.values()).map((s) => this.toSessionInfo(s));
    }
    async executeCommand(sessionId, command, timeout = DEFAULT_COMMAND_TIMEOUT_MS) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new AppError(`Session '${sessionId}' not found or closed. Try calling pool.open() again to establish a new connection.`, "NOT_FOUND");
        }
        // Update last used
        session.lastUsed = new Date();
        return new Promise((resolve, reject) => {
            const start = Date.now();
            try {
                session.client.exec(command, { env: { TERM: "xterm" } }, (err, stream) => {
                    if (err) {
                        reject(new AppError(`Command execution failed: ${err.message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`, "COMMAND_FAILED"));
                        return;
                    }
                    this.wireStreamEvents(stream, start, timeout, resolve, reject);
                });
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                reject(new AppError(`Command execution failed: ${message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`, "COMMAND_FAILED"));
            }
        });
    }
    wireStreamEvents(stream, start, timeout, resolve, reject) {
        const state = { stdout: "", stderr: "", exitCode: null };
        const timer = setTimeout(() => {
            stream.close();
            reject(new AppError(`Command timed out after ${timeout}ms`, "TIMEOUT"));
        }, timeout);
        stream.on("data", (data) => {
            state.stdout += data.toString();
        });
        if (stream.stderr) {
            stream.stderr.on("data", (data) => {
                state.stderr += data.toString();
            });
        }
        stream.on("exit", (code) => {
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
        stream.on("error", (err) => {
            clearTimeout(timer);
            reject(new AppError(`Stream error: ${err.message}`, "COMMAND_FAILED"));
        });
    }
    buildResult(stdout, stderr, exitCode, start) {
        return {
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            exitCode,
            durationMs: Date.now() - start,
        };
    }
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        return this.toSessionInfo(session);
    }
    getSessionCount() {
        return this.sessions.size;
    }
    closeAll() {
        for (const session of this.sessions.values()) {
            try {
                session.client.end();
            }
            catch {
                // ignore errors during shutdown
            }
        }
        this.sessions.clear();
        this.hostToSession.clear();
    }
}
export const pool = new ConnectionPool();
//# sourceMappingURL=pool.js.map