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
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const TEST_REGISTRY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-ssh-test-"));
const TEST_REGISTRY = path.join(TEST_REGISTRY_DIR, "hosts.json");
// Set env var BEFORE importing registry
process.env.MCP_SSH_REGISTRY_PATH = TEST_REGISTRY;
const { addServer, listServers, getServer, updateServer, deleteServer } = await import("./registry.js");
(0, vitest_1.describe)("Registry", () => {
    (0, vitest_1.afterEach)(() => {
        // Clean up after each test
        if (fs.existsSync(TEST_REGISTRY_DIR)) {
            fs.rmSync(TEST_REGISTRY_DIR, { recursive: true, force: true });
        }
    });
    (0, vitest_1.it)("should add a new server", () => {
        const result = addServer({
            alias: "test-server",
            host: "192.168.1.1",
            port: 22,
            username: "testuser",
            authMethod: "key",
            keyPath: "~/.ssh/id_rsa",
        });
        (0, vitest_1.expect)(result.alias).toBe("test-server");
        (0, vitest_1.expect)(result.host).toBe("192.168.1.1");
    });
    (0, vitest_1.it)("should throw on duplicate alias", () => {
        addServer({
            alias: "dup-server",
            host: "10.0.0.1",
            port: 22,
            username: "user",
            authMethod: "key",
        });
        (0, vitest_1.expect)(() => addServer({
            alias: "dup-server",
            host: "10.0.0.2",
            port: 22,
            username: "user",
            authMethod: "key",
        })).toThrow("already exists");
    });
    (0, vitest_1.it)("should list servers", () => {
        addServer({
            alias: "list-test",
            host: "10.0.0.5",
            port: 22,
            username: "admin",
            authMethod: "password",
        });
        const servers = listServers();
        (0, vitest_1.expect)(servers).toHaveLength(1);
        (0, vitest_1.expect)(servers[0].alias).toBe("list-test");
        // Password should not be exposed in list
        (0, vitest_1.expect)(servers[0]).not.toHaveProperty("password");
    });
    (0, vitest_1.it)("should get a specific server", () => {
        addServer({
            alias: "get-test",
            host: "10.0.0.10",
            port: 2222,
            username: "deploy",
            authMethod: "key",
            keyPath: "~/.ssh/deploy_key",
        });
        const server = getServer("get-test");
        (0, vitest_1.expect)(server.alias).toBe("get-test");
        (0, vitest_1.expect)(server.port).toBe(2222);
    });
    (0, vitest_1.it)("should throw when getting non-existent server", () => {
        (0, vitest_1.expect)(() => getServer("nonexistent")).toThrow("not found");
    });
    (0, vitest_1.it)("should update a server", () => {
        addServer({
            alias: "update-test",
            host: "10.0.0.20",
            port: 22,
            username: "olduser",
            authMethod: "key",
        });
        const result = updateServer("update-test", { username: "newuser" });
        (0, vitest_1.expect)(result.username).toBe("newuser");
        (0, vitest_1.expect)(result.host).toBe("10.0.0.20"); // host unchanged
    });
    (0, vitest_1.it)("should throw on updating host/port", () => {
        addServer({
            alias: "no-update",
            host: "10.0.0.30",
            port: 22,
            username: "user",
            authMethod: "key",
        });
        (0, vitest_1.expect)(() => updateServer("no-update", { host: "10.0.0.99" })).toThrow("Cannot update 'host'");
    });
    (0, vitest_1.it)("should delete a server", () => {
        addServer({
            alias: "delete-me",
            host: "10.0.0.40",
            port: 22,
            username: "user",
            authMethod: "key",
        });
        deleteServer("delete-me");
        (0, vitest_1.expect)(() => getServer("delete-me")).toThrow("not found");
    });
    (0, vitest_1.it)("should throw on deleting non-existent server", () => {
        (0, vitest_1.expect)(() => deleteServer("ghost")).toThrow("not found");
    });
});
//# sourceMappingURL=registry.test.js.map