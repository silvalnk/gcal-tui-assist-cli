import { describe, expect, it } from "vitest";
import {
  categoryOf,
  createImportedEvent,
  dedupeEvents,
  testEvent,
} from "./calendar.js";

const at = (iso: string): Date => new Date(iso);

describe("calendar domain", () => {
  it("classifies holidays, birthdays, OOO, focus, travel, meetings", () => {
    expect(
      categoryOf(
        createImportedEvent({
          title: "Natal",
          start: at("2026-12-25T00:00:00"),
          end: at("2026-12-26T00:00:00"),
          allDay: true,
          calendarName: "Feriados",
          account: "ICS #1",
          location: undefined,
          calendarId: "en.brazilian#holiday@group.v.calendar.google.com",
          icalUid: "h",
          status: "confirmed",
        }),
      ),
    ).toBe("holiday");

    expect(categoryOf(testEvent("Birthday party", at("2026-09-17T18:00:00")))).toBe(
      "birthday",
    );
    expect(categoryOf(testEvent("Vacation", at("2026-09-17T09:00:00")))).toBe(
      "out_of_office",
    );
    expect(categoryOf(testEvent("Deep work", at("2026-09-17T09:00:00")))).toBe("focus");
    expect(categoryOf(testEvent("Flight to Recife", at("2026-09-17T09:00:00")))).toBe(
      "travel",
    );
    expect(
      categoryOf(
        createImportedEvent({
          title: "Planning",
          start: at("2026-09-17T11:00:00"),
          end: at("2026-09-17T12:00:00"),
          allDay: false,
          calendarName: "Work",
          account: "ICS #1",
          location: undefined,
          calendarId: "ICS #1",
          icalUid: "m",
          status: "confirmed",
          description: "https://meet.google.com/aaa-bbbb-ccc",
        }),
      ),
    ).toBe("meeting");
  });

  it("dedupes identical UID instances and prefers richer details", () => {
    const start = at("2026-07-12T12:00:00Z");
    const low = createImportedEvent({
      title: "A",
      start,
      end: at("2026-07-12T13:00:00Z"),
      allDay: false,
      calendarName: "A",
      account: "ICS #1",
      location: undefined,
      calendarId: "ICS #1",
      icalUid: "same",
      status: "tentative",
    });
    const high = createImportedEvent({
      title: "A duplicate",
      start,
      end: at("2026-07-12T13:00:00Z"),
      allDay: false,
      calendarName: "B",
      account: "ICS #2",
      location: "Room",
      calendarId: "ICS #2",
      icalUid: "same",
      status: "confirmed",
      description: "https://meet.google.com/x",
    });

    const deduped = dedupeEvents([low, high]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.hasMeet).toBe(true);
    expect(deduped[0]?.location).toBe("Room");
  });
});
