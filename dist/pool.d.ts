import { SessionInfo, CommandResult } from "./types.js";
declare class ConnectionPool {
    private sessions;
    private hostToSession;
    open(alias: string): Promise<{
        sessionId: string;
        status: string;
    }>;
    close(sessionId: string): {
        success: boolean;
        message: string;
    };
    list(): SessionInfo[];
    executeCommand(sessionId: string, command: string, timeout?: number): Promise<CommandResult>;
    getSessionCount(): number;
}
export declare const pool: ConnectionPool;
export {};
//# sourceMappingURL=pool.d.ts.map