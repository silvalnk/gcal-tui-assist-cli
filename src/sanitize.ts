const BIDI_CONTROLS = new Set([
  "\u061c",
  "\u200e",
  "\u200f",
  "\u202a",
  "\u202b",
  "\u202c",
  "\u202d",
  "\u202e",
  "\u2066",
  "\u2067",
  "\u2068",
  "\u2069",
]);

export function collapseWhitespace(value: string): string {
  return value.split(/\s+/u).filter(Boolean).join(" ");
}

export function sanitizeDisplayText(value: string): string {
  return collapseWhitespace(stripTerminalControls(value));
}

export function sanitizeImportedTitle(value: string): string {
  const title = sanitizeDisplayText(value);
  return title.length === 0 ? "(untitled)" : title;
}

export function safeErrorText(value: string, maxChars = 80): string {
  const sanitized = sanitizeDisplayText(value);
  const chars = [...sanitized];
  if (chars.length <= maxChars) {
    return sanitized;
  }
  return `${chars.slice(0, maxChars).join("")}…`;
}

export function redactSecret(text: string, secret: string): string {
  if (secret.length === 0) {
    return text;
  }
  return text.split(secret).join("[redacted]");
}

function stripTerminalControls(value: string): string {
  const chars = [...value];
  let index = 0;
  let out = "";

  while (index < chars.length) {
    const ch = chars[index]!;
    if (ch === "\u001b") {
      index = skipEscapeSequence(chars, index + 1);
      continue;
    }
    if (BIDI_CONTROLS.has(ch)) {
      index += 1;
      continue;
    }
    if (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127) {
      if (/\s/u.test(ch)) {
        out += " ";
      }
      index += 1;
      continue;
    }
    out += ch;
    index += 1;
  }

  return out;
}

function skipEscapeSequence(chars: string[], start: number): number {
  const next = chars[start];
  if (next === undefined) {
    return start;
  }
  if (next === "[") {
    let index = start + 1;
    while (index < chars.length) {
      const ch = chars[index]!;
      const code = ch.codePointAt(0) ?? 0;
      index += 1;
      if (code >= 0x40 && code <= 0x7e) {
        break;
      }
    }
    return index;
  }
  if (next === "]" || next === "P" || next === "_" || next === "^" || next === "X") {
    return skipUntilStringTerminator(chars, start + 1);
  }
  return start + 1;
}

function skipUntilStringTerminator(chars: string[], start: number): number {
  let sawEscape = false;
  for (let index = start; index < chars.length; index += 1) {
    const ch = chars[index]!;
    if (ch === "\u0007") {
      return index + 1;
    }
    if (sawEscape && ch === "\\") {
      return index + 1;
    }
    sawEscape = ch === "\u001b";
  }
  return chars.length;
}
