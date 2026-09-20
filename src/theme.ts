export type ThemeName = "default" | "evangelion" | "nerv";

export type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

export type Palette = {
  foreground: RgbColor;
  muted: RgbColor;
  dim: RgbColor;
  accent: RgbColor;
  today: RgbColor;
  holiday: RgbColor;
  birthday: RgbColor;
  travel: RgbColor;
  focus: RgbColor;
  outOfOffice: RgbColor;
  meeting: RgbColor;
  allDay: RgbColor;
};

const rgb = (red: number, green: number, blue: number): RgbColor => ({
  red,
  green,
  blue,
});

export const THEME_NAMES: ThemeName[] = ["default", "evangelion", "nerv"];

export const PALETTES: Record<ThemeName, Palette> = {
  default: {
    foreground: rgb(218, 218, 218),
    muted: rgb(120, 126, 135),
    dim: rgb(88, 93, 101),
    accent: rgb(122, 162, 247),
    today: rgb(180, 220, 140),
    holiday: rgb(245, 194, 129),
    birthday: rgb(203, 166, 247),
    travel: rgb(137, 180, 250),
    focus: rgb(166, 227, 161),
    outOfOffice: rgb(243, 139, 168),
    meeting: rgb(122, 162, 247),
    allDay: rgb(186, 194, 222),
  },
  evangelion: {
    foreground: rgb(215, 95, 255),
    muted: rgb(255, 135, 0),
    dim: rgb(135, 135, 175),
    accent: rgb(135, 255, 0),
    today: rgb(135, 255, 0),
    holiday: rgb(255, 135, 0),
    birthday: rgb(215, 95, 255),
    travel: rgb(135, 95, 255),
    focus: rgb(135, 255, 0),
    outOfOffice: rgb(255, 135, 0),
    meeting: rgb(135, 95, 255),
    allDay: rgb(135, 135, 175),
  },
  nerv: {
    foreground: rgb(255, 175, 0),
    muted: rgb(215, 135, 0),
    dim: rgb(102, 102, 102),
    accent: rgb(0, 255, 135),
    today: rgb(0, 255, 135),
    holiday: rgb(255, 135, 0),
    birthday: rgb(255, 175, 0),
    travel: rgb(215, 135, 0),
    focus: rgb(0, 255, 135),
    outOfOffice: rgb(255, 0, 0),
    meeting: rgb(255, 135, 0),
    allDay: rgb(102, 102, 102),
  },
};

export function parseThemeName(value: string | undefined): ThemeName | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return THEME_NAMES.find((name) => name === normalized);
}

export function categoryColor(
  palette: Palette,
  category: import("./calendar.js").EventCategory,
): RgbColor {
  switch (category) {
    case "holiday":
      return palette.holiday;
    case "birthday":
      return palette.birthday;
    case "travel":
      return palette.travel;
    case "focus":
      return palette.focus;
    case "out_of_office":
      return palette.outOfOffice;
    case "meeting":
      return palette.meeting;
    case "all_day":
      return palette.allDay;
    default:
      return palette.foreground;
  }
}
