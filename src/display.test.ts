import { describe, expect, it } from "vitest";
import { eventLine, formatDuration, dayLabel, stdoutColorsEnabled } from "./display.js";
import { createImportedEvent, testEvent } from "./calendar.js";
import { PALETTES } from "./theme.js";

const local = (year: number, month: number, day: number, hour = 9, minute = 0): Date =>
  new Date(year, month - 1, day, hour, minute, 0, 0);

describe("display", () => {
  it("uses Today and Tomorrow labels", () => {
    const today = local(2026, 6, 7);
    expect(dayLabel(today, today)).toBe("Today");
    expect(dayLabel(local(2026, 6, 8), today)).toBe("Tomorrow");
    expect(dayLabel(local(2026, 6, 9), today)).toBe("Tue Jun 9");
  });

  it("compacts duration", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(95)).toBe("1h35");
  });

  it("keeps event lines plain when color is disabled", () => {
    const event = createImportedEvent({
      title: "Some holiday",
      start: local(2026, 12, 25),
      end: local(2026, 12, 26, 0, 0),
      allDay: true,
      calendarName: "Holidays",
      account: "ICS #1",
      location: undefined,
      calendarId: "holidays",
      icalUid: "h",
      status: "confirmed",
    });
    expect(eventLine(event, false, false, PALETTES.default)).toBe(" all-day Some holiday");
  });

  it("colors holidays in the default theme", () => {
    const event = createImportedEvent({
      title: "Some holiday",
      start: local(2026, 12, 25),
      end: local(2026, 12, 26, 0, 0),
      allDay: true,
      calendarName: "Holidays",
      account: "ICS #1",
      location: undefined,
      calendarId: "holidays",
      icalUid: "h",
      status: "confirmed",
    });
    const line = eventLine(event, false, true, PALETTES.default);
    expect(line).toContain("\u001b[38;2;245;194;129m");
    expect(line).toContain("\u001b[1;38;2;245;194;129mSome holiday\u001b[0m");
  });

  it("uses nerv out-of-office red", () => {
    const line = eventLine(testEvent("Vacation", local(2026, 12, 25)), false, true, PALETTES.nerv);
    expect(line).toContain("\u001b[38;2;255;0;0m");
    expect(line).toContain("\u001b[3;38;2;255;0;0mVacation\u001b[0m");
  });
});

describe("NO_COLOR", () => {
  it("disables stdout colors when set", () => {
    const previous = process.env.NO_COLOR;
    process.env.NO_COLOR = "1";
    expect(stdoutColorsEnabled(false)).toBe(false);
    if (previous === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = previous;
    }
  });
});
