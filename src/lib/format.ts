const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function bytes(value?: number | null, digits = 1): string {
  if (!value || value <= 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), UNITS.length - 1);
  const n = value / 1024 ** i;
  return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(digits)} ${UNITS[i]}`;
}

export function speed(value?: number | null): string {
  if (!value || value <= 0) return "0 B/s";
  return `${bytes(value)}/s`;
}

export function percent(used?: number | null, total?: number | null): number {
  if (!used || !total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

export function uptime(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function daysLeft(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

export function money(value?: number | null, currency?: string): string {
  if (value === undefined || value === null || value === 0) return "—";
  const symbol =
    currency === "CNY" || currency === "¥"
      ? "¥"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : "$";
  return `${symbol}${value % 1 === 0 ? value : value.toFixed(2)}`;
}

/** Traffic consumed, honouring the node's traffic_limit_type. */
export function trafficUsed(stat?: {
  totalUp?: number;
  totalDown?: number;
}, type?: string): number {
  const up = stat?.totalUp ?? 0;
  const down = stat?.totalDown ?? 0;
  switch ((type || "sum").toLowerCase()) {
    case "up":
      return up;
    case "down":
      return down;
    case "max":
      return Math.max(up, down);
    case "min":
      return Math.min(up, down);
    case "sum":
    default:
      return up + down;
  }
}

export function relative(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.round((Date.now() - t) / 1000);
  if (diff < 60) return `${Math.max(diff, 0)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function clock(iso?: string): string {
  if (!iso) return "--:--";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "--:--";
  return t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
