import { useState } from "react";
import { Home, Map as MapIcon, Monitor, Moon, Palette, RefreshCw, ShieldCheck, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import type { Lang, MessageKey } from "../lib/i18n";
import type { LinkState } from "../hooks/useKomari";

export type Appearance = "light" | "dark" | "system";

/** Over the banner the header takes the hero's ink, so it works on a light
 *  hero, a dark hero, and a photo banner alike. */
const OVERLAY_VARS = {
  "--on-surface": "var(--hero-fg)",
  "--on-surface-variant": "color-mix(in oklab, var(--hero-fg) 78%, transparent)",
  "--outline": "color-mix(in oklab, var(--hero-fg) 55%, transparent)",
  "--surface-high": "color-mix(in oklab, var(--hero-fg) 16%, transparent)",
  "--primary": "var(--hero-fg)",
  "--on-primary": "var(--hero-bg-color)",
  "--accent": "var(--hero-fg)",
  "--accent-on": "var(--hero-bg-color)",
  color: "var(--hero-fg)",
} as CSSProperties;

export function Header({
  sitename,
  online,
  total,
  link,
  overlay,
  view,
  appearance,
  onCycleAppearance,
  lang,
  onToggleLang,
  onRefresh,
  logoUrl,
  logoText,
  admin,
  onOpenPalette,
  t,
}: {
  sitename: string;
  online: number;
  total: number;
  link: LinkState;
  overlay: boolean;
  view: "dashboard" | "sitemap";
  appearance: Appearance;
  onCycleAppearance: () => void;
  lang: Lang;
  onToggleLang: () => void;
  onRefresh: () => void;
  logoUrl?: string;
  logoText?: string;
  admin?: boolean;
  onOpenPalette?: () => void;
  t: (key: MessageKey) => string;
}) {
  const [logoBroken, setLogoBroken] = useState(false);
  // Image logo if configured, otherwise the first character of the site name.
  const customBadge = (logoText ?? "").trim();
  const badge = customBadge ? customBadge.slice(0, 2) : (sitename || "K").trim().slice(0, 1);
  const linkLabel =
    link === "live" ? t("connected") : link === "error" ? t("error") : t("connecting");
  const AppearanceIcon =
    appearance === "dark" ? Moon : appearance === "light" ? Sun : Monitor;

  return (
    <header
      className="sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300"
      style={
        overlay
          ? { ...OVERLAY_VARS, background: "transparent", borderColor: "transparent" }
          : {
              background: "color-mix(in oklab, var(--page-bg) 92%, transparent)",
              borderColor: "color-mix(in oklab, var(--outline-variant) 60%, transparent)",
              backdropFilter: "blur(10px)",
            }
      }
    >
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-1 px-4 sm:px-6">
        <a href="/" className="mr-3 flex items-center gap-2.5 no-underline">
          {logoUrl && !logoBroken ? (
            <img
              src={logoUrl}
              alt=""
              onError={() => setLogoBroken(true)}
              className="size-9 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              {badge}
            </span>
          )}
          <span
            className="max-w-[38vw] truncate text-[16px] font-bold tracking-tight"
            style={{ color: "var(--on-surface)" }}
          >
            {sitename || "Komari"}
          </span>
        </a>

        <nav className="ml-1 hidden items-center gap-0.5 md:flex">
          <a
            className={`m3-navlink ${view === "dashboard" ? "m3-navlink--active" : ""}`}
            href="#"
          >
            <Home size={14} className="mr-1.5" />
            {t("navOverview")}
          </a>
          <a
            className={`m3-navlink ${view === "sitemap" ? "m3-navlink--active" : ""}`}
            href="#sitemap"
          >
            <MapIcon size={14} className="mr-1.5" />
            {t("navSitemap")}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 hidden items-center gap-1.5 sm:inline-flex">
            <span className="m3-chip num">
              <span
                className="size-1.5 rounded-full"
                style={{ background: online > 0 ? "var(--accent)" : "var(--outline-variant)" }}
              />
              {online}/{total}
            </span>
            <span className={`text-[11px] num ${link === "live" ? "t-secondary" : "t-muted"}`}>
              {linkLabel}
            </span>
          </span>

          <span className="md:hidden">
            <a
              className={`m3-icon-btn ${view === "sitemap" ? "m3-icon-btn--active" : ""}`}
              href="#sitemap"
              title={t("navSitemap")}
              aria-label={t("navSitemap")}
            >
              <MapIcon size={17} />
            </a>
          </span>
          <button className="m3-icon-btn" onClick={onRefresh} title={t("refresh")} aria-label={t("refresh")}>
            <RefreshCw size={17} />
          </button>
          <button
            className="m3-icon-btn"
            onClick={onCycleAppearance}
            title={t("appearance")}
            aria-label={t("appearance")}
          >
            <AppearanceIcon size={17} />
          </button>
          <button className="m3-icon-btn" onClick={onToggleLang} title="Language" aria-label="Language">
            <span className="text-[11px] font-bold">{lang === "zh-CN" ? "中" : "EN"}</span>
          </button>
          {admin && (
            <button
              className="m3-icon-btn"
              onClick={onOpenPalette}
              title="调色板 / Palette"
              aria-label="调色板 / Palette"
            >
              <Palette size={17} />
            </button>
          )}
          <a className="m3-icon-btn m3-icon-btn--admin" href="/admin" title="Admin" aria-label="Admin">
            <ShieldCheck size={17} />
          </a>
        </div>
      </div>
    </header>
  );
}
