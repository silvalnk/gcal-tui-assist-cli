import { describe, expect, it } from "vitest";
import { testEvent } from "./calendar.js";
import { PALETTES } from "./theme.js";
import { buildBodyPlan, more, truncateToWidth, type AppState } from "./ui.js";

const local = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day, 9, 0, 0, 0);

describe("TUI plan", () => {
  it("truncates to display width", () => {
    expect(truncateToWidth("abcdef", 4)).toBe("abc…");
    expect(truncateToWidth("abcdef", 1)).toBe("…");
    expect(truncateToWidth("abcdef", 0)).toBe("");
  });

  it("advances more to later days when next hidden event is not same week", () => {
    const events = [
      testEvent("First", local(2026, 1, 1)),
      testEvent("Later", local(2026, 2, 1)),
      testEvent("Latest", local(2026, 3, 1)),
    ];
    const { summary } = buildBodyPlan(events, 0, undefined, false, 2, 80, PALETTES.default);
    expect(summary.firstHidden).toBe(1);
    expect(summary.canMore).toBe(true);
    expect(summary.moreHiddenCount).toBe(2);
    expect(summary.moreLabel).toBe("later");
    expect(summary.moreEndIndex).toBeUndefined();

    const state: AppState = {
      events,
      showDetails: false,
      startIndex: 0,
      lastPlan: summary,
      palette: PALETTES.default,
    };
    more(state);
    expect(state.startIndex).toBe(1);
  });

  it("uses selected theme colors on the category marker", () => {
    const events = [testEvent("Vacation", local(2026, 8, 1))];
    const { lines } = buildBodyPlan(events, 0, undefined, false, 2, 80, PALETTES.nerv);
    expect(lines[0]?.spans[0]?.color).toEqual({ red: 0, green: 255, blue: 135 });
    expect(lines[1]?.spans[0]?.color).toEqual({ red: 255, green: 0, blue: 0 });
  });
});
