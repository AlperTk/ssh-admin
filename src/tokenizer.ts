/** Extracts the first token from a command string, respecting quoted strings. */
export function getFirstToken(cmd: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let token = '';

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === ' ' || char === '\t' || char === ';') {
        break;
      }
      token += char;
    } else {
      token += char;
    }
  }

  return token;
}

interface TokenizerOptions {
  separators: string[];
  depthChar?: { open: string; close: string };
  secondaryDepthChar?: { open: string; close: string };
}

export function tokenize(
  input: string,
  options: TokenizerOptions
): string[] {
  const { separators, depthChar, secondaryDepthChar } = options;
  const segments: string[] = [];
  let current = "";
  let depth = 0;
  let braceDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (depthChar) {
        if (char === depthChar.open) {
          depth++;
          current += char;
          continue;
        }
        if (char === depthChar.close) {
          depth--;
          current += char;
          continue;
        }
      }

      if (secondaryDepthChar) {
        if (char === secondaryDepthChar.open && depth === 0) {
          braceDepth++;
          current += char;
          continue;
        }
        if (char === secondaryDepthChar.close && braceDepth > 0) {
          braceDepth--;
          current += char;
          continue;
        }
      }

      if (depth <= 0 && braceDepth <= 0) {
        let matched = false;
        for (const sep of separators) {
          if (input.startsWith(sep, i)) {
            if (current.trim()) {
              segments.push(current.trim());
            }
            current = "";
            i += sep.length - 1;
            matched = true;
            break;
          }
        }
        if (!matched) {
          current += char;
        }
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}
