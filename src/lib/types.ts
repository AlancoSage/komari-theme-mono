export interface Client {
  uuid: string;
  name: string;
  cpu_name?: string;
  arch?: string;
  cpu_cores?: number;
  os?: string;
  gpu_name?: string;
  ipv4?: string;
  ipv6?: string;
  region?: string;
  mem_total?: number;
  swap_total?: number;
  disk_total?: number;
  weight?: number;
  price?: number;
  billing_cycle?: number;
  auto_renewal?: boolean;
  currency?: string;
  expired_at?: string | null;
  group?: string;
  tags?: string;
  hidden?: boolean;
  traffic_limit?: number;
  traffic_limit_type?: string;
  public_remark?: string;
  remark?: string;
}

export interface LiveStat {
  cpu?: { name?: string; cores?: number; arch?: string; usage?: number };
  ram?: { total?: number; used?: number };
  swap?: { total?: number; used?: number };
  load?: { load1?: number; load5?: number; load15?: number };
  disk?: { total?: number; used?: number };
  network?: { up?: number; down?: number; totalUp?: number; totalDown?: number };
  connections?: { tcp?: number; udp?: number };
  uptime?: number;
  process?: number;
  message?: string;
  updated_at?: string;
}

export interface Snapshot {
  online: string[];
  data: Record<string, LiveStat>;
}

export interface PublicInfo {
  sitename?: string;
  description?: string;
  custom_head?: string;
  custom_body?: string;
  allow_cors?: boolean;
  theme?: string;
  theme_settings?: Record<string, unknown> | null;
}

export interface PingTask {
  id: number;
  name: string;
  clients?: string[];
  weight?: number;
  default_on?: boolean;
  type?: string;
  interval?: number;
}

export interface PingRecord {
  task_id: number;
  time: string;
  value: number;
  client: string;
}

export interface LoadRecord {
  client?: string;
  time: string;
  cpu?: number;
  gpu?: number;
  ram?: number;
  ram_total?: number;
  swap?: number;
  swap_total?: number;
  load?: number;
  temp?: number;
  disk?: number;
  disk_total?: number;
  net_in?: number;
  net_out?: number;
  net_total_up?: number;
  net_total_down?: number;
  process?: number;
  connections?: number;
  connections_udp?: number;
}

export interface Envelope<T> {
  status: string;
  message?: string;
  data?: T;
}
