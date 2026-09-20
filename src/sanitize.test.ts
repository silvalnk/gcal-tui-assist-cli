import { describe, expect, it } from "vitest";
import { sanitizeDisplayText, sanitizeImportedTitle, redactSecret } from "./sanitize.js";

describe("sanitizeDisplayText", () => {
  it("strips terminal controls and bidi marks", () => {
    const value = "Title\x1b[31m red\x1b[0m \x1b]52;c;secret\x07\u{202e}\nnext";
    expect(sanitizeDisplayText(value)).toBe("Title red next");
  });

  it("uses untitled fallback", () => {
    expect(sanitizeImportedTitle("   ")).toBe("(untitled)");
  });

  it("redacts secret URLs", () => {
    const url = "https://calendar.google.com/calendar/ical/secret/basic.ics";
    expect(redactSecret(`failed ${url}`, url)).toBe("failed [redacted]");
  });
});
