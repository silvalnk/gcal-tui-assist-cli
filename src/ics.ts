import ical from "node-ical";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createImportedEvent,
  type CalendarEvent,
} from "./calendar.js";
import { redactSecret, safeErrorText } from "./sanitize.js";

export const HTTP_CONNECT_TIMEOUT_MS = 10_000;
export const HTTP_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_ICS_BODY_BYTES = 10 * 1024 * 1024;
export const MAX_OCCURRENCES_PER_EVENT = 10_000;
export const MAX_EVENTS_PER_SOURCE = 10_000;
export const HIGH_FREQUENCY_LOOKBACK_DAYS = 366;

const HIGH_FREQ = new Set(["SECONDLY", "MINUTELY", "HOURLY"]);

export function sourceLabel(index: number): string {
  return `ICS #${index + 1}`;
}

export async function fetchSources(
  sources: string[],
  fetchDays: number,
  now = new Date(),
): Promise<CalendarEvent[]> {
  if (sources.length === 0) {
    return [];
  }

  const allEvents: CalendarEvent[] = [];
  const failures: string[] = [];
  let successes = 0;

  for (const [index, source] of sources.entries()) {
    const label = sourceLabel(index);
    try {
      const body = await readSource(source, label);
      const events = parseSource(body, label, fetchDays, now);
      allEvents.push(...events);
      successes += 1;
    } catch (error) {
      const message = `${label}: ${redactSecret(formatError(error), source)}`;
      process.stderr.write(`Skipping ${message}\n`);
      failures.push(message);
    }
  }

  if (successes === 0) {
    throw new Error(
      failures.length === 0
        ? "No ICS source could be read."
        : `No ICS source could be read:\n${failures.join("\n")}`,
    );
  }

  return allEvents;
}

export function parseSource(
  body: string,
  sourceLabelValue: string,
  fetchDays: number,
  now = new Date(),
): CalendarEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(body)) {
    throw new Error(`failed to parse ${sourceLabelValue}: not a VCALENDAR`);
  }

  let parsed: ReturnType<typeof ical.sync.parseICS>;
  try {
    parsed = ical.sync.parseICS(body);
  } catch (error) {
    throw new Error(`failed to parse ${sourceLabelValue}: ${formatError(error)}`);
  }

  const calendarName = calendarNameOf(parsed, sourceLabelValue);
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + Math.max(fetchDays, 1) * 86_400_000);
  const events: CalendarEvent[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || typeof component !== "object") {
      continue;
    }
    const item = component as ical.VEvent;
    if (item.type !== "VEVENT") {
      continue;
    }
    if (String(item.status ?? "").toUpperCase() === "CANCELLED") {
      continue;
    }

    try {
      rejectOldHighFrequency(item, windowStart);
      const converted = convertEvent(item, sourceLabelValue, calendarName, windowStart, windowEnd);
      for (const event of converted) {
        if (events.length >= MAX_EVENTS_PER_SOURCE) {
          return events;
        }
        events.push(event);
      }
    } catch (error) {
      throw new Error(`${sourceLabelValue}: ${formatError(error)}`);
    }

    if (events.length >= MAX_EVENTS_PER_SOURCE) {
      break;
    }
  }

  return events;
}

async function readSource(source: string, label: string): Promise<string> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return fetchHttp(source, label);
  }
  const filePath = source.startsWith("file://")
    ? new URL(source)
    : pathToFileURL(resolve(source));
  const buffer = await readFile(filePath);
  if (buffer.byteLength > MAX_ICS_BODY_BYTES) {
    throw new Error(`${label} body is larger than ${MAX_ICS_BODY_BYTES} bytes`);
  }
  return buffer.toString("utf8");
}

async function fetchHttp(url: string, label: string): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status}`);
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > MAX_ICS_BODY_BYTES) {
      throw new Error(`${label} body is larger than ${MAX_ICS_BODY_BYTES} bytes`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_ICS_BODY_BYTES) {
      throw new Error(`${label} body is larger than ${MAX_ICS_BODY_BYTES} bytes`);
    }
    return buffer.toString("utf8");
  } catch (error) {
    throw new Error(redactSecret(formatError(error), url));
  }
}

function convertEvent(
  item: ical.VEvent,
  account: string,
  calendarName: string,
  windowStart: Date,
  windowEnd: Date,
): CalendarEvent[] {
  const instances = expandInstances(item, windowStart, windowEnd);
  const out: CalendarEvent[] = [];

  for (const instance of instances.slice(0, MAX_OCCURRENCES_PER_EVENT)) {
    const start = instance.start;
    const allDay = Boolean(instance.isFullDay ?? isDateOnly(item));
    const end =
      instance.end ??
      (allDay ? new Date(start.getTime() + 86_400_000) : undefined);
    if (!overlapsWindow(start, end, windowStart, windowEnd)) {
      continue;
    }
    out.push(
      createImportedEvent({
        title: icalText(instance.summary) ?? icalText(item.summary) ?? "",
        start,
        end,
        allDay,
        calendarName,
        account,
        location: icalText(item.location),
        calendarId: account,
        icalUid: icalText(item.uid),
        status: icalText(item.status)?.toLowerCase() ?? "confirmed",
        description: icalText(item.description),
        url: icalText(item.url),
      }),
    );
  }

  return out;
}

type ExpandedInstance = {
  summary?: string;
  start: Date;
  end?: Date;
  isFullDay?: boolean;
};

function expandInstances(
  item: ical.VEvent,
  windowStart: Date,
  windowEnd: Date,
): ExpandedInstance[] {
  const durationMs =
    item.start && item.end ? asDate(item.end).getTime() - asDate(item.start).getTime() : 0;
  const instances: ExpandedInstance[] = [];

  if (typeof ical.expandRecurringEvent === "function") {
    const expanded = ical.expandRecurringEvent(item, {
      from: windowStart,
      to: windowEnd,
      includeOverrides: true,
      excludeExdates: true,
      expandOngoing: true,
    }) as ExpandedInstance[];
    if (Array.isArray(expanded) && expanded.length > 0) {
      instances.push(...expanded.slice(0, MAX_OCCURRENCES_PER_EVENT));
    }
  }

  if (instances.length === 0) {
    if (!item.start) {
      throw new Error("event is missing DTSTART");
    }
    const start = asDate(item.start);
    const end = item.end ? asDate(item.end) : undefined;
    instances.push({
      start,
      end,
      summary: icalText(item.summary),
      isFullDay: isDateOnly(item),
    });
  }

  for (const extraStart of rdateStarts(item)) {
    if (instances.some((instance) => instance.start.getTime() === extraStart.getTime())) {
      continue;
    }
    if (!overlapsWindow(extraStart, new Date(extraStart.getTime() + durationMs), windowStart, windowEnd)) {
      continue;
    }
    instances.push({
      start: extraStart,
      end: durationMs > 0 ? new Date(extraStart.getTime() + durationMs) : undefined,
      summary: icalText(item.summary),
      isFullDay: isDateOnly(item),
    });
  }

  return instances.slice(0, MAX_OCCURRENCES_PER_EVENT);
}

function rdateStarts(item: ical.VEvent): Date[] {
  const raw = (item as { rdate?: unknown }).rdate;
  if (!raw) {
    return [];
  }
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.values(raw)
      : [raw];
  return values.flatMap((value) => {
    if (value instanceof Date) {
      return [value];
    }
    if (typeof value !== "string") {
      return [];
    }
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map(parseIcsDateTime)
      .filter((date): date is Date => date !== undefined);
  });
}

function parseIcsDateTime(value: string): Date | undefined {
  const compact = value.replace(/[-:]/g, "");
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) {
    const dateOnly = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!dateOnly) {
      return undefined;
    }
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[7] ?? ""}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function rejectOldHighFrequency(item: ical.VEvent, windowStart: Date): void {
  const rrule = item.rrule as
    | {
        origOptions?: { freq?: number | string; count?: number; until?: Date };
        options?: { freq?: number | string; count?: number; until?: Date };
        toString?: () => string;
      }
    | undefined;
  const options = rrule?.origOptions ?? rrule?.options;
  const rendered = rrule?.toString?.() ?? "";
  const freqToken = String(options?.freq ?? "").toUpperCase();
  const highFreq =
    HIGH_FREQ.has(freqToken) ||
    (typeof options?.freq === "number" && options.freq >= 4) ||
    /FREQ=(SECONDLY|MINUTELY|HOURLY)/i.test(rendered);
  const unbounded =
    options?.count === undefined &&
    options?.until === undefined &&
    !/;COUNT=/i.test(rendered) &&
    !/;UNTIL=/i.test(rendered);
  if (!highFreq || !unbounded) {
    return;
  }
  const start = item.start ? asDate(item.start) : undefined;
  if (!start) {
    return;
  }
  const days = (windowStart.getTime() - start.getTime()) / 86_400_000;
  if (days > HIGH_FREQUENCY_LOOKBACK_DAYS) {
    throw new Error(
      `skipping high-frequency unbounded recurrence older than ${HIGH_FREQUENCY_LOOKBACK_DAYS} days`,
    );
  }
}

function calendarNameOf(
  parsed: Record<string, unknown>,
  fallback: string,
): string {
  for (const value of Object.values(parsed)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const record = value as Record<string, unknown>;
    const name =
      record["WR-CALNAME"] ??
      record["X-WR-CALNAME"] ??
      record["x-wr-calname"] ??
      (record.type === "VCALENDAR" ? record["CALSCALE"] : undefined);
    if (typeof name === "string" && name.trim().length > 0) {
      return name;
    }
  }
  return fallback;
}

function isDateOnly(item: ical.VEvent): boolean {
  const datetype = (item as { datetype?: string }).datetype;
  if (datetype === "date") {
    return true;
  }
  const start = item.start as { dateOnly?: boolean } | Date | undefined;
  return Boolean(start && typeof start === "object" && "dateOnly" in start && start.dateOnly);
}

function icalText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "val" in value && typeof (value as { val: unknown }).val === "string") {
    return (value as { val: string }).val;
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

function asDate(value: Date | string | { toJSDate?: () => Date }): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    return new Date(value);
  }
  if (value && typeof value.toJSDate === "function") {
    return value.toJSDate();
  }
  return new Date(String(value));
}

function overlapsWindow(
  start: Date,
  end: Date | undefined,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const effectiveEnd = end ?? start;
  return effectiveEnd.getTime() >= windowStart.getTime() && start.getTime() <= windowEnd.getTime();
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return safeErrorText(error.message, 240);
  }
  return safeErrorText(String(error), 240);
}
