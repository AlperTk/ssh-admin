"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const crypto = __importStar(require("crypto"));
const ssh2_1 = require("ssh2");
const registry_js_1 = require("./registry.js");
class ConnectionPool {
    sessions = new Map();
    hostToSession = new Map(); // host → sessionId (max 1 per host)
    async open(alias, timeout = 5000) {
        const hostConfig = (0, registry_js_1.getServer)(alias);
        const credentials = (0, registry_js_1.resolveCredentials)(alias, hostConfig);
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
        const sessionId = crypto.randomUUID();
        const client = new ssh2_1.Client();
        const connectOpts = {
            host: hostConfig.host,
            port: hostConfig.port,
            username: hostConfig.username,
            readyTimeout: timeout,
            keepaliveInterval: Math.max(10000, timeout / 3),
            keepaliveCountMax: 10,
            GSSAPIAuthentication: false,
            addressFamily: 4,
        };
        if (hostConfig.authMethod === "key" && credentials.key) {
            console.error("[DEBUG] Using privateKey from file");
            connectOpts.privateKey = credentials.key;
        }
        if (credentials.password) {
            connectOpts.password = credentials.password;
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
                console.error("[DEBUG] SSH ready for alias:", alias);
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
                            console.error("[DEBUG] Connection verified for alias:", alias);
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
            client.on("close", (...args) => {
                console.error("[DEBUG] SSH close event args:", JSON.stringify(args));
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
                reject(e);
            }
        });
    }
    close(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, message: `Session '${sessionId}' not found` };
        }
        session.client.end();
        this.sessions.delete(sessionId);
        this.hostToSession.delete(session.host);
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
                console.error("[DEBUG] executing:", command);
                session.client.exec(command, { env: { TERM: "xterm" } }, (err, stream) => {
                    if (err) {
                        console.error("[DEBUG] exec callback error:", err.message);
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
                    stream.stderr.on("data", (data) => {
                        stderr += data.toString();
                    });
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
                console.error("[DEBUG] exec sync error:", e.message);
                reject(new Error(`Command execution failed: ${e.message}. The SSH connection may have been closed. Try calling pool.open() again to establish a new connection.`));
            }
        });
    }
    getSessionCount() {
        return this.sessions.size;
    }
}
exports.pool = new ConnectionPool();
//# sourceMappingURL=pool.js.map