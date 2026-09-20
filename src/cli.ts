import { Command, InvalidArgumentError } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dedupeEvents, isPast, type CalendarEvent } from "./calendar.js";
import { loadConfig } from "./config.js";
import { buildDemoEvents } from "./demo.js";
import { printEvents, stdoutColorsEnabled } from "./display.js";
import { fetchSources } from "./ics.js";
import { PALETTES, parseThemeName, type ThemeName } from "./theme.js";
import { runTui } from "./ui.js";

const WIDGET_THEME_ENV = "TCLOCK_WIDGET_THEME";
const DEFAULT_FETCH_DAYS = 60;

export type CliOptions = {
  ics: string[];
  demo: boolean;
  details: boolean;
  tui: boolean;
  noColor?: boolean;
  color?: boolean;
  theme?: string;
  fetchDays: number;
  config?: string;
};

export function createProgram(): Command {
  return new Command()
    .name("gcal-tui")
    .description(
      "A quiet, read-only terminal agenda for Google Calendar via private ICS (WSL-friendly)",
    )
    .version(readPackageVersion())
    .option(
      "--ics <source>",
      "Fetch events from a private ICS/iCal URL or local file. Repeat for multiple calendars.",
      collect,
      [] as string[],
    )
    .option("--demo", "Include built-in sample appointments around today", false)
    .option("--details", "Show duration, Meet, source, calendar, and location", false)
    .option("--tui", "Interactive screen-fitting view with the more command", false)
    .option("--no-color", "Disable ANSI colors in plain stdout mode", false)
    .option("--theme <theme>", "Color theme: default, evangelion, nerv")
    .option(
      "--fetch-days <days>",
      "Number of future days to fetch once at startup",
      parseDays,
      DEFAULT_FETCH_DAYS,
    )
    .option("--config <path>", "Config JSON path (default: ~/.config/gcal-tui/config.json)");
}

export function resolveTheme(
  cliTheme: string | undefined,
  configTheme: ThemeName | undefined,
): ThemeName {
  const fromCli = parseThemeName(cliTheme);
  if (cliTheme && !fromCli) {
    throw new InvalidArgumentError("theme must be default, evangelion, or nerv");
  }
  if (fromCli) {
    return fromCli;
  }
  const fromEnv = parseThemeName(process.env[WIDGET_THEME_ENV]);
  if (fromEnv) {
    return fromEnv;
  }
  return configTheme ?? "default";
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = createProgram();
  program.exitOverride();
  const parsed = program.parse(argv, { from: "node" });
  const options = parsed.opts<CliOptions>();
  await execute(options);
}

export async function execute(options: CliOptions): Promise<void> {
  const config = await loadConfig(options.config);
  const theme = resolveTheme(options.theme, config.theme);
  const fetchDays = Math.max(1, options.fetchDays || config.fetchDays || DEFAULT_FETCH_DAYS);
  const details = options.details || Boolean(config.details);
  const sources = [...options.ics, ...(!options.ics.length ? config.ics : [])];

  const now = new Date();
  const events: CalendarEvent[] = [];

  if (options.demo) {
    events.push(...buildDemoEvents(now));
  }

  if (sources.length > 0) {
    events.push(...(await fetchSources(sources, fetchDays, now)));
  }

  if (!options.demo && sources.length === 0) {
    process.stderr.write(
      "No ICS sources. Pass --ics <url-or-file>, --demo, or add ics[] to ~/.config/gcal-tui/config.json.\n",
    );
    process.exitCode = 1;
    return;
  }

  const upcoming = dedupeEvents(events).filter((event) => !isPast(event, now));
  const palette = PALETTES[theme];

  if (options.tui) {
    await runTui(upcoming, details, palette);
    return;
  }

  process.stdout.write(
    printEvents(
      upcoming,
      details,
      stdoutColorsEnabled(Boolean(options.noColor) || options.color === false),
      palette,
      now,
    ),
  );
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

function parseDays(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new InvalidArgumentError("fetch-days must be a number");
  }
  return Math.max(1, parsed);
}

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
