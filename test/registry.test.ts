import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const TEST_REGISTRY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-ssh-test-"));
const TEST_REGISTRY = path.join(TEST_REGISTRY_DIR, "hosts.json");

// Set env var BEFORE importing registry
process.env.MCP_SSH_REGISTRY_PATH = TEST_REGISTRY;

const { addServer, listServers, getServer, updateServer, deleteServer, resolveCredentials } = await import("../src/registry.js");

describe("Registry", () => {
  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(TEST_REGISTRY_DIR)) {
      fs.rmSync(TEST_REGISTRY_DIR, { recursive: true, force: true });
    }
  });

  it("should add a new server", () => {
    const result = addServer({
      alias: "test-server",
      host: "192.168.1.1",
      port: 22,
      username: "testuser",
      authMethod: "key",
      keyPath: "~/.ssh/id_rsa",
    });

    expect(result.alias).toBe("test-server");
    expect(result.host).toBe("192.168.1.1");
  });

  it("should throw on duplicate alias", () => {
    addServer({
      alias: "dup-server",
      host: "10.0.0.1",
      port: 22,
      username: "user",
      authMethod: "key",
    });

    expect(() =>
      addServer({
        alias: "dup-server",
        host: "10.0.0.2",
        port: 22,
        username: "user",
        authMethod: "key",
      })
    ).toThrow("already exists");
  });

  it("should list servers", () => {
    addServer({
      alias: "list-test",
      host: "10.0.0.5",
      port: 22,
      username: "admin",
      authMethod: "password",
    });

    const servers = listServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].alias).toBe("list-test");
    // Password should not be exposed in list
    expect(servers[0]).not.toHaveProperty("password");
  });

  it("should get a specific server", () => {
    addServer({
      alias: "get-test",
      host: "10.0.0.10",
      port: 2222,
      username: "deploy",
      authMethod: "key",
      keyPath: "~/.ssh/deploy_key",
    });

    const server = getServer("get-test");
    expect(server.alias).toBe("get-test");
    expect(server.port).toBe(2222);
  });

  it("should throw when getting non-existent server", () => {
    expect(() => getServer("nonexistent")).toThrow("not found");
  });

  it("should update a server", () => {
    addServer({
      alias: "update-test",
      host: "10.0.0.20",
      port: 22,
      username: "olduser",
      authMethod: "key",
    });

    const result = updateServer("update-test", { username: "newuser" });
    expect(result.username).toBe("newuser");
    expect(result.host).toBe("10.0.0.20"); // host unchanged
  });

it("should throw on updating host/port", () => {
    addServer({
      alias: "no-update",
      host: "10.0.0.30",
      port: 22,
      username: "user",
      authMethod: "key",
    });

    expect(() => updateServer("no-update", { host: "10.0.0.99" })).toThrow(
      "Cannot update 'host'"
    );
    expect(() => updateServer("no-update", { port: 2222 })).toThrow(
      "Cannot update 'host' or 'port'"
    );
  });

  it("should delete a server", () => {
    addServer({
      alias: "delete-me",
      host: "10.0.0.40",
      port: 22,
      username: "user",
      authMethod: "key",
    });

    deleteServer("delete-me");
    expect(() => getServer("delete-me")).toThrow("not found");
  });

it("should throw on deleting non-existent server", () => {
    expect(() => deleteServer("ghost")).toThrow("not found");
  });

it("should return key for key-based auth", () => {
    const tempKeyPath = path.join(TEST_REGISTRY_DIR, "test_key");
    fs.mkdirSync(TEST_REGISTRY_DIR, { recursive: true });
    fs.writeFileSync(tempKeyPath, "-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----");

    addServer({
      alias: "key-test",
      host: "10.0.0.50",
      port: 22,
      username: "user",
      authMethod: "key",
      keyPath: tempKeyPath,
    });

    const server = getServer("key-test");
    const creds = resolveCredentials("key-test", server);
    expect(creds.key).toBeInstanceOf(Buffer);
    expect(creds.key).toHaveLength(74);
  });

  it("should return password for password-based auth", () => {
    process.env.SSH_PASSWORD_PASSTEST = "secret123";

    addServer({
      alias: "passtest",
      host: "10.0.0.60",
      port: 22,
      username: "user",
      authMethod: "password",
    });

    const server = getServer("passtest");
    const creds = resolveCredentials("passtest", server);
    expect(creds.password).toBe("secret123");
    expect(creds.key).toBeUndefined();

    delete process.env.SSH_PASSWORD_PASSTEST;
  });

  it("should throw when password is missing for password-based auth", () => {
    addServer({
      alias: "nopass",
      host: "10.0.0.70",
      port: 22,
      username: "user",
      authMethod: "password",
    });

    const server = getServer("nopass");
    expect(() => resolveCredentials("nopass", server)).toThrow("No password found");
  });
});
