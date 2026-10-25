import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AreaChart } from "./AreaChart";
import { Meter } from "./Meter";
import { useHistory, useNodePing } from "../hooks/useHistory";
import {
  bytes,
  clock,
  daysLeft,
  money,
  percent,
  relative,
  speed,
  trafficUsed,
  uptime,
} from "../lib/format";
import type { MessageKey } from "../lib/i18n";
import type { ThemeSettings } from "../lib/settings";
import type { Client, LiveStat } from "../lib/types";

const RANGES = [1, 4, 24];

export function NodeDrawer({
  node,
  live,
  online,
  settings,
  t,
  onClose,
}: {
  node: Client;
  live?: LiveStat;
  online: boolean;
  settings: ThemeSettings;
  t: (key: MessageKey) => string;
  onClose: () => void;
}) {
  const [range, setRange] = useState(settings.historyHours);
  const { records, loading } = useHistory(node.uuid, range);
  const ping = useNodePing(node.uuid, 1);

  const { cpuSeries, netSeries } = useMemo(() => {
    const cpu = records
      .map((record) => record.cpu)
      .filter((value): value is number => typeof value === "number");
    const netIn = records
      .map((record) => record.net_in)
      .filter((value): value is number => typeof value === "number");
    const netOut = records
      .map((record) => record.net_out)
      .filter((value): value is number => typeof value === "number");
    return {
      cpuSeries: [{ label: "CPU %", color: "var(--accent)", values: cpu }],
      netSeries: [
        { label: "↓", color: "var(--on-surface-variant)", values: netIn },
        { label: "↑", color: "var(--outline)", values: netOut },
      ],
    };
  }, [records]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const limit = node.traffic_limit ?? 0;
  const used = trafficUsed(live?.network, node.traffic_limit_type);
  const left = daysLeft(node.expired_at);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside
        className="sheet relative h-full w-full overflow-y-auto overscroll-contain p-5 sm:w-[540px] sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-label={node.name}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{
                  background: online ? "var(--accent)" : "var(--outline-variant)",
                }}
              />
              <h2 className="truncate text-[20px] font-bold tracking-tight">{node.name}</h2>
              {node.region ? <span className="m3-chip">{node.region}</span> : null}
            </div>
            <p className="mt-1 text-[12px] t-muted">
              {[node.os, node.cpu_name, node.arch].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <button className="m3-icon-btn" onClick={onClose} aria-label={t("close")}>
            <X size={18} />
          </button>
        </header>

        <section className="mt-6">
          <h3 className="label">{t("live")}</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3.5">
            <Bar
              label={t("cpu")}
              value={`${(live?.cpu?.usage ?? 0).toFixed(1)}%`}
              pct={live?.cpu?.usage ?? 0}
            />
            <Bar
              label={t("ram")}
              value={`${bytes(live?.ram?.used)} / ${bytes(live?.ram?.total ?? node.mem_total)}`}
              pct={percent(live?.ram?.used, live?.ram?.total ?? node.mem_total)}
            />
            <Bar
              label={t("disk")}
              value={`${bytes(live?.disk?.used)} / ${bytes(live?.disk?.total ?? node.disk_total)}`}
              pct={percent(live?.disk?.used, live?.disk?.total ?? node.disk_total)}
            />
            <Bar
              label={t("swap")}
              value={`${bytes(live?.swap?.used)} / ${bytes(live?.swap?.total ?? node.swap_total)}`}
              pct={percent(live?.swap?.used, live?.swap?.total ?? node.swap_total)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="↓" value={speed(live?.network?.down)} />
            <Stat label="↑" value={speed(live?.network?.up)} />
            <Stat label={t("load")} value={(live?.load?.load1 ?? 0).toFixed(2)} />
            <Stat label={t("process")} value={String(live?.process ?? 0)} />
            <Stat label="TCP" value={String(live?.connections?.tcp ?? 0)} />
            <Stat label="UDP" value={String(live?.connections?.udp ?? 0)} />
            <Stat label={t("uptime")} value={uptime(live?.uptime)} />
            <Stat label={t("updated")} value={`${relative(live?.updated_at)} ${t("ago")}`} />
          </div>

          {limit > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-[11px] t-muted num">
                <span>
                  {t("traffic")} {bytes(used)} / {bytes(limit)}
                </span>
                <span>{((used / limit) * 100).toFixed(1)}%</span>
              </div>
              <Meter value={(used / limit) * 100} />
            </div>
          )}
        </section>

        <div className="divider my-6" />

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="label">{t("history")}</h3>
            <div className="flex items-center gap-1">
              {RANGES.map((value) => (
                <button
                  key={value}
                  className={`tab ${range === value ? "tab--active" : ""}`}
                  onClick={() => setRange(value)}
                >
                  {value}h
                </button>
              ))}
            </div>
          </div>
          <div className="m3-card--low mt-3 rounded-xl p-3">
            <AreaChart
              series={cpuSeries}
              unit={(value) => `${Math.round(value)}%`}
              emptyLabel={loading ? t("loading") : t("noData")}
            />
          </div>
          <div className="m3-card--low mt-2.5 rounded-xl p-3">
            <AreaChart
              series={netSeries}
              unit={(value) => `${bytes(value)}/s`}
              emptyLabel={loading ? t("loading") : t("noData")}
            />
          </div>
          {records.length > 0 && (
            <p className="mt-2 text-[10px] t-muted num">
              {records.length} · {range}h · {clock(records[0]?.time)} –{" "}
              {clock(records[records.length - 1]?.time)}
            </p>
          )}
        </section>

        <div className="divider my-6" />

        <section>
          <h3 className="label">{t("latency")}</h3>
          {ping.loading ? (
            <p className="mt-2 text-xs t-muted">{t("loading")}</p>
          ) : ping.tasks.length === 0 ? (
            <p className="mt-2 text-xs t-muted">{t("noData")}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {ping.tasks.map((task) => {
                const values = ping.records
                  .filter((record) => record.task_id === task.id)
                  .map((record) => record.value);
                const min = values.length ? Math.min(...values) : null;
                const max = values.length ? Math.max(...values) : null;
                const avg = values.length
                  ? values.reduce((sum, value) => sum + value, 0) / values.length
                  : null;
                return (
                  <div key={task.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="truncate text-[13px]">{task.name}</span>
                    <span className="shrink-0 text-[11px] t-secondary num">
                      {avg === null
                        ? t("noData")
                        : `${Math.round(avg)}ms · ${Math.round(min ?? 0)}–${Math.round(max ?? 0)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="divider my-6" />

        <section>
          <h3 className="label">{t("system")}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 text-[12px]">
            <Row label={t("os")} value={node.os} />
            <Row label={t("arch")} value={node.arch} />
            <Row label={t("cores")} value={node.cpu_cores ? String(node.cpu_cores) : undefined} />
            <Row label={t("group")} value={node.group} />
            <Row label={t("region")} value={node.region} />
            <Row label="IPv4" value={node.ipv4} />
            <Row label="IPv6" value={node.ipv6} />
            <Row label={t("gpu")} value={node.gpu_name} />
            {settings.showPrice && <Row label={t("price")} value={money(node.price, node.currency)} />}
            {settings.showExpiry && (
              <Row
                label={t("expires")}
                value={
                  node.expired_at
                    ? `${new Date(node.expired_at).toLocaleDateString()} (${
                        left !== null && left >= 0
                          ? `${left}d`
                          : `${Math.abs(left ?? 0)}d ${t("ago")}`
                      })`
                    : undefined
                }
              />
            )}
          </dl>

          {(node.public_remark || node.remark) && (
            <p className="m3-card--low mt-3 rounded-xl px-3 py-2 text-[12px] t-secondary">
              {node.public_remark || node.remark}
            </p>
          )}
          {node.tags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {node.tags
                .split(";")
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="m3-chip m3-chip--flat">
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Bar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="label">{label}</span>
        <span className="t-secondary num">{value}</span>
      </div>
      <div className="mt-1.5">
        <Meter value={pct} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="m3-card--high rounded-xl px-2.5 py-2">
      <div className="text-[10px] t-muted">{label}</div>
      <div className="mt-0.5 truncate text-[12px] font-medium num">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="t-muted">{label}</dt>
      <dd className="truncate num">{value}</dd>
    </div>
  );
}
