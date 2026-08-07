declare class CommandChecker {
    private allowedCommands;
    constructor();
    check(command: string): {
        allowed: boolean;
        reason?: string;
    };
    private parseSegments;
    private checkSegment;
    private parsePipeSegments;
    private extractSubshellContent;
    private extractBraceContent;
    private checkProcessSubstitution;
    private getFirstToken;
    private getActualCommand;
    private hasWriteArg;
    private hasWritePattern;
}
export { CommandChecker };
//# sourceMappingURL=readonly-checker.d.ts.map