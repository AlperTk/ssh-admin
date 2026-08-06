import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { HostConfig, ServerRegistry } from "./types.js";

const REGISTRY_DIR = process.env.MCP_SSH_REGISTRY_PATH
  ? path.dirname(process.env.MCP_SSH_REGISTRY_PATH)
  : path.join(os.homedir(), ".mcp-ssh");
const REGISTRY_FILE = process.env.MCP_SSH_REGISTRY_PATH || path.join(REGISTRY_DIR, "hosts.json");

function ensureRegistryDir() {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  }
}

function loadRegistry(): ServerRegistry {
  ensureRegistryDir();
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { hosts: [] };
  }
  const content = fs.readFileSync(REGISTRY_FILE, "utf-8");
  return JSON.parse(content) as ServerRegistry;
}

function saveRegistry(registry: ServerRegistry) {
  ensureRegistryDir();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
}

function findHost(alias: string): { index: number; host: HostConfig } | null {
  const registry = loadRegistry();
  const index = registry.hosts.findIndex((h) => h.alias === alias);
  if (index === -1) return null;
  return { index, host: registry.hosts[index] };
}

export function addServer(host: Omit<HostConfig, "alias"> & { alias: string }): HostConfig {
  const registry = loadRegistry();

  // Check duplicate alias
  if (registry.hosts.some((h) => h.alias === host.alias)) {
    throw new Error(`Host with alias '${host.alias}' already exists`);
  }

  registry.hosts.push(host);
  saveRegistry(registry);
  return { ...host };
}

export function listServers(): HostConfig[] {
  const registry = loadRegistry();
  // Never expose credentials in list output
  return registry.hosts.map(({ keyPath: _kp, ...h }) => h);
}

export function getServer(alias: string): HostConfig {
  const result = findHost(alias);
  if (!result) {
    throw new Error(`Host '${alias}' not found in registry`);
  }
  return { ...result.host };
}

export function updateServer(
  alias: string,
  updates: Partial<Omit<HostConfig, "alias" | "host">>
): HostConfig {
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

export function deleteServer(alias: string): void {
  const registry = loadRegistry();
  const index = registry.hosts.findIndex((h) => h.alias === alias);
  if (index === -1) {
    throw new Error(`Host '${alias}' not found in registry`);
  }
  registry.hosts.splice(index, 1);
  saveRegistry(registry);
}

export function resolveCredentials(alias: string, host: HostConfig): { key?: Buffer; password?: string } {
  const envKey = `SSH_PASSWORD_${alias.toUpperCase()}`;
  const password = process.env[envKey];

  if (host.authMethod === "key" && host.keyPath) {
    const keyContent = fs.readFileSync(host.keyPath);
    return { key: keyContent };
  }

  if (host.authMethod === "password" && !password) {
    throw new Error(
      `No password found for host '${alias}'. Set environment variable ${envKey}.`
    );
  }

  return { password };
}
