import { describe, expect, it } from "vitest";
import { parseSource } from "./ics.js";
import { dedupeEvents } from "./calendar.js";

const WINDOW = new Date(2026, 6, 11, 0, 0, 0);

function parse(body: string) {
  return parseSource(body, "ICS #1", 3650, WINDOW);
}

describe("ICS parse", () => {
  it("parses timed UTC, TZID and floating events", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:Work\nBEGIN:VEVENT\nUID:utc\nSUMMARY:UTC\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nEND:VEVENT\nBEGIN:VEVENT\nUID:tz\nSUMMARY:TZID\nDTSTART;TZID=America/New_York:20260713T090000\nDTEND;TZID=America/New_York:20260713T100000\nEND:VEVENT\nBEGIN:VEVENT\nUID:floating\nSUMMARY:Floating\nDTSTART:20260714T090000\nDTEND:20260714T100000\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(events).toHaveLength(3);
    expect(events.every((event) => !event.allDay)).toBe(true);
    expect(events.map((event) => event.title).sort()).toEqual(["Floating", "TZID", "UTC"]);
  });

  it("parses exclusive all-day DTEND", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:all-day\nSUMMARY:Trip\nDTSTART;VALUE=DATE:20260712\nDTEND;VALUE=DATE:20260715\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.allDay).toBe(true);
    expect(events[0]?.start.getDate()).toBe(12);
    expect(events[0]?.end?.getDate()).toBe(15);
  });

  it("gives all-day events an implicit one-day end", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:all-day\nSUMMARY:Holiday\nDTSTART;VALUE=DATE:20260712\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.allDay).toBe(true);
    expect(events[0]?.end?.getDate()).toBe(13);
  });

  it("uses untitled fallback and sanitizes location", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:missing\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nLOCATION:Room\\nA\u001b[31m\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(events[0]?.title).toBe("(untitled)");
    expect(events[0]?.location).toBe("Room A");
  });

  it("skips cancelled events", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:cancelled\nSUMMARY:Nope\nSTATUS:CANCELLED\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(events).toHaveLength(0);
  });

  it("does not include secret URLs in parse errors", () => {
    expect(() => parseSource("not calendar", "ICS #1", 30)).toThrow(/ICS #1/);
    try {
      parseSource("not calendar", "ICS #1", 30);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("http");
      expect(message).not.toContain("secret");
    }
  });

  it("collapses identical UID imports", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:same\nSUMMARY:A\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nEND:VEVENT\nBEGIN:VEVENT\nUID:same\nSUMMARY:A duplicate\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nEND:VEVENT\nEND:VCALENDAR",
    );
    expect(dedupeEvents(events)).toHaveLength(1);
  });

  it("expands RRULE RDATE and EXDATE within bound", () => {
    const events = parse(
      "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:recur\nSUMMARY:Daily\nDTSTART:20260712T120000Z\nDTEND:20260712T130000Z\nRRULE:FREQ=DAILY;COUNT=3\nRDATE:20260720T120000Z\nEXDATE:20260713T120000Z\nEND:VEVENT\nEND:VCALENDAR",
    );
    const days = new Set(events.map((event) => event.start.getUTCDate()));
    expect(days.has(12)).toBe(true);
    expect(days.has(13)).toBe(false);
    expect(days.has(14)).toBe(true);
    expect(days.has(20)).toBe(true);
  });

  it("rejects old unbounded high-frequency recurrence", () => {
    expect(() =>
      parseSource(
        "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:fast\nSUMMARY:Fast\nDTSTART:20200101T000000Z\nDTEND:20200101T000100Z\nRRULE:FREQ=SECONDLY\nEND:VEVENT\nEND:VCALENDAR",
        "ICS #1",
        30,
        WINDOW,
      ),
    ).toThrow(/high-frequency unbounded recurrence/);
  });
});
