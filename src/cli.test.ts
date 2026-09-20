import { describe, expect, it } from "vitest";
import { createProgram, resolveTheme } from "./cli.js";

describe("CLI", () => {
  it("parses theme names and defaults to default", () => {
    const none = createProgram().parse(["node", "gcal-tui"], { from: "node" });
    expect(none.opts().theme).toBeUndefined();
    expect(resolveTheme(none.opts().theme as string | undefined, undefined)).toBe("default");

    const evangelion = createProgram().parse(["node", "gcal-tui", "--theme", "evangelion"], {
      from: "node",
    });
    expect(evangelion.opts().theme).toBe("evangelion");

    const nerv = createProgram().parse(["node", "gcal-tui", "--theme", "nerv"], { from: "node" });
    expect(nerv.opts().theme).toBe("nerv");
  });

  it("rejects unknown themes", () => {
    expect(() => resolveTheme("unknown", undefined)).toThrow(/theme must be/);
  });

  it("honors TCLOCK_WIDGET_THEME then explicit --theme", () => {
    const previous = process.env.TCLOCK_WIDGET_THEME;
    process.env.TCLOCK_WIDGET_THEME = "nerv";
    expect(resolveTheme(undefined, undefined)).toBe("nerv");
    expect(resolveTheme("evangelion", undefined)).toBe("evangelion");
    process.env.TCLOCK_WIDGET_THEME = "unknown-clock-theme";
    expect(resolveTheme(undefined, undefined)).toBe("default");
    if (previous === undefined) {
      delete process.env.TCLOCK_WIDGET_THEME;
    } else {
      process.env.TCLOCK_WIDGET_THEME = previous;
    }
  });

  it("allows multiple ICS sources", () => {
    const cli = createProgram().parse(
      [
        "node",
        "gcal-tui",
        "--ics",
        "https://example.invalid/a.ics",
        "--ics",
        "https://example.invalid/b.ics",
      ],
      { from: "node" },
    );
    expect(cli.opts().ics).toHaveLength(2);
  });
});
