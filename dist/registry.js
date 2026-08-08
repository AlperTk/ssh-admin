import * as fs from "fs";
import * as os from "os";
import * as path from "path";
const REGISTRY_DIR = process.env.MCP_SSH_REGISTRY_PATH
    ? path.dirname(process.env.MCP_SSH_REGISTRY_PATH)
    : path.join(os.homedir(), ".ssh-admin");
const REGISTRY_FILE = process.env.MCP_SSH_REGISTRY_PATH || path.join(REGISTRY_DIR, "hosts.json");
function ensureRegistryDir() {
    if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true, mode: 0o700 });
    }
    else {
        fs.chmodSync(REGISTRY_DIR, 0o700);
    }
}
let registryCache = null;
let registryCacheMtime = 0;
function loadRegistry() {
    ensureRegistryDir();
    if (!fs.existsSync(REGISTRY_FILE)) {
        registryCache = { hosts: [] };
        registryCacheMtime = 0;
        return registryCache;
    }
    const stats = fs.statSync(REGISTRY_FILE);
    if (registryCache && registryCacheMtime === stats.mtimeMs) {
        return registryCache;
    }
    const content = fs.readFileSync(REGISTRY_FILE, "utf-8");
    registryCache = JSON.parse(content);
    registryCacheMtime = stats.mtimeMs;
    return registryCache;
}
function invalidateCache() {
    registryCache = null;
    registryCacheMtime = 0;
}
function saveRegistry(registry) {
    ensureRegistryDir();
    const tmpFile = REGISTRY_FILE + `.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(registry, null, 2), { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(tmpFile, REGISTRY_FILE);
    fs.chmodSync(REGISTRY_FILE, 0o600);
    invalidateCache();
}
function findHost(alias) {
    const registry = loadRegistry();
    const index = registry.hosts.findIndex((h) => h.alias === alias);
    if (index === -1)
        return null;
    return { index, host: registry.hosts[index] };
}
export function addServer(host) {
    const registry = loadRegistry();
    // Check duplicate alias
    if (registry.hosts.some((h) => h.alias === host.alias)) {
        throw new Error(`Host with alias '${host.alias}' already exists`);
    }
    registry.hosts.push(host);
    saveRegistry(registry);
    return { ...host };
}
export function listServers() {
    const registry = loadRegistry();
    return registry.hosts.map(({ keyPath: _kp, ...h }) => h);
}
export function getServer(alias) {
    const result = findHost(alias);
    if (!result) {
        throw new Error(`Host '${alias}' not found in registry`);
    }
    return { ...result.host };
}
export function updateServer(alias, updates) {
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
export function deleteServer(alias) {
    const registry = loadRegistry();
    const index = registry.hosts.findIndex((h) => h.alias === alias);
    if (index === -1) {
        throw new Error(`Host '${alias}' not found in registry`);
    }
    registry.hosts.splice(index, 1);
    saveRegistry(registry);
}
export function resolveCredentials(alias, host) {
    const envKey = `SSH_PASSWORD_${alias.toUpperCase()}`;
    const password = process.env[envKey];
    if (host.authMethod === "key" && host.keyPath) {
        let keyContent;
        try {
            keyContent = fs.readFileSync(host.keyPath);
        }
        catch (e) {
            const err = e;
            throw new Error(`Cannot read key file for host '${alias}': ${err.message}. ` +
                `Verify keyPath '${host.keyPath}' exists and is readable.`);
        }
        return { key: keyContent };
    }
    if (host.authMethod === "password" && !password) {
        throw new Error(`No password found for host '${alias}'. Set environment variable ${envKey}.`);
    }
    return { password };
}
//# sourceMappingURL=registry.js.map