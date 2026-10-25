import type {
  Client,
  Envelope,
  LoadRecord,
  PingRecord,
  PingTask,
  PublicInfo,
} from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/** Unwrap the standard `{status, message, data}` envelope and surface API errors. */
async function getData<T>(url: string): Promise<T> {
  const body = await getJSON<Envelope<T>>(url);
  if (body.status !== "success") {
    throw new Error(body.message || body.status || "request failed");
  }
  return body.data as T;
}

export const fetchPublicInfo = () => getData<PublicInfo>("/api/public");

export const fetchNodes = () => getData<Client[]>("/api/nodes");

export const fetchPingTasks = () => getData<PingTask[]>("/api/task/ping");

export async function fetchLoadHistory(
  uuid: string,
  hours: number,
): Promise<LoadRecord[]> {
  const data = await getData<{ records?: LoadRecord[] }>(
    `/api/records/load?uuid=${encodeURIComponent(uuid)}&load_type=all&hours=${hours}`,
  );
  return data.records ?? [];
}

export async function fetchPingRecords(
  taskId: number,
  hours = 1,
): Promise<PingRecord[]> {
  const data = await getData<{ records?: PingRecord[] }>(
    `/api/records/ping?task_id=${taskId}&hours=${hours}`,
  );
  return data.records ?? [];
}
