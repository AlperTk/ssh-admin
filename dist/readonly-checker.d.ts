declare class CommandChecker {
    private allowedCommands;
    constructor();
    check(command: string): {
        allowed: boolean;
        reason?: string;
    };
    private parseSegments;
    private extractLoopBody;
    private findMatchingDone;
    private checkSegment;
    private parsePipeSegments;
    private extractSubshellContent;
    private extractBraceContent;
    private checkProcessSubstitution;
    private getFirstToken;
    private getActualCommand;
    private hasWriteArg;
    /** eval argument validation — evaluated string'i parse edip write pattern kontrolü */
    private validateEvalArgs;
    /** exec argument validation — shell değiştirme tespiti */
    private validateExecArgs;
    private hasWritePattern;
    /** Çift tırnak içindeki içerikleri çıkarır (false positive önleme) */
    private stripQuotes;
    /** Temel redirection pattern'larını tespit eder */
    private detectRedirection;
    /** Komut bazlı write pattern'ları tespit eder */
    private detectCommandWritePatterns;
    /** Interpreter-based file write detection */
    private detectInterpreterWrites;
    /** Reverse shell tespiti */
    private detectReverseShell;
}
export { CommandChecker };
//# sourceMappingURL=readonly-checker.d.ts.map