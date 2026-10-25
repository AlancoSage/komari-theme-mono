import { ArrowDownToLine, ArrowUpFromLine, Clock } from "lucide-react";
import {
  bytes,
  daysLeft,
  money,
  percent,
  speed,
  trafficUsed,
  uptime,
} from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { ThemeSettings } from "../lib/settings";
import type { Client, LiveStat } from "../lib/types";
import type { PingCell } from "../hooks/useKomari";
import { Meter } from "./Meter";
import { Sparkline } from "./Sparkline";

export function NodeCard({
  node,
  live,
  online,
  settings,
  ping,
  spark,
  t,
  onOpen,
}: {
  node: Client;
  live?: LiveStat;
  online: boolean;
  settings: ThemeSettings;
  ping: PingCell[];
  spark: number[];
  t: (key: MessageKey) => string;
  onOpen: () => void;
}) {
  const compact = settings.density === "compact";
  const cpu = live?.cpu?.usage ?? 0;
  const ramUsed = live?.ram?.used ?? 0;
  const ramTotal = live?.ram?.total ?? node.mem_total ?? 0;
  const diskUsed = live?.disk?.used ?? 0;
  const diskTotal = live?.disk?.total ?? node.disk_total ?? 0;
  const down = live?.network?.down ?? 0;
  const up = live?.network?.up ?? 0;

  const limit = node.traffic_limit ?? 0;
  const used = trafficUsed(live?.network, node.traffic_limit_type);
  const trafficPct = limit > 0 ? (used / limit) * 100 : 0;

  const left = daysLeft(node.expired_at);
  const expiryTone = left === null ? "" : left < 0 ? "t-error" : left <= 7 ? "t-warn" : "";

  return (
    <article
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${node.name} ${t("details")}`}
      className={`m3-card m3-interactive ${compact ? "p-3.5" : "p-4"} ${
        online ? "" : "opacity-65"
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{
              background: online ? "var(--accent)" : "var(--outline-variant)",
              boxShadow: online
                ? "0 0 0 3px color-mix(in oklab, var(--accent) 16%, transparent)"
                : "none",
            }}
          />
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{node.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {node.region ? <span className="m3-chip m3-chip--flat">{node.region}</span> : null}
        </div>
      </header>

      <p className="mt-1 truncate text-[12px] t-muted">
        {[node.os, node.cpu_name].filter(Boolean).join(" · ") || "—"}
      </p>

      <div className={`mt-4 grid grid-cols-2 gap-x-4 ${compact ? "gap-y-2.5" : "gap-y-3.5"}`}>
        <Metric label={t("cpu")} value={`${cpu.toFixed(1)}%`}>
          <Meter value={cpu} />
        </Metric>
        <Metric label={t("ram")} value={`${bytes(ramUsed)} / ${bytes(ramTotal)}`}>
          <Meter value={percent(ramUsed, ramTotal)} />
        </Metric>
        <Metric label={t("disk")} value={`${bytes(diskUsed)} / ${bytes(diskTotal)}`}>
          <Meter value={percent(diskUsed, diskTotal)} />
        </Metric>
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="label">{t("network")}</span>
            <span className="shrink-0 text-[11px] t-muted num">{live?.connections?.tcp ?? 0} tcp</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[12px] num">
            <span className="inline-flex items-center gap-1">
              <ArrowDownToLine size={11} className="t-muted" />
              {speed(down)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpFromLine size={11} className="t-muted" />
              {speed(up)}
            </span>
          </div>
        </div>
      </div>

      {settings.showTraffic && limit > 0 && (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] t-muted num">
            <span>
              {t("traffic")} {bytes(used)} / {bytes(limit)}
            </span>
            <span>{trafficPct.toFixed(0)}%</span>
          </div>
          <Meter value={trafficPct} />
        </div>
      )}

      {settings.showSparkline && !compact && live && (
        <div className="mt-3 opacity-80">
          <Sparkline values={spark} height={28} />
        </div>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="m3-chip">
          <Clock size={10} />
          {online ? uptime(live?.uptime) : t("offline")}
        </span>
        {typeof live?.load?.load1 === "number" && (
          <span className="m3-chip num">
            {t("load")} {live.load.load1.toFixed(2)}
          </span>
        )}
        {settings.showPing &&
          ping.map((cell) => (
            <span key={cell.taskId} className="m3-chip num" title={cell.name}>
              {cell.name.slice(0, 8)}{" "}
              {cell.value === null ? "—" : `${Math.round(cell.value)}ms`}
            </span>
          ))}
        {settings.showPrice && node.price ? (
          <span className="m3-chip num">{money(node.price, node.currency)}</span>
        ) : null}
        {settings.showExpiry && left !== null && (
          <span className={`m3-chip num ${expiryTone}`}>
            {left < 0 ? `${Math.abs(left)}d ${t("ago")}` : `${left}d`}
          </span>
        )}
      </footer>
    </article>
  );
}

function Metric({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        <span className="truncate text-[11px] t-secondary num">{value}</span>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
