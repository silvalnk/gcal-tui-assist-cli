import type { CalendarEvent, EventCategory } from "./calendar.js";
import { categoryOf, durationMinutes, isMultiDay } from "./calendar.js";
import { categoryColor, type Palette, type RgbColor } from "./theme.js";

const ANSI_RESET = "\u001b[0m";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function dayLabel(date: Date, today: Date): string {
  if (sameLocalDay(date, today)) {
    return "Today";
  }
  const tomorrow = new Date(today.getTime());
  tomorrow.setDate(today.getDate() + 1);
  if (sameLocalDay(date, tomorrow)) {
    return "Tomorrow";
  }
  return compactDayLabel(date);
}

export function compactDayLabel(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function timeLabel(event: CalendarEvent): string {
  if (event.allDay) {
    return isMultiDay(event) ? "multi" : "all-day";
  }
  return `${pad2(event.start.getHours())}:${pad2(event.start.getMinutes())}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${pad2(mins)}`;
}

export function stdoutColorsEnabled(disabledByCli: boolean): boolean {
  return !disabledByCli && process.env.NO_COLOR === undefined;
}

export function colorizeDayLabel(
  label: string,
  date: Date,
  today: Date,
  enabled: boolean,
  palette: Palette,
): string {
  const color = sameLocalDay(date, today) ? palette.today : palette.accent;
  return ansiColor(label, color, true, false, enabled);
}

export function colorizeTimeLabel(
  label: string,
  category: EventCategory,
  enabled: boolean,
  palette: Palette,
): string {
  const color = category === "other" ? palette.muted : categoryColor(palette, category);
  return ansiColor(label, color, false, false, enabled);
}

export function colorizeTitle(
  label: string,
  category: EventCategory,
  enabled: boolean,
  palette: Palette,
): string {
  return ansiColor(
    label,
    categoryColor(palette, category),
    category === "holiday",
    category === "out_of_office",
    enabled,
  );
}

export function colorizeDetails(label: string, enabled: boolean, palette: Palette): string {
  return ansiColor(label, palette.dim, false, false, enabled);
}

export function eventDetails(event: CalendarEvent): string {
  const parts: string[] = [];
  const minutes = durationMinutes(event);
  if (minutes !== undefined) {
    parts.push(formatDuration(minutes));
  }
  if (event.hasMeet) {
    parts.push("Meet");
  }
  parts.push(`${event.account} · ${event.calendarName}`);
  if (event.location) {
    parts.push(event.location);
  }
  return parts.join(" · ");
}

export function printEvents(
  events: CalendarEvent[],
  showDetails: boolean,
  useColor: boolean,
  palette: Palette,
  today = new Date(),
): string {
  if (events.length === 0) {
    return "No upcoming appointments.\n";
  }

  const lines: string[] = [];
  let currentDay: string | undefined;

  for (const event of events) {
    const eventDay = localDayStamp(event.start);
    if (currentDay !== eventDay) {
      if (currentDay !== undefined) {
        lines.push("");
      }
      const label = dayLabel(event.start, today);
      lines.push(colorizeDayLabel(label, event.start, today, useColor, palette));
      currentDay = eventDay;
    }
    lines.push(eventLine(event, showDetails, useColor, palette));
  }

  return `${lines.join("\n")}\n`;
}

export function eventLine(
  event: CalendarEvent,
  showDetails: boolean,
  useColor: boolean,
  palette: Palette,
): string {
  const category = categoryOf(event);
  const time = colorizeTimeLabel(timeLabel(event).padEnd(7, " "), category, useColor, palette);
  const title = colorizeTitle(event.title, category, useColor, palette);
  if (showDetails) {
    const details = colorizeDetails(eventDetails(event), useColor, palette);
    return ` ${time} ${title} ${details}`;
  }
  return ` ${time} ${title}`;
}

function ansiColor(
  label: string,
  color: RgbColor,
  bold: boolean,
  italic: boolean,
  enabled: boolean,
): string {
  if (!enabled) {
    return label;
  }
  const codes: string[] = [];
  if (bold) {
    codes.push("1");
  }
  if (italic) {
    codes.push("3");
  }
  codes.push(`38;2;${color.red};${color.green};${color.blue}`);
  return `\u001b[${codes.join(";")}m${label}${ANSI_RESET}`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function localDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
