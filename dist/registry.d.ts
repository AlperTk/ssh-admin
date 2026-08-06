import { HostConfig } from "./types.js";
export declare function addServer(host: Omit<HostConfig, "alias"> & {
    alias: string;
}): HostConfig;
export declare function listServers(): HostConfig[];
export declare function getServer(alias: string): HostConfig;
export declare function updateServer(alias: string, updates: Partial<Omit<HostConfig, "alias" | "host">>): HostConfig;
export declare function deleteServer(alias: string): void;
export declare function resolveCredentials(alias: string, host: HostConfig): {
    key?: Buffer;
    password?: string;
};
//# sourceMappingURL=registry.d.ts.map