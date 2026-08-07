"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandChecker = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
// Git komutları: yazma işlemi yapan alt komutlar
const GIT_WRITE_COMMANDS = [
    'commit', 'push', 'merge', 'rebase', 'reset', 'clean',
    'am', 'apply', 'bisect', 'cherry-pick', 'force-push',
    'clone', 'pull', 'fetch', 'checkout', 'restore',
    'stash', 'revert', 'add', 'rm', 'mv',
    'gc', 'prune', 'replace', 'filter-branch',
];
// systemctl: sadece read-only alt komutlar izinli
const SYSTEMCTL_READ_ONLY = [
    'status', 'is-active', 'is-enabled', 'is-failed', 'list-units',
    'list-sockets', 'list-timers', 'list-dependencies', 'cat', 'show',
    'get-default', 'help', 'dump', 'import-environment', 'tmpfiles',
    'property', 'daemon-status', 'log', 'is-system-running',
];
// ip: network interface inspection — read-only alt komutlar
const IP_READ_ONLY = [
    'addr', 'link', 'route', 'neigh', 'rule', 'tunnel', 'xfrm',
    'maddr', 'monitor', 'check', 'session',
];
const IP_WRITE_COMMANDS = [
    'add', 'del', 'change', 'chg', 'replace', 'flush', 'set',
    'create', 'destroy', 'remove', 'save', 'restore',
];
// ip: read-only vs write subkomut kontrolü
const IP_WRITE_SUBCOMMANDS = new Map([
    ['addr', ['add', 'del', 'flush']],
    ['link', ['set', 'add', 'del', 'delete', 'change', 'chg', 'replace']],
    ['route', ['add', 'del', 'change', 'chg', 'replace', 'append']],
    ['neigh', ['add', 'del', 'replace', 'chgr']],
    ['rule', ['add', 'del', 'flush']],
    ['tunnel', ['add', 'del', 'change', 'chg', 'replace']],
    ['maddr', ['add', 'del', 'change', 'chg', 'replace']],
]);
// apt: sadece read-only alt komutlar izinli
const APT_READ_ONLY = [
    'list', 'show', 'search', 'policy', 'info', 'cache', 'depends',
    'rdepends', 'madison', 'edit-sources', 'full-upgrade', 'dist-upgrade',
    'update', 'upgrade', 'check', 'simulator', 'autoremove',
];
const APT_WRITE_COMMANDS = [
    'install', 'remove', 'purge', 'reinstall', 'hold', 'unhold',
    'lock', 'unlock', 'clean', 'autoclean', 'fix-broken',
];
// crontab: -l okuma, -e yazma
const CRONTAB_READ_ONLY_FLAGS = ['-l', '-r', '-i', '-v'];
const CRONTAB_WRITE_FLAGS = ['-e'];
// docker: sadece read-only alt komutlar izinli
const DOCKER_READ_ONLY = [
    'ps', 'images', 'inspect', 'logs', 'top', 'stats', 'version', 'info',
    'diff', 'port', 'events', 'pull', 'config', 'node', 'service', 'task',
    'volume', 'network', 'plugin', 'secret', 'swarm', 'container', 'image',
    'system',
];
const DOCKER_WRITE_COMMANDS = [
    'rm', 'rmi', 'prune', 'stop', 'start', 'restart', 'kill', 'run',
    'update', 'rename', 'tag', 'push', 'save', 'load', 'import',
    'export', 'commit', 'cp', 'attach', 'wait', 'build', 'create',
    'pause', 'unpause', 'resize', 'modify',
];
// docker iki seviyeli alt komutlar: {namespace} {action} — action write ise engelle
const DOCKER_NAMESPACE_WRITE = new Map([
    ['system', ['prune']],
    ['image', ['rm', 'push', 'save', 'load', 'history', 'tag']],
    ['container', ['rm', 'start', 'stop', 'restart', 'kill', 'exec', 'update', 'rename', 'cp', 'attach', 'wait', 'pause', 'unpause', 'resize']],
    ['volume', ['rm', 'create']],
    ['network', ['rm', 'connect', 'disconnect']],
    ['plugin', ['install', 'remove', 'disable', 'enable']],
    ['secret', ['rm', 'create', 'update']],
    ['config', ['rm', 'create', 'update']],
    ['node', ['demote', 'promote', 'update', 'rm']],
    ['service', ['rm', 'create', 'update', 'scale', 'rollback']],
    ['swarm', ['leave', 'unlock', 'lock', 'init', 'join', 'ca']],
]);
// Komut substitution: $() ve backtick içi komutlar kontrol edilmeli
const COMMAND_SUBSTITUTION_REGEX = /\$\(.*?\)|`[^`]+`/g;
class CommandChecker {
    allowedCommands;
    constructor() {
        const whitelist = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'data', 'readonly-whitelist.json'), 'utf-8'));
        this.allowedCommands = new Set(whitelist.commands);
    }
    check(command) {
        if (!command.trim()) {
            return { allowed: true };
        }
        // Komut substitution ($(), backtick) içindeki komutları kontrol et
        const subMatch = command.match(COMMAND_SUBSTITUTION_REGEX);
        if (subMatch) {
            for (const sub of subMatch) {
                const inner = sub.startsWith('$(')
                    ? sub.slice(2, -1)
                    : sub.slice(1, -1);
                const result = this.check(inner);
                if (!result.allowed) {
                    return result;
                }
            }
        }
        console.error(`[READONLY-CHECKER] Checking command: ${command}`);
        // for/while döngüleri: gövdeyi çıkar ve recursive check
        const loopBody = this.extractLoopBody(command);
        if (loopBody !== null) {
            console.error(`[READONLY-CHECKER] Extracted loop body: ${loopBody}`);
            return this.check(loopBody);
        }
        const segments = this.parseSegments(command);
        console.error(`[READONLY-CHECKER] Parsed segments: ${JSON.stringify(segments)}`);
        for (const segment of segments) {
            const result = this.checkSegment(segment.trim());
            console.error(`[READONLY-CHECKER] Segment "${segment.trim()}": allowed=${result.allowed}${result.reason ? `, reason=${result.reason}` : ''}`);
            if (!result.allowed) {
                return result;
            }
        }
        console.error(`[READONLY-CHECKER] Command ALLOWED`);
        return { allowed: true };
    }
    parseSegments(cmd) {
        const segments = [];
        let current = '';
        let depth = 0;
        let braceDepth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        for (let i = 0; i < cmd.length; i++) {
            const char = cmd[i];
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                current += char;
            }
            else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                current += char;
            }
            else if (!inSingleQuote && !inDoubleQuote) {
                if (char === '(') {
                    depth++;
                    current += char;
                }
                else if (char === ')') {
                    depth--;
                    current += char;
                }
                else if (char === '{' && depth === 0) {
                    braceDepth++;
                    current += char;
                }
                else if (char === '}' && braceDepth > 0) {
                    braceDepth--;
                    current += char;
                }
                else if (depth === 0 && braceDepth === 0 && (cmd.startsWith('&&', i) || cmd.startsWith('||', i))) {
                    if (current.trim()) {
                        segments.push(current.trim());
                    }
                    current = '';
                    i += 1;
                }
                else if (depth === 0 && braceDepth === 0 && char === ';') {
                    if (current.trim()) {
                        segments.push(current.trim());
                    }
                    current = '';
                }
                else {
                    current += char;
                }
            }
            else {
                current += char;
            }
        }
        if (current.trim()) {
            segments.push(current.trim());
        }
        return segments;
    }
    extractLoopBody(segment) {
        const trimmed = segment.trim();
        // for var in ... ; do ... ; done
        const forMatch = trimmed.match(/^for\s+\S+(\s+in\s+.+?)?\s*;?\s*do\s+(.+)$/s);
        if (forMatch) {
            const body = forMatch[2];
            const doneIdx = this.findMatchingDone(body);
            if (doneIdx !== -1) {
                return body.substring(0, doneIdx).trim();
            }
        }
        // while condition ; do ... ; done
        const whileMatch = trimmed.match(/^while\s+.+?\s*;?\s*do\s+(.+)$/s);
        if (whileMatch) {
            const body = whileMatch[1];
            const doneIdx = this.findMatchingDone(body);
            if (doneIdx !== -1) {
                return body.substring(0, doneIdx).trim();
            }
        }
        return null;
    }
    findMatchingDone(content) {
        let depth = 1;
        let i = 0;
        while (i < content.length) {
            if (content[i] === "'") {
                let j = i + 1;
                while (j < content.length && content[j] !== "'")
                    j++;
                i = j + 1;
                continue;
            }
            if (content[i] === '"') {
                let j = i + 1;
                while (j < content.length && content[j] !== '"')
                    j++;
                i = j + 1;
                continue;
            }
            if (content[i] === '\\') {
                i += 2;
                continue;
            }
            if (content.substring(i, i + 5) === 'done' &&
                (i + 5 >= content.length || !/\w/.test(content[i + 5])) &&
                (i === 0 || !/\w/.test(content[i - 1]))) {
                depth--;
                if (depth === 0)
                    return i;
                i += 5;
                continue;
            }
            if (content.substring(i, i + 2) === 'do' &&
                (i + 2 >= content.length || !/\w/.test(content[i + 2])) &&
                (i === 0 || !/\w/.test(content[i - 1]))) {
                depth++;
                i += 2;
                continue;
            }
            i++;
        }
        return -1;
    }
    checkSegment(segment) {
        const loopBody = this.extractLoopBody(segment);
        if (loopBody !== null) {
            return this.check(loopBody);
        }
        const subshellContent = this.extractSubshellContent(segment);
        if (subshellContent !== null) {
            return this.check(subshellContent);
        }
        const braceContent = this.extractBraceContent(segment);
        if (braceContent !== null) {
            return this.check(braceContent);
        }
        const pipeSegments = this.parsePipeSegments(segment);
        for (const pipeSeg of pipeSegments) {
            const trimmed = pipeSeg.trim();
            if (!trimmed)
                continue;
            const processSubResult = this.checkProcessSubstitution(trimmed);
            if (!processSubResult.allowed) {
                return processSubResult;
            }
            const firstToken = this.getActualCommand(trimmed);
            if (!this.allowedCommands.has(firstToken)) {
                return { allowed: false, reason: `Command '${firstToken}' is not in the read-only whitelist` };
            }
            if (this.hasWriteArg(trimmed, firstToken)) {
                return { allowed: false, reason: `Write argument detected in command` };
            }
            if (this.hasWritePattern(pipeSeg)) {
                return { allowed: false, reason: `Write pattern detected in command` };
            }
        }
        return { allowed: true };
    }
    parsePipeSegments(segment) {
        const segments = [];
        let current = '';
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        for (let i = 0; i < segment.length; i++) {
            const char = segment[i];
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                current += char;
            }
            else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                current += char;
            }
            else if (!inSingleQuote && !inDoubleQuote) {
                if (char === '(') {
                    depth++;
                    current += char;
                }
                else if (char === ')') {
                    depth--;
                    current += char;
                }
                else if (depth === 0 && char === '|') {
                    if (i + 1 < segment.length && segment[i + 1] === '|') {
                        current += char;
                    }
                    else {
                        if (current.trim()) {
                            segments.push(current.trim());
                        }
                        current = '';
                    }
                }
                else {
                    current += char;
                }
            }
            else {
                current += char;
            }
        }
        if (current.trim()) {
            segments.push(current.trim());
        }
        return segments;
    }
    extractSubshellContent(segment) {
        const match = segment.match(/^\(\s*(.+)\s*\)$/);
        if (match) {
            return match[1];
        }
        return null;
    }
    extractBraceContent(segment) {
        const match = segment.match(/^\{\s*(.+)\s*\}\s*$/);
        if (match) {
            return match[1];
        }
        return null;
    }
    checkProcessSubstitution(segment) {
        const processSubRegex = />\(([^)]+)\)/g;
        let match;
        while ((match = processSubRegex.exec(segment)) !== null) {
            const content = match[1];
            const result = this.check(content);
            if (!result.allowed) {
                return result;
            }
        }
        return { allowed: true };
    }
    getFirstToken(cmd) {
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let token = '';
        for (let i = 0; i < cmd.length; i++) {
            const char = cmd[i];
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            }
            else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            }
            else if (!inSingleQuote && !inDoubleQuote) {
                if (char === ' ' || char === '\t' || char === ';') {
                    break;
                }
                token += char;
            }
            else {
                token += char;
            }
        }
        return token;
    }
    getActualCommand(cmd) {
        const firstToken = this.getFirstToken(cmd);
        if (firstToken === 'sudo') {
            let rest = cmd.substring(firstToken.length).trimStart();
            // Skip sudo flags like -n, -S, -p, etc.
            while (rest.startsWith('-') && !rest.match(/^[a-zA-Z]/)) {
                const flagEnd = rest.search(/\s+/);
                if (flagEnd === -1)
                    break;
                const afterFlag = rest.substring(flagEnd).trimStart();
                if (afterFlag.startsWith('-')) {
                    const nextFlagEnd = afterFlag.search(/\s+/);
                    if (nextFlagEnd === -1)
                        break;
                    rest = afterFlag.substring(nextFlagEnd).trimStart();
                }
                else {
                    rest = afterFlag;
                    break;
                }
            }
            return this.getActualCommand(rest);
        }
        if (firstToken === 'su') {
            const rest = cmd.substring(firstToken.length).trimStart();
            const cMatch = rest.match(/-c\s+['"]?(.+?)['"]?$/);
            if (cMatch) {
                return this.getActualCommand(cMatch[1]);
            }
            // su user → kullanıcı adı, komut yok → su'yu döndür
            return firstToken;
        }
        if (firstToken === 'ssh') {
            const rest = cmd.substring(firstToken.length).trimStart();
            // Tek tırnak içindeki host'u çıkar ('user@host' → user@host)
            const quotedMatch = rest.match(/^['"]?([^'"\s]+@[^'"\s]+)['"]?\s*(.*)$/);
            if (quotedMatch) {
                const afterHost = quotedMatch[2].trimStart();
                if (afterHost) {
                    return this.getActualCommand(afterHost);
                }
                return firstToken; // ssh user@host — komut yok
            }
            // Tırnaksız host
            const hostPattern = /[^'"\s]+@[^'"\s]+/;
            const match = rest.match(hostPattern);
            if (match && match.index !== undefined) {
                const afterHost = rest.substring(match.index + match[0].length).trimStart();
                if (afterHost) {
                    return this.getActualCommand(afterHost);
                }
            }
        }
        return firstToken;
    }
    hasWriteArg(cmd, firstToken) {
        // curl/wget: -o/-O (output file) VE -d/--data (data exfiltration)
        if ((firstToken === 'curl' || firstToken === 'wget') && (/\s-[oO]\s/.test(cmd) || /\s-[oO]$/.test(cmd) ||
            /\s-[dD]\s/.test(cmd) || /\s-[dD]$/.test(cmd) ||
            /--data\s*=/.test(cmd) || /--post-data\s*=/.test(cmd))) {
            return true;
        }
        // Git write operations
        if (firstToken === 'git') {
            const rest = cmd.substring(firstToken.length).trimStart();
            const secondToken = this.getFirstToken(rest);
            if (secondToken === 'stash') {
                // stash list/read-only alt komutları izinli
                const thirdToken = this.getFirstToken(rest.substring(secondToken.length).trimStart());
                const stashReadOnly = ['list', 'show', 'push'];
                if (thirdToken && !stashReadOnly.includes(thirdToken)) {
                    return true;
                }
                return false; // stash alone or stash list → allowed
            }
            if (GIT_WRITE_COMMANDS.includes(secondToken)) {
                return true;
            }
        }
        // systemctl: sadece read-only subkomutlar izinli
        if (firstToken === 'systemctl') {
            const idx = cmd.toLowerCase().indexOf('systemctl');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                while (rest.startsWith('-')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                const subCmd = this.getFirstToken(rest);
                if (!subCmd) {
                    return false;
                }
                if (!SYSTEMCTL_READ_ONLY.includes(subCmd)) {
                    return true;
                }
            }
        }
        // firewall-cmd: --list-* ve --get-* okuma, diğerleri yazma
        if (firstToken === 'firewall-cmd') {
            const idx = cmd.toLowerCase().indexOf('firewall-cmd');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                // --list-* veya --get-* ile başlayan okuma komutları (flag stripping öncesi kontrol)
                if (rest.startsWith('--list-') || rest.startsWith('--get-')) {
                    return false;
                }
                // Diğer - flag'leri atla
                while (rest.startsWith('-') && !rest.startsWith('--')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                // Kalan --list-* veya --get-* kontrolü
                if (rest.startsWith('--list-') || rest.startsWith('--get-')) {
                    return false;
                }
                // Diğer tüm komutlar yazma olarak kabul
                return true;
            }
        }
        // ip: read-only vs write subkomut kontrolü
        if (firstToken === 'ip') {
            const idx = cmd.toLowerCase().indexOf('ip');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                while (rest.startsWith('-')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                const subCmd = this.getFirstToken(rest);
                if (!subCmd) {
                    return false;
                }
                // ip {addr,link,route,...} {show,list} → okuma
                if (IP_READ_ONLY.includes(subCmd)) {
                    let nsRest = rest.substring(subCmd.length).trimStart();
                    while (nsRest.startsWith('-')) {
                        const spaceIdx = nsRest.indexOf(' ');
                        if (spaceIdx === -1)
                            break;
                        nsRest = nsRest.substring(spaceIdx).trimStart();
                    }
                    const action = this.getFirstToken(nsRest);
                    if (action && IP_WRITE_SUBCOMMANDS.get(subCmd)?.includes(action)) {
                        return true;
                    }
                    return false;
                }
                // ip {addr,link,...} {add,del,...} → yazma
                if (IP_WRITE_COMMANDS.includes(subCmd)) {
                    return true;
                }
                return false;
            }
        }
        // apt: read-only vs write subkomut kontrolü
        if (firstToken === 'apt') {
            const idx = cmd.toLowerCase().indexOf('apt');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                while (rest.startsWith('-')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                const subCmd = this.getFirstToken(rest);
                if (!subCmd) {
                    return false;
                }
                if (APT_READ_ONLY.includes(subCmd)) {
                    return false;
                }
                if (APT_WRITE_COMMANDS.includes(subCmd)) {
                    return true;
                }
                return false;
            }
        }
        // crontab: -l okuma, -e yazma
        if (firstToken === 'crontab') {
            const idx = cmd.toLowerCase().indexOf('crontab');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                // İlk flag'i kontrol et (yazma flag'i olabilir)
                if (rest.startsWith('-e') && (rest.length === 2 || !/\w/.test(rest[2]))) {
                    return true;
                }
                // Diğer - flag'leri atla
                while (rest.startsWith('-') && !rest.startsWith('--')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                // -u user flag atla
                if (rest.startsWith('-u') || rest.startsWith('-U')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx !== -1) {
                        rest = rest.substring(spaceIdx).trimStart();
                    }
                    else {
                        rest = '';
                    }
                }
                return false;
            }
        }
        // docker: sadece read-only subkomutlar izinli
        if (firstToken === 'docker') {
            const idx = cmd.toLowerCase().indexOf('docker');
            if (idx !== -1) {
                let rest = cmd.substring(idx + firstToken.length).trimStart();
                while (rest.startsWith('-')) {
                    const spaceIdx = rest.indexOf(' ');
                    if (spaceIdx === -1) {
                        rest = '';
                        break;
                    }
                    rest = rest.substring(spaceIdx).trimStart();
                }
                const subCmd = this.getFirstToken(rest);
                if (!subCmd) {
                    return false;
                }
                // İki seviyeli alt komut kontrolü: docker {namespace} {action}
                if (DOCKER_NAMESPACE_WRITE.has(subCmd)) {
                    let nsRest = rest.substring(subCmd.length).trimStart();
                    while (nsRest.startsWith('-')) {
                        const spaceIdx = nsRest.indexOf(' ');
                        if (spaceIdx === -1)
                            break;
                        nsRest = nsRest.substring(spaceIdx).trimStart();
                    }
                    const action = this.getFirstToken(nsRest);
                    if (action && DOCKER_NAMESPACE_WRITE.get(subCmd)?.includes(action)) {
                        return true;
                    }
                }
                if (DOCKER_READ_ONLY.includes(subCmd)) {
                    return false;
                }
                if (DOCKER_WRITE_COMMANDS.includes(subCmd)) {
                    return true;
                }
                // docker exec özel kontrol
                if (subCmd === 'exec') {
                    let execRest = rest.substring(subCmd.length).trimStart();
                    // container flag ve container adını atla
                    while (execRest.startsWith('-')) {
                        const spaceIdx = execRest.indexOf(' ');
                        if (spaceIdx === -1)
                            break;
                        const afterFlag = execRest.substring(spaceIdx).trimStart();
                        if (afterFlag.startsWith('-')) {
                            const nextSpace = afterFlag.indexOf(' ');
                            if (nextSpace === -1)
                                break;
                            execRest = afterFlag.substring(nextSpace).trimStart();
                        }
                        else {
                            execRest = afterFlag;
                            break;
                        }
                    }
                    // container adını atla (veya --container flag)
                    if (execRest.startsWith('--container')) {
                        const eqIdx = execRest.indexOf('=');
                        if (eqIdx !== -1) {
                            execRest = execRest.substring(eqIdx + 1).trimStart();
                        }
                        else {
                            const spaceIdx = execRest.indexOf(' ');
                            if (spaceIdx === -1)
                                return false;
                            execRest = execRest.substring(spaceIdx).trimStart();
                        }
                    }
                    else {
                        const spaceIdx = execRest.indexOf(' ');
                        if (spaceIdx === -1)
                            return false;
                        execRest = execRest.substring(spaceIdx).trimStart();
                    }
                    // kalan komutu kontrol et
                    if (execRest) {
                        const execCmd = this.getFirstToken(execRest);
                        if (this.allowedCommands.has(execCmd)) {
                            const tempChecker = new CommandChecker();
                            const checkResult = tempChecker.check(execRest);
                            if (!checkResult.allowed) {
                                return true;
                            }
                        }
                        else {
                            return true;
                        }
                    }
                    return false;
                }
                return true;
            }
        }
        // eval: argument içindeki komutları kontrol et
        if (firstToken === 'eval') {
            return this.validateEvalArgs(cmd);
        }
        // exec: shell değiştirme tespiti
        if (firstToken === 'exec') {
            return this.validateExecArgs(cmd);
        }
        return false;
    }
    /** eval argument validation — evaluated string'i parse edip write pattern kontrolü */
    validateEvalArgs(cmd) {
        // eval 'command' veya eval "command" formatından içeriği çıkar
        const rest = cmd.substring(4).trimStart();
        let inner = '';
        if (rest.startsWith("'") || rest.startsWith('"')) {
            const quote = rest[0];
            const endIdx = rest.indexOf(quote, 1);
            if (endIdx > 1) {
                inner = rest.slice(1, endIdx);
            }
        }
        else {
            inner = rest;
        }
        // İçerikte write pattern var mı?
        if (inner.trim()) {
            const tempChecker = new CommandChecker();
            return !tempChecker.check(inner).allowed;
        }
        return false;
    }
    /** exec argument validation — shell değiştirme tespiti */
    validateExecArgs(cmd) {
        const rest = cmd.substring(4).trimStart();
        if (!rest)
            return false; // exec alone = no-op, safe
        const target = this.getFirstToken(rest);
        const shellPatterns = ['bash', 'sh', 'zsh', 'csh', 'ksh', 'dash', 'fish'];
        if (shellPatterns.includes(target)) {
            return true;
        }
        // /bin/sh, /bin/bash gibi path'ler
        if (/^\/bin\//.test(target) || /^\/usr\/bin\//.test(target)) {
            return true;
        }
        return false;
    }
    hasWritePattern(segment) {
        // Çift tırnak içindeki > karakterlerini çıkar (false positive önleme)
        const unquoted = this.stripQuotes(segment);
        // 1. Temel redirection pattern'ları
        if (this.detectRedirection(unquoted)) {
            return true;
        }
        // 2. Pipe ile tee kullanımı
        if (/\|.*tee\b/.test(unquoted)) {
            return true;
        }
        // 3. Write process substitution
        if (/>\(/.test(unquoted)) {
            return true;
        }
        // 4. Komut bazlı write pattern'ları
        if (this.detectCommandWritePatterns(unquoted)) {
            return true;
        }
        // 5. xargs — her zaman engelle (arbitrary command execution)
        if (/\bxargs\b/.test(unquoted)) {
            return true;
        }
        // 6. Here-string / here-doc
        if (/<<<\s/.test(segment)) {
            return true;
        }
        // 7. sed write komutu: sed ... "w /path" veya sed ... -w /path
        if (/\bsed\b/.test(segment) && /["']w\s+\/[^"']/.test(segment)) {
            return true;
        }
        // 8. cp with stdin/dev/stdin
        if (/\bcp\b/.test(segment) && (/\/dev\/stdin/.test(segment) || /-\s*$/.test(segment))) {
            return true;
        }
        // 9. dd with output file (absolute veya relative path)
        if (/\bdd\b/.test(segment) && /\bof\s*=\s*[^s]/.test(segment)) {
            return true;
        }
        // 10. tar create mode (short ve long form)
        if (/\btar\b/.test(segment) && (/\bc[a-zA-Z]*f/.test(segment) ||
            /--create/.test(segment) ||
            /-c\s+--file/.test(segment))) {
            return true;
        }
        // 11. python/perl/ruby/node file writes (genişletilmiş)
        if (this.detectInterpreterWrites(segment)) {
            return true;
        }
        // 12. nc/socat reverse shell
        if (this.detectReverseShell(segment)) {
            return true;
        }
        return false;
    }
    /** Çift tırnak içindeki içerikleri çıkarır (false positive önleme) */
    stripQuotes(cmd) {
        let result = '';
        let inDoubleQuote = false;
        for (const ch of cmd) {
            if (ch === '"' && !inDoubleQuote) {
                inDoubleQuote = true;
            }
            else if (ch === '"' && inDoubleQuote) {
                inDoubleQuote = false;
            }
            else if (!inDoubleQuote) {
                result += ch;
            }
        }
        return result;
    }
    /** Temel redirection pattern'larını tespit eder */
    detectRedirection(s) {
        // >> append
        if (/>>/.test(s))
            return true;
        // &> combined stdout+stderr
        if (/&>/.test(s))
            return true;
        // > redirection (not preceded by -, not followed by >, not to /dev/null or /dev/zero, not fd merge >&N)
        if (/(?<![-])>(?!>)(?!(\/dev\/(null|zero)))(?!&\d)/g.test(s))
            return true;
        // 2> stderr redirect — /dev/null, /dev/zero veya &N (fd merge) hariç write olarak kabul et
        if (/2>(?!\/dev\/(null|zero))(?!&\d)/.test(s))
            return true;
        return false;
    }
    /** Komut bazlı write pattern'ları tespit eder */
    detectCommandWritePatterns(s) {
        // > kullanan komutlar için: genel detectRedirection zaten tüm > durumlarını yakalar.
        // Burada > kullanmayan ama yazma yapan durumları kontrol ediyoruz.
        // sed -i in-place editing
        if (/\bsed\b.*-i[a-z]*\b/.test(s))
            return true;
        if (/\bsed\b.*--in-place/.test(s))
            return true;
        // find -exec VEYA -execdir
        if (/\bfind\b.*(-exec|-execdir)\b/.test(s))
            return true;
        return false;
    }
    /** Interpreter-based file write detection */
    detectInterpreterWrites(segment) {
        if (!/\b(python3?|perl|ruby|node)\b/.test(segment))
            return false;
        const patterns = [
            /\bopen\s*\(/,
            /\bos\.(system|popen|write)\s*\(/,
            /\bsubprocess\./,
            /\bFile\.write\s*\(/,
            /\bIO\.write\s*\(/,
            /\bfs\.(writeFileSync|createWriteStream|write)\s*\(/,
        ];
        return patterns.some(p => p.test(segment));
    }
    /** Reverse shell tespiti */
    detectReverseShell(segment) {
        const netCmds = /\b(nc|ncat|netcat|socat)\b/.test(segment);
        if (!netCmds)
            return false;
        const reversePatterns = [
            /-e\s+\/bin\/(sh|bash|zsh)/,
            /\bexec\s*:\s*\/bin\//,
            /tcp:.*:\d+/,
        ];
        return reversePatterns.some(p => p.test(segment));
    }
}
exports.CommandChecker = CommandChecker;
//# sourceMappingURL=readonly-checker.js.map