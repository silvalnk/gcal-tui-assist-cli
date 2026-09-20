import stringWidth from "string-width";
import type { CalendarEvent } from "./calendar.js";
import { categoryOf, durationMinutes, isoWeek } from "./calendar.js";
import {
  compactDayLabel,
  dayLabel,
  formatDuration,
  timeLabel,
} from "./display.js";
import { categoryColor, type Palette, type RgbColor } from "./theme.js";

const MIN_BODY_WIDTH = 10;
const MIN_BODY_ROWS = 2;
const COMPACT_EVENT_WIDTH = 18;
const CATEGORY_MARKER_MIN_WIDTH = 20;
const META_MIN_TITLE_GAP = 12;
const SOURCE_META_MIN_WIDTH = 60;
const LOCATION_META_MIN_WIDTH = 96;
const FOOTER_TINY_WIDTH = 20;
const FOOTER_COMPACT_WIDTH = 36;

export type PlanSummary = {
  firstHidden?: number;
  lastVisible?: number;
  canMore: boolean;
  moreHiddenCount: number;
  moreLabel?: string;
  moreEndIndex?: number;
};

export type BodyLine = {
  text: string;
  spans: Array<{ text: string; color: RgbColor; bold?: boolean; italic?: boolean }>;
};

export type BodyPlan = {
  lines: BodyLine[];
  summary: PlanSummary;
};

export type AppState = {
  events: CalendarEvent[];
  showDetails: boolean;
  startIndex: number;
  periodEndIndex?: number;
  lastPlan: PlanSummary;
  palette: Palette;
};

export function more(state: AppState): void {
  if (state.lastPlan.canMore && state.lastPlan.firstHidden !== undefined) {
    state.startIndex = Math.min(state.lastPlan.firstHidden, state.events.length);
    state.periodEndIndex = state.lastPlan.moreEndIndex;
  }
}

export function top(state: AppState): void {
  state.startIndex = 0;
  state.periodEndIndex = undefined;
}

export function buildBodyPlan(
  events: CalendarEvent[],
  startIndex: number,
  periodEndIndex: number | undefined,
  showDetails: boolean,
  bodyRows: number,
  width: number,
  palette: Palette,
  today = new Date(),
): BodyPlan {
  if (bodyRows === 0) {
    return { lines: [], summary: emptySummary() };
  }

  if (width < MIN_BODY_WIDTH || bodyRows < MIN_BODY_ROWS) {
    return {
      lines: [plainLine(truncateToWidth("Terminal too small.", width), palette.muted)],
      summary: emptySummary(),
    };
  }

  if (events.length === 0) {
    const lines = [plainLine("No upcoming appointments.", palette.foreground)];
    if (bodyRows > 1) {
      lines.push(plainLine("Your calendar is clear.", palette.dim));
    }
    return { lines, summary: emptySummary() };
  }

  const start = Math.min(startIndex, Math.max(events.length - 1, 0));
  const endIndex = Math.min(periodEndIndex ?? events.length, events.length);
  const lines: BodyLine[] = [];
  let currentDay: string | undefined;
  let index = start;
  const summary: PlanSummary = emptySummary();

  while (index < endIndex) {
    const event = events[index]!;
    const eventDay = localDay(event.start);
    const needsDayHeader = currentDay !== eventDay;
    const neededRows = (needsDayHeader ? 1 : 0) + 1;
    if (lines.length + neededRows > bodyRows) {
      summary.firstHidden = index;
      break;
    }
    if (needsDayHeader) {
      const color = sameLocalDay(event.start, today) ? palette.today : palette.accent;
      lines.push(plainLine(truncateToWidth(dayLabel(event.start, today), width), color, true));
      currentDay = eventDay;
    }
    lines.push(eventLine(event, showDetails, width, palette));
    summary.lastVisible = index;
    index += 1;
  }

  fillMoreSummary(events, summary, today);
  return { lines, summary };
}

export function footerText(state: {
  startIndex: number;
  lastPlan: PlanSummary;
  events: CalendarEvent[];
}, width: number): string {
  const parts = ["q quit"];
  if (state.startIndex > 0) {
    parts.push("0 top");
  }
  if (state.lastPlan.canMore) {
    const label = state.lastPlan.moreLabel ?? "this period";
    parts.push(`m more · ${state.lastPlan.moreHiddenCount} hidden ${label}`);
  } else if (
    state.lastPlan.lastVisible !== undefined &&
    state.lastPlan.firstHidden !== undefined
  ) {
    const date = state.events[state.lastPlan.lastVisible]!.start;
    parts.push(`showing through ${compactDayLabel(date)}`);
  }

  const full = parts.join(" · ");
  if (width < FOOTER_TINY_WIDTH) {
    return truncateToWidth("q", width);
  }
  if (width < FOOTER_COMPACT_WIDTH) {
    return truncateToWidth(state.lastPlan.canMore ? "q · m" : "q", width);
  }
  return truncateToWidth(full, width);
}

export function truncateToWidth(value: string, maxWidth: number): string {
  if (stringWidth(value) <= maxWidth) {
    return value;
  }
  if (maxWidth === 0) {
    return "";
  }
  if (maxWidth === 1) {
    return "…";
  }
  let out = "";
  let used = 0;
  for (const ch of value) {
    const chWidth = stringWidth(ch);
    if (used + chWidth + 1 > maxWidth) {
      break;
    }
    out += ch;
    used += chWidth;
  }
  return `${out}…`;
}

export async function runTui(
  events: CalendarEvent[],
  showDetails: boolean,
  palette: Palette,
): Promise<void> {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new Error("TUI requires a terminal.");
  }

  const state: AppState = {
    events,
    showDetails,
    startIndex: 0,
    lastPlan: emptySummary(),
    palette,
  };

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write("\u001b[?1049h\u001b[?25l");

  const restore = (): void => {
    process.stdout.write("\u001b[?25h\u001b[?1049l");
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  };

  const draw = (): void => {
    const width = process.stdout.columns ?? 80;
    const height = process.stdout.rows ?? 24;
    const bodyRows = Math.max(height - 1, 0);
    const plan = buildBodyPlan(
      state.events,
      state.startIndex,
      state.periodEndIndex,
      state.showDetails,
      bodyRows,
      width,
      state.palette,
    );
    state.lastPlan = plan.summary;
    const body = plan.lines.map((line) => renderLine(line, width)).join("\n");
    const footer = ansiFg(footerText(state, width), state.palette.muted);
    process.stdout.write(`\u001b[H\u001b[J${body}\n${footer}`);
  };

  try {
    draw();
    await new Promise<void>((resolve, reject) => {
      const onResize = (): void => {
        draw();
      };
      const onData = (chunk: Buffer): void => {
        const key = chunk.toString("utf8");
        if (key === "q" || key === "\u001b" || key === "\u0003") {
          cleanup();
          resolve();
          return;
        }
        if (key === "m" || key === " " || key === "\u001b[B") {
          more(state);
          draw();
          return;
        }
        if (key === "0" || key === "\u001b[H") {
          top(state);
          draw();
        }
      };
      const cleanup = (): void => {
        process.stdin.off("data", onData);
        process.stdout.off("resize", onResize);
      };
      process.stdin.on("data", onData);
      process.stdout.on("resize", onResize);
      process.stdin.once("error", (error) => {
        cleanup();
        reject(error);
      });
    });
  } finally {
    restore();
  }
}

function eventLine(
  event: CalendarEvent,
  showDetails: boolean,
  width: number,
  palette: Palette,
): BodyLine {
  const category = categoryOf(event);
  const marker = width >= CATEGORY_MARKER_MIN_WIDTH ? "▏ " : "";
  const markerColor = categoryColor(palette, category);

  if (width < COMPACT_EVENT_WIDTH) {
    return {
      text: truncateToWidth(event.title, width),
      spans: [{ text: truncateToWidth(event.title, width), color: palette.foreground }],
    };
  }

  const timeColumn = timeLabel(event).padEnd(7, " ");
  const prefixWidth = stringWidth(marker) + stringWidth(timeColumn) + 1;
  const meta = metaLabel(event, showDetails, width);
  const metaWidth = stringWidth(meta);
  const showMeta = meta.length > 0 && width > prefixWidth + metaWidth + META_MIN_TITLE_GAP;
  const titleWidth = showMeta
    ? Math.max(width - prefixWidth - metaWidth - 2, 1)
    : Math.max(width - prefixWidth, 1);
  const title = truncateToWidth(event.title, titleWidth);
  const used = prefixWidth + stringWidth(title);
  const timeColor =
    category === "holiday" || category === "out_of_office"
      ? categoryColor(palette, category)
      : palette.muted;

  const spans: BodyLine["spans"] = [];
  if (marker) {
    spans.push({ text: marker, color: markerColor });
  }
  spans.push({ text: timeColumn, color: timeColor });
  spans.push({ text: " ", color: palette.foreground });
  spans.push({
    text: title,
    color: palette.foreground,
    bold: category === "holiday",
    italic: category === "out_of_office",
  });
  if (showMeta) {
    const padding = Math.max(width - used - metaWidth, 1);
    spans.push({ text: " ".repeat(padding), color: palette.foreground });
    spans.push({ text: meta, color: palette.dim });
  }

  return { text: spans.map((span) => span.text).join(""), spans };
}

function metaLabel(event: CalendarEvent, showDetails: boolean, width: number): string {
  if (!showDetails) {
    return "";
  }
  const parts: string[] = [];
  const minutes = durationMinutes(event);
  if (minutes !== undefined) {
    parts.push(formatDuration(minutes));
  }
  if (event.hasMeet) {
    parts.push("Meet");
  }
  if (width >= SOURCE_META_MIN_WIDTH) {
    parts.push(`${event.account} · ${event.calendarName}`);
  }
  if (width >= LOCATION_META_MIN_WIDTH && event.location) {
    parts.push(event.location);
  }
  return parts.join(" · ");
}

function fillMoreSummary(
  events: CalendarEvent[],
  summary: PlanSummary,
  today: Date,
): void {
  const firstHidden = summary.firstHidden;
  const lastVisible = summary.lastVisible;
  if (firstHidden === undefined || lastVisible === undefined) {
    return;
  }

  const hiddenDay = events[firstHidden]!.start;
  const visibleDay = events[lastVisible]!.start;

  if (sameLocalDay(hiddenDay, visibleDay)) {
    const count = events
      .slice(firstHidden)
      .filter((event) => sameLocalDay(event.start, hiddenDay)).length;
    summary.canMore = true;
    summary.moreHiddenCount = count;
    summary.moreEndIndex = firstHidden + count;
    summary.moreLabel = sameLocalDay(hiddenDay, today) ? "today" : "that day";
    return;
  }

  const hiddenWeek = isoWeek(hiddenDay);
  const visibleWeek = isoWeek(visibleDay);
  if (hiddenWeek.year === visibleWeek.year && hiddenWeek.week === visibleWeek.week) {
    const todayWeek = isoWeek(today);
    const count = events.slice(firstHidden).filter((event) => {
      const week = isoWeek(event.start);
      return week.year === hiddenWeek.year && week.week === hiddenWeek.week;
    }).length;
    summary.canMore = true;
    summary.moreHiddenCount = count;
    summary.moreEndIndex = firstHidden + count;
    summary.moreLabel =
      hiddenWeek.year === todayWeek.year && hiddenWeek.week === todayWeek.week
        ? "this week"
        : "that week";
    return;
  }

  summary.canMore = true;
  summary.moreHiddenCount = events.length - firstHidden;
  summary.moreEndIndex = undefined;
  summary.moreLabel = "later";
}

function emptySummary(): PlanSummary {
  return { canMore: false, moreHiddenCount: 0 };
}

function plainLine(text: string, color: RgbColor, bold = false): BodyLine {
  return { text, spans: [{ text, color, bold }] };
}

function renderLine(line: BodyLine, width: number): string {
  return line.spans
    .map((span) => ansiStyle(truncateToWidth(span.text, width), span.color, span.bold, span.italic))
    .join("");
}

function ansiFg(text: string, color: RgbColor): string {
  return ansiStyle(text, color, false, false);
}

function ansiStyle(text: string, color: RgbColor, bold?: boolean, italic?: boolean): string {
  const codes: string[] = [];
  if (bold) {
    codes.push("1");
  }
  if (italic) {
    codes.push("3");
  }
  codes.push(`38;2;${color.red};${color.green};${color.blue}`);
  return `\u001b[${codes.join(";")}m${text}\u001b[0m`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
