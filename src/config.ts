import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseThemeName, type ThemeName } from "./theme.js";

export type AppConfig = {
  ics: string[];
  theme?: ThemeName;
  fetchDays?: number;
  details?: boolean;
};

export function defaultConfigPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const root = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(root, "gcal-tui", "config.json");
}

export async function loadConfig(path = defaultConfigPath()): Promise<AppConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return { ics: [] };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Config file is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config file must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  const ics = Array.isArray(record.ics)
    ? record.ics.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const theme =
    typeof record.theme === "string" ? parseThemeName(record.theme) : undefined;
  const fetchDays =
    typeof record.fetchDays === "number" && Number.isFinite(record.fetchDays)
      ? Math.max(1, Math.trunc(record.fetchDays))
      : undefined;
  const details = typeof record.details === "boolean" ? record.details : undefined;

  return { ics, theme, fetchDays, details };
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT",
  );
}
