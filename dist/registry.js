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
exports.addServer = addServer;
exports.listServers = listServers;
exports.getServer = getServer;
exports.updateServer = updateServer;
exports.deleteServer = deleteServer;
exports.resolveCredentials = resolveCredentials;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const REGISTRY_DIR = process.env.MCP_SSH_REGISTRY_PATH
    ? path.dirname(process.env.MCP_SSH_REGISTRY_PATH)
    : path.join(os.homedir(), ".mcp-ssh");
const REGISTRY_FILE = process.env.MCP_SSH_REGISTRY_PATH || path.join(REGISTRY_DIR, "hosts.json");
function ensureRegistryDir() {
    if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    }
}
function loadRegistry() {
    ensureRegistryDir();
    if (!fs.existsSync(REGISTRY_FILE)) {
        return { hosts: [] };
    }
    const content = fs.readFileSync(REGISTRY_FILE, "utf-8");
    return JSON.parse(content);
}
function saveRegistry(registry) {
    ensureRegistryDir();
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
}
function findHost(alias) {
    const registry = loadRegistry();
    const index = registry.hosts.findIndex((h) => h.alias === alias);
    if (index === -1)
        return null;
    return { index, host: registry.hosts[index] };
}
function addServer(host) {
    const registry = loadRegistry();
    // Check duplicate alias
    if (registry.hosts.some((h) => h.alias === host.alias)) {
        throw new Error(`Host with alias '${host.alias}' already exists`);
    }
    registry.hosts.push(host);
    saveRegistry(registry);
    return { ...host };
}
function listServers() {
    const registry = loadRegistry();
    // Never expose credentials in list output
    return registry.hosts.map(({ keyPath: _kp, ...h }) => h);
}
function getServer(alias) {
    const result = findHost(alias);
    if (!result) {
        throw new Error(`Host '${alias}' not found in registry`);
    }
    return { ...result.host };
}
function updateServer(alias, updates) {
    const registry = loadRegistry();
    const index = registry.hosts.findIndex((h) => h.alias === alias);
    if (index === -1) {
        throw new Error(`Host '${alias}' not found in registry`);
    }
    // Don't allow updating host/port via update (use delete + add for those)
    if ("host" in updates || "port" in updates) {
        throw new Error("Cannot update 'host' or 'port' directly. Delete and re-add the server.");
    }
    registry.hosts[index] = { ...registry.hosts[index], ...updates };
    saveRegistry(registry);
    return { ...registry.hosts[index] };
}
function deleteServer(alias) {
    const registry = loadRegistry();
    const index = registry.hosts.findIndex((h) => h.alias === alias);
    if (index === -1) {
        throw new Error(`Host '${alias}' not found in registry`);
    }
    registry.hosts.splice(index, 1);
    saveRegistry(registry);
}
function resolveCredentials(alias, host) {
    const envKey = `SSH_PASSWORD_${alias.toUpperCase()}`;
    const password = process.env[envKey];
    if (host.authMethod === "key" && host.keyPath) {
        const keyContent = fs.readFileSync(host.keyPath);
        return { key: keyContent };
    }
    if (host.authMethod === "password" && !password) {
        throw new Error(`No password found for host '${alias}'. Set environment variable ${envKey}.`);
    }
    return { password };
}
//# sourceMappingURL=registry.js.map