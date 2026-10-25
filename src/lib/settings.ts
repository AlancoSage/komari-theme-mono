export type AccentKey =
  | "mono"
  | "violet"
  | "blue"
  | "cyan"
  | "emerald"
  | "lime"
  | "amber"
  | "orange"
  | "rose"
  | "pink"
  | "custom";

/** `mono` is the reference palette: white on dark, ink on light. */
export const ACCENTS: Record<AccentKey, { fill: string; on: string } | null> = {
  mono: null,
  violet: { fill: "#c4b5fd", on: "#1b1b1b" },
  blue: { fill: "#93c5fd", on: "#1b1b1b" },
  cyan: { fill: "#67e8f9", on: "#1b1b1b" },
  emerald: { fill: "#6ee7b7", on: "#1b1b1b" },
  lime: { fill: "#bef264", on: "#1b1b1b" },
  amber: { fill: "#fcd34d", on: "#1b1b1b" },
  orange: { fill: "#fdba74", on: "#1b1b1b" },
  rose: { fill: "#fda4af", on: "#1b1b1b" },
  pink: { fill: "#f0abfc", on: "#1b1b1b" },
  custom: null,
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Accepts `#abc`, `abcdef`, `#AABBCC`; returns `#aabbcc` or null. */
export function normalizeHex(value: string): string | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  const body = match[1].toLowerCase();
  const full =
    body.length === 3
      ? body
          .split("")
          .map((char) => char + char)
          .join("")
      : body;
  return `#${full}`;
}

function luminance(hex: string): number {
  const channels = [0, 1, 2].map((index) => {
    const raw = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Readable ink for a swatch: dark on pastels, white on deep colours. */
export function inkOn(hex: string): string {
  return luminance(hex) > 0.42 ? "#1b1b1b" : "#ffffff";
}

/**
 * Every enum-like setting is a plain text field on purpose: Komari's admin form
 * renders `select` by calling `.split(",")` on `options`, and a cached or older
 * manifest with array options crashes the whole theme page. Text fields can't
 * crash anything, so we accept sloppy input instead: "violet", "Violet",
 * "紫罗兰 (violet)" and "紫罗兰（violet）" all resolve to `violet`.
 */
export function parseChoice<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text) return fallback;
  const labelled = /[（(]\s*([a-z0-9_-]+)\s*[)）]\s*$/.exec(text);
  const code = (labelled ? labelled[1] : text).trim();
  const exact = allowed.find((item) => item.toLowerCase() === code);
  if (exact) return exact;
  const loose = allowed.find((item) => code.includes(item.toLowerCase()));
  return loose ?? fallback;
}

export const ACCENT_KEYS = [
  "mono",
  "violet",
  "blue",
  "cyan",
  "emerald",
  "lime",
  "amber",
  "orange",
  "rose",
  "pink",
  "custom",
] as const satisfies readonly AccentKey[];

/** The palette picker saves its label ("紫罗兰 (violet)"), so dig out the code. */
export function parseAccentKey(value: unknown): AccentKey {
  return parseChoice(value, ACCENT_KEYS, "mono");
}

/** `null` means "keep the theme ink", which is what `mono` does. */
export function resolveAccent(settings: ThemeSettings): { fill: string; on: string } | null {
  if (settings.accent === "custom") {
    const hex = normalizeHex(settings.accentColor);
    return hex ? { fill: hex, on: inkOn(hex) } : null;
  }
  return ACCENTS[settings.accent] ?? null;
}

export type FontKey = "system" | "sans" | "serif" | "mono" | "rounded" | "custom";

/**
 * Stacks lean on fonts that are already installed. Nothing is downloaded unless
 * the admin supplies `fontUrl`; that keeps the theme package free of binaries.
 */
export const FONTS: Record<Exclude<FontKey, "custom">, string> = {
  system:
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  sans: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  serif:
    '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, "Sarasa Mono SC", "Microsoft YaHei Mono", Consolas, monospace',
  rounded:
    '"Quicksand", "Varela Round", ui-rounded, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
};

export interface ThemeSettings {
  accent: AccentKey;
  accentColor: string;
  density: "comfortable" | "compact";
  grain: boolean;
  showSidebar: boolean;
  showTraffic: boolean;
  showPing: boolean;
  showExpiry: boolean;
  showPrice: boolean;
  showSparkline: boolean;
  featuredPingTasks: number[];
  featuredNodes: string[];
  historyHours: number;
  footerHtml: string;
  banner: string;
  logoUrl: string;
  logoText: string;
  background: string;
  backgroundLight: string;
  backgroundDark: string;
  backgroundVeil: number;
  backgroundBlur: number;
  backgroundFit: "cover" | "contain" | "tile";
  fontFamily: FontKey;
  fontStack: string;
  fontSize: number;
  fontUrl: string;
  tabularNumbers: boolean;
  showMap: boolean;
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  accent: "mono",
  accentColor: "",
  density: "comfortable",
  grain: true,
  showSidebar: true,
  showTraffic: true,
  showPing: true,
  showExpiry: true,
  showPrice: false,
  showSparkline: true,
  featuredPingTasks: [],
  featuredNodes: [],
  historyHours: 4,
  footerHtml: "",
  banner: "",
  logoUrl: "",
  logoText: "",
  background: "",
  backgroundLight: "",
  backgroundDark: "",
  backgroundVeil: 55,
  backgroundBlur: 0,
  backgroundFit: "cover",
  fontFamily: "system",
  fontStack: "",
  fontSize: 15,
  fontUrl: "",
  tabularNumbers: true,
  showMap: true,
};

type Raw = Record<string, unknown> | null | undefined;

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }
  return fallback;
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Komari's admin form only has string/switch/select/number/richtext widgets, so
 * list settings arrive either as a comma separated string ("a,b") or, from
 * older themes/builds, as a JSON array string ("[\"a\"]").
 */
function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function asIdList(value: unknown): number[] {
  return asList(value)
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item));
}

function asStringList(value: unknown): string[] {
  return asList(value)
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

export function parseSettings(raw: Raw): ThemeSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  // The palette writes a raw hex straight into `accent`; treat that as `custom`
  // so one field is enough for a colour picker.
  const accentHex = normalizeHex(String(raw.accent ?? ""));
  return {
    accent: accentHex ? "custom" : parseAccentKey(raw.accent),
    accentColor: accentHex ?? (typeof raw.accentColor === "string" ? raw.accentColor : ""),
    density: parseChoice(raw.density, ["comfortable", "compact"] as const, "comfortable"),
    grain: asBool(raw.grain, DEFAULT_SETTINGS.grain),
    showSidebar: asBool(raw.showSidebar, DEFAULT_SETTINGS.showSidebar),
    showTraffic: asBool(raw.showTraffic, DEFAULT_SETTINGS.showTraffic),
    showPing: asBool(raw.showPing, DEFAULT_SETTINGS.showPing),
    showExpiry: asBool(raw.showExpiry, DEFAULT_SETTINGS.showExpiry),
    showPrice: asBool(raw.showPrice, DEFAULT_SETTINGS.showPrice),
    showSparkline: asBool(raw.showSparkline, DEFAULT_SETTINGS.showSparkline),
    featuredPingTasks: asIdList(raw.featuredPingTasks),
    featuredNodes: asStringList(raw.featuredNodes),
    historyHours: asNumber(raw.historyHours, DEFAULT_SETTINGS.historyHours, 1, 168),
    footerHtml: typeof raw.footerHtml === "string" ? raw.footerHtml : "",
    banner: typeof raw.banner === "string" ? raw.banner : "",
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl : "",
    logoText: typeof raw.logoText === "string" ? raw.logoText : "",
    background: typeof raw.background === "string" ? raw.background : "",
    backgroundLight: typeof raw.backgroundLight === "string" ? raw.backgroundLight : "",
    backgroundDark: typeof raw.backgroundDark === "string" ? raw.backgroundDark : "",
    backgroundVeil: asNumber(raw.backgroundVeil, DEFAULT_SETTINGS.backgroundVeil, 0, 95),
    backgroundBlur: asNumber(raw.backgroundBlur, DEFAULT_SETTINGS.backgroundBlur, 0, 48),
    backgroundFit: parseChoice(
      raw.backgroundFit,
      ["cover", "contain", "tile"] as const,
      "cover",
    ),
    fontFamily: parseChoice(
      raw.fontFamily,
      [...Object.keys(FONTS), "custom"] as FontKey[],
      DEFAULT_SETTINGS.fontFamily,
    ),
    fontStack: typeof raw.fontStack === "string" ? raw.fontStack : "",
    fontSize: asNumber(raw.fontSize, DEFAULT_SETTINGS.fontSize, 12, 20),
    fontUrl: typeof raw.fontUrl === "string" ? raw.fontUrl : "",
    tabularNumbers: asBool(raw.tabularNumbers, DEFAULT_SETTINGS.tabularNumbers),
    showMap: asBool(raw.showMap, DEFAULT_SETTINGS.showMap),
  };
}

/** Custom stack wins when set; otherwise the preset; otherwise the default. */
export function resolveFontStack(settings: ThemeSettings): string {
  if (settings.fontFamily === "custom" && settings.fontStack.trim()) {
    return settings.fontStack.trim();
  }
  if (settings.fontFamily === "custom") return FONTS.system;
  return FONTS[settings.fontFamily] ?? FONTS.system;
}
