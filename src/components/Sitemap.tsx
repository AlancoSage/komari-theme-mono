import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { WorldMap } from "./WorldMap";
import { bytes, percent, trafficUsed, uptime } from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { ThemeSettings } from "../lib/settings";
import type { Client, LiveStat } from "../lib/types";

type Mode = "group" | "region";

export function Sitemap({
  nodes,
  online,
  live,
  settings,
  t,
  onOpen,
  onBack,
}: {
  nodes: Client[];
  online: Set<string>;
  live: Record<string, LiveStat> | undefined;
  settings: ThemeSettings;
  t: (key: MessageKey) => string;
  onOpen: (uuid: string) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>("group");
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const keyOf = (node: Client) =>
      (mode === "group" ? node.group : node.region) || t("all");

    const buckets = new Map<string, Client[]>();
    for (const node of nodes) {
      if (
        needle &&
        ![node.name, node.group, node.region, node.os, node.tags]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(needle))
      ) {
        continue;
      }
      const key = keyOf(node);
      const bucket = buckets.get(key) ?? [];
      bucket.push(node);
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, list]) => ({
        name,
        list: list.sort((a, b) => a.name.localeCompare(b.name)),
        online: list.filter((node) => online.has(node.uuid)).length,
      }));
  }, [nodes, mode, online, query, t]);

  const totalOnline = nodes.filter((node) => online.has(node.uuid)).length;

  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Sitemap</p>
          <h1 className="mt-2 text-[clamp(30px,5vw,54px)] font-bold leading-[1.05] tracking-[-0.03em]">
            {t("navSitemap")}
          </h1>
          <p className="mt-2 max-w-[560px] text-[14px] t-secondary">{t("sitemapDesc")}</p>
        </div>
        <button className="m3-btn m3-btn--outlined" onClick={onBack}>
          {t("backHome")}
        </button>
      </div>

      {settings.showMap && (
        <WorldMap nodes={nodes} online={online} onOpen={onOpen} t={t} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="m3-chip m3-chip--accent num">
          {totalOnline}/{nodes.length} {t("online")}
        </span>
        <span className="m3-chip num">
          {sections.length} {mode === "group" ? t("groups") : t("region")}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            className={`tab ${mode === "group" ? "tab--active" : ""}`}
            onClick={() => setMode("group")}
          >
            {t("byGroup")}
          </button>
          <button
            className={`tab ${mode === "region" ? "tab--active" : ""}`}
            onClick={() => setMode("region")}
          >
            {t("byRegion")}
          </button>
        </div>
      </div>

      <div className="relative mt-3">
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
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <section key={section.name} className="m3-card overflow-hidden">
            <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
              <h2 className="truncate text-[13px] font-semibold">{section.name}</h2>
              <span className="m3-chip num">
                {section.online}/{section.list.length}
              </span>
            </header>
            <ul className="pb-1">
              {section.list.map((node) => {
                const stat = live?.[node.uuid];
                const isOnline = online.has(node.uuid);
                const cpu = stat?.cpu?.usage ?? 0;
                const ram = percent(stat?.ram?.used, stat?.ram?.total ?? node.mem_total);
                const traffic = trafficUsed(stat?.network, node.traffic_limit_type);
                return (
                  <li key={node.uuid}>
                    <button
                      className="group flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                      onClick={() => onOpen(node.uuid)}
                      style={{ borderRadius: 0 }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "var(--surface-high)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{
                          background: isOnline ? "var(--accent)" : "var(--outline-variant)",
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{node.name}</span>
                        <span className="block truncate text-[11px] t-muted">
                          {[node.region, node.os].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] t-secondary num sm:hidden">
                        {cpu.toFixed(0)}%
                      </span>
                      <span className="hidden shrink-0 grid-cols-[42px_42px_74px_78px] items-center gap-2 text-right text-[11px] t-secondary num sm:grid">
                        <span title={t("cpu")}>{cpu.toFixed(0)}%</span>
                        <span title={t("ram")}>{ram.toFixed(0)}%</span>
                        <span title={t("traffic")}>
                          {settings.showTraffic ? bytes(traffic) : "—"}
                        </span>
                        <span title={t("uptime")}>{isOnline ? uptime(stat?.uptime) : "—"}</span>
                      </span>
                      <ArrowUpRight
                        size={14}
                        className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {sections.length === 0 && (
        <div className="m3-card mt-6 p-10 text-center">
          <p className="text-sm font-semibold">{t("empty")}</p>
          <p className="mt-1 text-xs t-muted">{t("emptyHint")}</p>
        </div>
      )}
    </div>
  );
}
