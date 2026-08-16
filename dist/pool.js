import * as crypto from "crypto";
import { Client } from "ssh2";
import { getServer, resolveCredentials } from "./registry.js";
export class ConnectionPool {
    sessions = new Map();
    hostToSession = new Map(); // host → sessionId (max 1 per host)
    async open(alias, timeout = 5000) {
        const hostConfig = getServer(alias);
        const credentials = resolveCredentials(alias, hostConfig);
        // Check if there's already a session for this host
        const existingSessionId = this.hostToSession.get(hostConfig.host);
        if (existingSessionId) {
            const existing = this.sessions.get(existingSessionId);
            if (existing?.connected) {
                return { sessionId: existingSessionId, status: "already_connected", verified: true };
            }
            // Stale session, clean up
            this.sessions.delete(existingSessionId);
            this.hostToSession.delete(hostConfig.host);
        }
        const sessionId = `${alias}-${crypto.randomUUID().slice(0, 8)}`;
        const client = new Client();
        const connectOpts = {
            host: hostConfig.host,
            port: hostConfig.port,
            username: hostConfig.username,
            readyTimeout: timeout,
            keepaliveInterval: Math.max(10000, timeout / 3),
            keepaliveCountMax: 10,
            ...(hostConfig.forceIPv4 && { forceIPv4: true }),
        };
        if (hostConfig.authMethod === "key" && credentials.key) {
            connectOpts.privateKey = credentials.key;
        }
        const hasPassword = !!credentials.password;
        if (credentials.password) {
            connectOpts.password = credentials.password;
            credentials.password = undefined;
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                client.end();
                reject(new Error(`Connection to '${alias}' timed out after ${timeout / 1000}s`));
            }, timeout);
            let session = null;
            client.on("ready", () => {
                clearTimeout(timer);
                const verifyTimer = setTimeout(() => {
                    client.end();
                    reject(new Error(`Connection verification timed out after ${Math.max(30, timeout / 1000)}s for '${alias}'`));
                }, Math.max(30000, timeout));
                client.exec("echo ping", (err, stream) => {
                    if (err) {
                        clearTimeout(verifyTimer);
                        client.end();
                        reject(new Error(`Connection verification failed for '${alias}': ${err.message}`));
                        return;
                    }
                    let output = "";
                    stream.on("data", (data) => {
                        output += data.toString();
                    });
                    stream.on("close", () => {
                        clearTimeout(verifyTimer);
                        if (output.trim() === "ping") {
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
                                authConfig: { keyPath: hostConfig.keyPath, hasPassword },
                            };
                            this.sessions.set(sessionId, session);
                            this.hostToSession.set(hostConfig.host, sessionId);
                            resolve({ sessionId, status: "connected", verified: true });
                        }
                        else {
                            client.end();
                            reject(new Error(`Connection verification failed for '${alias}': unexpected response '${output.trim()}'`));
                        }
                    });
                    stream.on("error", (err) => {
                        clearTimeout(verifyTimer);
                        client.end();
                        reject(new Error(`Connection verification stream error for '${alias}': ${err.message}`));
                    });
                });
            });
            client.on("error", (err) => {
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
            }
            catch (e) {
                clearTimeout(timer);
                const message = e instanceof Error ? e.message : String(e);
                reject(new Error(`Connection failed: ${message}`));
            }
        });
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
    list() {
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
    async executeCommand(sessionId, command, timeout = 60000) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session '${sessionId}' not found or closed. Try calling pool.open() again to establish a new connection.`);
        }
        // Update last used
        session.lastUsed = new Date();
        return new Promise((resolve, reject) => {
            const start = Date.now();
            try {
                session.client.exec(command, { env: { TERM: "xterm" } }, (err, stream) => {
                    if (err) {
                        reject(new Error(`Command execution failed: ${err.message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`));
                        return;
                    }
                    let stdout = "";
                    let stderr = "";
                    let exitCode = null;
                    const timer = setTimeout(() => {
                        stream.close();
                        reject(new Error(`Command timed out after ${timeout}ms`));
                    }, timeout);
                    stream.on("data", (data) => {
                        stdout += data.toString();
                    });
                    if (stream.stderr) {
                        stream.stderr.on("data", (data) => {
                            stderr += data.toString();
                        });
                    }
                    stream.on("exit", (code) => {
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
                    stream.on("error", (err) => {
                        clearTimeout(timer);
                        reject(new Error(`Stream error: ${err.message}`));
                    });
                });
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                reject(new Error(`Command execution failed: ${message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`));
            }
        });
    }
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        return { alias: session.alias, host: session.host, username: session.username };
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