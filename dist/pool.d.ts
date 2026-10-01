import { SessionInfo, CommandResult } from "./types.js";
export declare class ConnectionPool {
    private sessions;
    private hostToSession;
    open(alias: string, timeout?: number): Promise<{
        sessionId: string;
        status: string;
        verified: boolean;
    }>;
    private getReusableSessionId;
    private buildConnectOptions;
    private createOpenContext;
    private attachReadyHandler;
    private handleVerificationStream;
    private storeSession;
    private attachErrorHandler;
    private attachCloseHandler;
    private startConnection;
    close(sessionId: string): {
        success: boolean;
        message: string;
    };
    private toSessionInfo;
    list(): SessionInfo[];
    executeCommand(sessionId: string, command: string, timeout?: number): Promise<CommandResult>;
    private wireStreamEvents;
    private buildResult;
    getSessionInfo(sessionId: string): SessionInfo | null;
    getSessionCount(): number;
    closeAll(): void;
}
export declare const pool: ConnectionPool;
//# sourceMappingURL=pool.d.ts.map