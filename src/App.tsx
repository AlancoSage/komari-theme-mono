import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Search, X } from "lucide-react";
import { Header, type Appearance } from "./components/Header";
import { PalettePanel } from "./components/PalettePanel";
import { Footer } from "./components/Footer";
import { NodeCard } from "./components/NodeCard";
import { NodeDrawer } from "./components/NodeDrawer";
import { Sitemap } from "./components/Sitemap";
import { useKomari, usePingMap } from "./hooks/useKomari";
import { bytes, percent, trafficUsed } from "./lib/format";
import { useI18n } from "./lib/i18n";
import { parseSettings, resolveAccent, resolveFontStack, type AccentKey } from "./lib/settings";
import { probeAdmin, saveThemeSettings } from "./lib/admin";

const VERSION = "1.7.1";

function readAppearance(): Appearance {
  try {
    const value = localStorage.getItem("appearance");
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* storage blocked */
  }
  return "system";
}

/** `#node=<uuid>` keeps a node open across reloads; `#sitemap` is its own view. */
function readNodeHash(): string | null {
  const match = window.location.hash.match(/^#node=(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isSitemapHash(): boolean {
  return window.location.hash === "#sitemap";
}

export default function App() {
  const { publicInfo, nodes, snapshot, link, error, loading, reload } = useKomari();
  const { lang, setLang, t } = useI18n();
  const settings = useMemo(() => parseSettings(publicInfo?.theme_settings), [publicInfo]);
  const [appearance, setAppearance] = useState<Appearance>(readAppearance);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(readNodeHash);
  const [view, setView] = useState<"dashboard" | "sitemap">(() =>
    isSitemapHash() ? "sitemap" : "dashboard",
  );
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [scrolled, setScrolled] = useState(false);
  // Palette: shown only when Komari accepts our admin cookie.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paletteMsg, setPaletteMsg] = useState<string | null>(null);

  const online = useMemo(() => new Set(snapshot?.online ?? []), [snapshot]);

  useEffect(() => {
    const onHash = () => {
      if (isSitemapHash()) {
        setView("sitemap");
        setSelected(null);
        return;
      }
      const node = readNodeHash();
      if (node) {
        setSelected(node);
        return;
      }
      setView("dashboard");
      setSelected(null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const suffix = selected
      ? `#node=${encodeURIComponent(selected)}`
      : view === "sitemap"
        ? "#sitemap"
        : "";
    const next = `${window.location.pathname}${window.location.search}${suffix}`;
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [selected, view]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = appearance === "dark" || (appearance === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    try {
      localStorage.setItem("appearance", appearance);
    } catch {
      /* ignore */
    }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance]);

  // `mono` is the reference palette; it must follow light/dark on its own, so it
  // is expressed purely in CSS instead of an inline override. `custom` reads the
  // hex field and derives a readable ink colour from its luminance.
  useEffect(() => {
    const root = document.documentElement.style;
    const accent = resolveAccent(settings);
    if (accent) {
      root.setProperty("--accent", accent.fill);
      root.setProperty("--accent-on", accent.on);
    } else {
      root.removeProperty("--accent");
      root.removeProperty("--accent-on");
    }
  }, [settings]);

  // Ask Komari once whether this browser is signed in as an admin. Failure is
  // normal for visitors; the palette entry point simply stays hidden.
  useEffect(() => {
    let alive = true;
    probeAdmin().then((ok) => {
      if (alive) setAdmin(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Typography is admin-configurable: family stack, base size, digit spacing.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-body", resolveFontStack(settings));
    root.style.setProperty("--font-size", `${settings.fontSize}px`);
    root.style.setProperty("--num-variant", settings.tabularNumbers ? "tabular-nums" : "normal");
  }, [settings.fontFamily, settings.fontStack, settings.fontSize, settings.tabularNumbers]);

  useEffect(() => {
    document.documentElement.classList.toggle("has-banner", Boolean(settings.banner));
  }, [settings.banner]);

  // Optional @font-face stylesheet: a Google Fonts CSS URL or a CSS file with
  // woff2 files shipped next to the built theme.
  useEffect(() => {
    const id = "komari-theme-font";
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    const url = settings.fontUrl.trim();
    if (!url) {
      existing?.remove();
      return;
    }
    if (existing) {
      if (existing.href !== url) existing.href = url;
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [settings.fontUrl]);

  // Keep the last 40 CPU samples in memory; no extra request is needed.
  useEffect(() => {
    if (!snapshot) return;
    setSparks((prev) => {
      const next: Record<string, number[]> = { ...prev };
      for (const [uuid, stat] of Object.entries(snapshot.data)) {
        const tail = next[uuid] ? next[uuid].slice(-39) : [];
        tail.push(stat.cpu?.usage ?? 0);
        next[uuid] = tail;
      }
      return next;
    });
  }, [snapshot]);

  // The top app bar sits transparent over the banner, then turns solid.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 96);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pingMap = usePingMap(settings.featuredPingTasks, settings.showPing);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      if (!node.group) continue;
      counts.set(node.group, (counts.get(node.group) ?? 0) + 1);
    }
    return ["all", ...Array.from(counts.keys()).sort()].map((name) => ({
      name,
      count: name === "all" ? nodes.length : (counts.get(name) ?? 0),
    }));
  }, [nodes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // `featuredNodes` is a free text field, so accept either the uuid or the
    // node name people actually type.
    const pinned = new Set(settings.featuredNodes.map((item) => item.toLowerCase()));
    const isPinned = (node: { uuid: string; name: string }) =>
      pinned.has(node.uuid.toLowerCase()) || pinned.has(node.name.toLowerCase());
    return nodes
      .filter((node) => {
        if (group !== "all" && node.group !== group) return false;
        if (!needle) return true;
        return [node.name, node.group, node.region, node.os, node.tags, node.public_remark]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const pinnedDelta = (isPinned(b) ? 1 : 0) - (isPinned(a) ? 1 : 0);
        if (pinnedDelta !== 0) return pinnedDelta;
        const weight = (b.weight ?? 0) - (a.weight ?? 0);
        return weight !== 0 ? weight : a.name.localeCompare(b.name);
      });
  }, [nodes, query, group, settings.featuredNodes]);

  const stats = useMemo(() => {
    const liveNodes = nodes.filter((node) => online.has(node.uuid));
    const cpuValues = liveNodes
      .map((node) => snapshot?.data[node.uuid]?.cpu?.usage)
      .filter((value): value is number => typeof value === "number");
    const avgCpu = cpuValues.length
      ? cpuValues.reduce((sum, value) => sum + value, 0) / cpuValues.length
      : 0;
    let traffic = 0;
    for (const node of nodes) {
      traffic += trafficUsed(snapshot?.data[node.uuid]?.network, node.traffic_limit_type);
    }
    const memRatios = liveNodes
      .map((node) => {
        const stat = snapshot?.data[node.uuid]?.ram;
        return percent(stat?.used, stat?.total ?? node.mem_total);
      })
      .filter((value) => value > 0);
    return {
      total: nodes.length,
      online: liveNodes.length,
      avgCpu,
      traffic,
      avgMem: memRatios.length
        ? memRatios.reduce((sum, value) => sum + value, 0) / memRatios.length
        : 0,
    };
  }, [nodes, online, snapshot]);

  const selectedNode = nodes.find((node) => node.uuid === selected) ?? null;
  const isPrivate = (error ?? "").toLowerCase().includes("private");
  const sitename = publicInfo?.sitename || "Komari";

  // Each scheme can carry its own wallpaper; the shared field is the fallback,
  // and if only one scheme is filled in we simply reuse it for the other.
  const sharedBg = settings.background.trim();
  const lightOnly = settings.backgroundLight.trim() || sharedBg;
  const darkOnly = settings.backgroundDark.trim() || sharedBg;
  const bgLight = lightOnly || darkOnly;
  const bgDark = darkOnly || lightOnly;
  const hasBackground = Boolean(bgLight || bgDark);
  const asUrl = (url: string) => `url("${url.replace(/"/g, "%22")}")`;

  // Save the palette back to Komari. The API replaces the whole map, so we merge
  // into the raw settings we received instead of sending only what changed.
  const applyAccent = async (accent: AccentKey, hex?: string) => {
    setSaving(true);
    setPaletteMsg(null);
    const base = (publicInfo?.theme_settings ?? {}) as Record<string, unknown>;
    const next = { ...base, accent, ...(hex ? { accentColor: hex } : {}) };
    const short = (publicInfo as { theme?: string } | null)?.theme || "Mono";
    const ok = await saveThemeSettings(short, next);
    setSaving(false);
    setPaletteMsg(
      ok
        ? lang === "en"
          ? "Saved, refreshing…"
          : "已保存，正在刷新…"
        : lang === "en"
          ? "Save failed — still signed in?"
          : "保存失败，确认你仍处于登录状态",
    );
    if (ok) reload();
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {hasBackground && (
        <div
          className={`bg-image bg-image--${settings.backgroundFit}`}
          style={
            {
              "--bg-light": bgLight ? asUrl(bgLight) : "none",
              "--bg-dark": bgDark ? asUrl(bgDark) : "none",
              filter:
                settings.backgroundBlur > 0 ? `blur(${settings.backgroundBlur}px)` : undefined,
              transform: settings.backgroundBlur > 0 ? "scale(1.06)" : undefined,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span className="bg-veil" style={{ opacity: settings.backgroundVeil / 100 }} />
          <span className="bg-wash" />
        </div>
      )}
      {settings.grain && <div className="texture" aria-hidden="true" />}

      <Header
        sitename={sitename}
        logoUrl={settings.logoUrl}
        logoText={settings.logoText}
        online={stats.online}
        total={stats.total}
        link={link}
        overlay={!scrolled && view === "dashboard"}
        view={view}
        appearance={appearance}
        onCycleAppearance={() =>
          setAppearance((prev) =>
            prev === "system" ? "light" : prev === "light" ? "dark" : "system",
          )
        }
        lang={lang}
        onToggleLang={() => setLang(lang === "zh-CN" ? "en" : "zh-CN")}
        admin={admin}
        onOpenPalette={() => setPaletteOpen((prev) => !prev)}
        onRefresh={reload}
        t={t}
      />

      <main id="top" className="relative z-10 flex-1">
        {view === "sitemap" ? (
          <Sitemap
            nodes={nodes}
            online={online}
            live={snapshot?.data}
            settings={settings}
            t={t}
            onOpen={(uuid) => setSelected(uuid)}
            onBack={() => setView("dashboard")}
          />
        ) : (
          <>
        <section
          className={`hero -mt-16 ${settings.banner ? "hero--image" : ""} ${
            !settings.banner && hasBackground ? "hero--plain" : ""
          }`}
          style={
            settings.banner
              ? { backgroundImage: `url("${settings.banner.replace(/"/g, "%22")}")` }
              : undefined
          }
        >
          <div className="relative z-10 mx-auto w-full max-w-[1360px] px-4 text-center sm:px-6">
            <h1 className="hero-title">{sitename}</h1>
            <p
              className="mx-auto mt-4 max-w-[560px] text-[15px]"
              style={{ color: "var(--hero-fg-muted)" }}
            >
              {publicInfo?.description || "A simple server monitor tool."}
            </p>
          </div>
          <svg className="wave" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M0 34c150 22 300 24 450 12 150-12 300-26 450-20s300 26 450 22c30-1 60-2 90-4v20H0z"
              fill="var(--page-bg)"
            />
          </svg>
        </section>

        <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 pb-5 pt-4">
            <span className="m3-chip m3-chip--accent num">
              {stats.online}/{stats.total} {t("online")}
            </span>
            <span className="m3-chip num">
              {t("avgCpu")} {stats.avgCpu.toFixed(1)}%
            </span>
            <span className="m3-chip num">
              {t("totalTraffic")} {bytes(stats.traffic)}
            </span>
            <span className={`m3-chip num ${link === "live" ? "" : "t-muted"}`}>
              {link === "live" ? t("connected") : t("connecting")}
            </span>
            <span className="ml-auto hidden text-[11px] t-secondary num sm:block">
              {t("updated")} {stats.total ? "2s" : "—"}
            </span>
          </div>

          <div className="grid gap-6 pb-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div id="nodes" className="min-w-0">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 t-muted"
                />
                <input
                  className="field"
                  placeholder={t("search")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 t-muted hover:t-primary"
                    onClick={() => setQuery("")}
                    aria-label={t("close")}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {groups.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {groups.map((item) => (
                    <button
                      key={item.name}
                      className={`tab ${group === item.name ? "tab--active" : ""}`}
                      onClick={() => setGroup(item.name)}
                    >
                      {item.name === "all" ? t("all") : item.name}
                      <span className="ml-1.5 opacity-60">{item.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="m3-card p-4">
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton mt-3 h-3 w-3/4" />
                    <div className="skeleton mt-4 h-14 w-full" />
                  </div>
                ))}
              </div>
            ) : error && nodes.length === 0 ? (
              <div className="m3-card p-8 text-center">
                <p className="text-sm font-semibold">{isPrivate ? t("private") : t("error")}</p>
                <p className="mt-1 text-xs t-muted">{error}</p>
                <div className="mt-4 flex justify-center gap-2">
                  {isPrivate && (
                    <a className="m3-btn m3-btn--outlined" href="/admin">
                      {t("login")}
                    </a>
                  )}
                  <button className="m3-btn" onClick={reload}>
                    {t("retry")}
                  </button>
                </div>
              </div>
            ) : visible.length === 0 ? (
              <div className="m3-card p-10 text-center">
                <p className="text-sm font-semibold">{t("empty")}</p>
                <p className="mt-1 text-xs t-muted">{t("emptyHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {visible.map((node) => (
                  <NodeCard
                    key={node.uuid}
                    node={node}
                    live={snapshot?.data[node.uuid]}
                    online={online.has(node.uuid)}
                    settings={settings}
                    ping={pingMap.cellsFor(node.uuid)}
                    spark={sparks[node.uuid] ?? []}
                    t={t}
                    onOpen={() => setSelected(node.uuid)}
                  />
                ))}
              </div>
            )}
          </div>

          {settings.showSidebar && (
            <aside className="space-y-4">
              <Widget title={t("overview")}>
                <Row label={t("totalNodes")} value={String(stats.total)} />
                <Row label={t("online")} value={String(stats.online)} />
                <Row
                  label={t("onlineRate")}
                  value={`${stats.total ? Math.round((stats.online / stats.total) * 100) : 0}%`}
                />
                <Row label={t("avgCpu")} value={`${stats.avgCpu.toFixed(1)}%`} />
                <Row label={t("ram")} value={`${stats.avgMem.toFixed(0)}%`} />
                <Row label={t("totalTraffic")} value={bytes(stats.traffic)} />
              </Widget>

              {groups.length > 1 && (
                <Widget title={t("groups")}>
                  <div className="space-y-1">
                    {groups.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => setGroup(item.name)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                          group === item.name ? "t-primary" : "t-secondary"
                        }`}
                        style={{
                          background:
                            group === item.name ? "var(--surface-high)" : "transparent",
                        }}
                      >
                        <span className="truncate">
                          {item.name === "all" ? t("all") : item.name}
                        </span>
                        <span className="num t-muted">{item.count}</span>
                      </button>
                    ))}
                  </div>
                </Widget>
              )}

              <Widget title={t("status")}>
                <div className="space-y-2 text-[12px]">
                  <Legend color="var(--accent)" label={t("online")} />
                  <Legend color="var(--outline-variant)" label={t("offline")} />
                  <Legend color="var(--error)" label="≥ 90%" />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed t-muted">{t("noteBody")}</p>
              </Widget>
            </aside>
          )}
          </div>
        </div>
          </>
        )}
      </main>

      <Footer footerHtml={settings.footerHtml} version={VERSION} />

      <PalettePanel
        open={paletteOpen && admin}
        accent={settings.accent}
        accentColor={settings.accentColor}
        saving={saving}
        message={paletteMsg}
        lang={lang}
        onApply={applyAccent}
        onClose={() => setPaletteOpen(false)}
      />

      {selectedNode && (
        <NodeDrawer
          node={selectedNode}
          live={snapshot?.data[selectedNode.uuid]}
          online={online.has(selectedNode.uuid)}
          settings={settings}
          t={t}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="m3-card p-4">
      <h2 className="label">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-[13px]">
      <span className="t-secondary">{label}</span>
      <span className="font-medium num">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ background: color }} />
      <span className="t-secondary">{label}</span>
    </div>
  );
}
