import { sanitizeDisplayText, sanitizeImportedTitle } from "./sanitize.js";

export type EventCategory =
  | "holiday"
  | "birthday"
  | "travel"
  | "focus"
  | "out_of_office"
  | "meeting"
  | "all_day"
  | "other";

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date | undefined;
  allDay: boolean;
  calendarName: string;
  account: string;
  location: string | undefined;
  hasMeet: boolean;
  primaryCalendar: boolean;
  calendarId: string;
  eventType: string | undefined;
  icalUid: string | undefined;
  status: string | undefined;
};

export type ImportedEvent = {
  title: string;
  start: Date;
  end: Date | undefined;
  allDay: boolean;
  calendarName: string;
  account: string;
  location: string | undefined;
  calendarId: string;
  icalUid: string | undefined;
  status: string | undefined;
  description?: string;
  url?: string;
};

const HOLIDAY_TITLE_TERMS = [
  "holiday",
  "christmas",
  "new year",
  "thanksgiving",
  "memorial day",
  "labor day",
  "independence day",
  "easter",
  "good friday",
  "carnival",
  "tiradentes",
  "finados",
  "natal",
  "ano novo",
  "confraternização",
  "confraternizacao",
  "proclamação",
  "proclamacao",
  "consciência negra",
  "consciencia negra",
  "corpus christi",
  "paixão de cristo",
  "paixao de cristo",
  "feriado",
];

const VIDEO_HOSTS = ["meet.google.com", "zoom.us", "teams.microsoft.com"];

const DEFAULT_STATUS = "confirmed";

export function createImportedEvent(input: ImportedEvent): CalendarEvent {
  const location = input.location
    ? sanitizeDisplayText(input.location)
    : undefined;

  return {
    title: sanitizeImportedTitle(input.title),
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    calendarName: sanitizeDisplayText(input.calendarName),
    account: sanitizeDisplayText(input.account),
    location: location && location.length > 0 ? location : undefined,
    hasMeet: detectVideoLink(input.description, input.location, input.url),
    primaryCalendar: false,
    calendarId: sanitizeDisplayText(input.calendarId),
    eventType: "imported",
    icalUid: input.icalUid
      ? sanitizeDisplayText(input.icalUid) || undefined
      : undefined,
    status: input.status
      ? sanitizeDisplayText(input.status) || undefined
      : DEFAULT_STATUS,
  };
}

export function testEvent(title: string, start: Date): CalendarEvent {
  return createImportedEvent({
    title,
    start,
    end: new Date(start.getTime() + 60 * 60 * 1000),
    allDay: false,
    calendarName: "Calendar",
    account: "ICS #1",
    location: undefined,
    calendarId: "ICS #1",
    icalUid: title,
    status: "confirmed",
  });
}

export function isPast(event: CalendarEvent, now: Date): boolean {
  const end = event.end ?? event.start;
  return end.getTime() < now.getTime();
}

export function startDateKey(event: CalendarEvent): string {
  return localDateKey(event.start);
}

export function durationMinutes(event: CalendarEvent): number | undefined {
  if (event.allDay || !event.end) {
    return undefined;
  }
  const minutes = Math.round((event.end.getTime() - event.start.getTime()) / 60_000);
  return minutes > 0 ? minutes : undefined;
}

export function isMultiDay(event: CalendarEvent): boolean {
  if (!event.end) {
    return false;
  }
  if (event.allDay) {
    const nextDay = addLocalDays(event.start, 1);
    return localDateKey(event.end) > localDateKey(nextDay);
  }
  return localDateKey(event.end) > localDateKey(event.start);
}

export function categoryOf(event: CalendarEvent): EventCategory {
  if (isHoliday(event)) {
    return "holiday";
  }
  if (isBirthday(event)) {
    return "birthday";
  }
  if (isOutOfOffice(event)) {
    return "out_of_office";
  }
  if (isFocusTime(event)) {
    return "focus";
  }
  if (isTravel(event)) {
    return "travel";
  }
  if (event.hasMeet) {
    return "meeting";
  }
  return event.allDay ? "all_day" : "other";
}

export function detectVideoLink(
  ...fields: Array<string | undefined>
): boolean {
  const text = fields.filter(Boolean).join(" ").toLowerCase();
  return VIDEO_HOSTS.some((host) => text.includes(host));
}

export function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const byKey = new Map<string, CalendarEvent>();
  for (const event of events) {
    const key = dedupeKey(event);
    const existing = byKey.get(key);
    if (!existing || rankForDedupe(event) > rankForDedupe(existing)) {
      byKey.set(key, event);
    }
  }
  return [...byKey.values()].sort(sortEvents);
}

export function sortEvents(a: CalendarEvent, b: CalendarEvent): number {
  const dateCmp = startDateKey(a).localeCompare(startDateKey(b));
  if (dateCmp !== 0) {
    return dateCmp;
  }
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  const timeCmp = localTimeKey(a.start).localeCompare(localTimeKey(b.start));
  if (timeCmp !== 0) {
    return timeCmp;
  }
  return normalizeText(a.title).localeCompare(normalizeText(b.title));
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isoWeek(date: Date): { year: number; week: number } {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) /
        7,
    );
  return { year: tmp.getFullYear(), week };
}

function isHoliday(event: CalendarEvent): boolean {
  return (
    containsAny(
      [event.calendarId, event.calendarName],
      [
        "#holiday@",
        "holiday@group.v.calendar.google.com",
        "holiday",
        "holidays",
        "feriado",
        "feriados",
        "festivo",
        "festivos",
        "dias festivos",
      ],
    ) || (event.allDay && containsAny([event.title], HOLIDAY_TITLE_TERMS))
  );
}

function isBirthday(event: CalendarEvent): boolean {
  return (
    event.eventType === "birthday" ||
    containsAny([event.title], ["birthday", "aniversário", "aniversario"])
  );
}

function isOutOfOffice(event: CalendarEvent): boolean {
  return (
    event.eventType === "outOfOffice" ||
    containsAny(
      [event.title, event.calendarName],
      ["out of office", "ooo", "vacation", "holiday leave", "férias", "ferias", "ausente"],
    )
  );
}

function isFocusTime(event: CalendarEvent): boolean {
  return (
    event.eventType === "focusTime" ||
    containsAny([event.title], ["focus", "deep work", "foco", "concentration"])
  );
}

function isTravel(event: CalendarEvent): boolean {
  return containsAny(
    [event.title, event.location ?? "", event.calendarName],
    [
      "flight",
      "voo",
      "airport",
      "aeroporto",
      "boarding",
      "embarque",
      "hotel",
      "travel",
      "trip",
      "viagem",
      "train",
      "trem",
      "bus",
      "ônibus",
      "onibus",
      "reservation",
      "reserva",
    ],
  );
}

function containsAny(values: string[], terms: string[]): boolean {
  return values.some((value) => {
    const normalized = normalizeText(value);
    return terms.some((term) => normalized.includes(normalizeText(term)));
  });
}

function normalizeText(value: string): string {
  return value.normalize("NFKD").toLowerCase();
}

function dedupeKey(event: CalendarEvent): string {
  const endTimestamp = event.end?.getTime() ?? 0;
  if (event.icalUid) {
    return `ical:${normalizeText(event.icalUid)}|${event.start.getTime()}|${endTimestamp}`;
  }
  return `fallback:${normalizeText(event.title)}|${event.start.getTime()}|${endTimestamp}`;
}

function rankForDedupe(event: CalendarEvent): number {
  const confirmed = event.status === "confirmed" ? 8 : 0;
  const primary = event.primaryCalendar ? 4 : 0;
  const details = event.hasMeet || event.location ? 2 : 0;
  const titled = event.title.trim().length > 0 ? 1 : 0;
  return confirmed + primary + details + titled;
}

function localTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}
