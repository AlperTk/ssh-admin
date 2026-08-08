import { SessionInfo, CommandResult } from "./types.js";
export declare class ConnectionPool {
    private sessions;
    private hostToSession;
    open(alias: string, timeout?: number): Promise<{
        sessionId: string;
        status: string;
        verified: boolean;
    }>;
    close(sessionId: string): {
        success: boolean;
        message: string;
    };
    list(): SessionInfo[];
    executeCommand(sessionId: string, command: string, timeout?: number): Promise<CommandResult>;
    getSessionInfo(sessionId: string): {
        alias: string;
        host: string;
        username: string;
    } | null;
    getSessionCount(): number;
    closeAll(): void;
}
export declare const pool: ConnectionPool;
//# sourceMappingURL=pool.d.ts.map