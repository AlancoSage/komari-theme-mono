import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNodes,
  fetchPingRecords,
  fetchPingTasks,
  fetchPublicInfo,
} from "../lib/api";
import type { Client, PingTask, PublicInfo, Snapshot } from "../lib/types";

export type LinkState = "connecting" | "live" | "reconnecting" | "error";

export interface KomariData {
  publicInfo: PublicInfo | null;
  nodes: Client[];
  snapshot: Snapshot | null;
  link: LinkState;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

const POLL_MS = 2000;

export function useKomari(): KomariData {
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [nodes, setNodes] = useState<Client[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [link, setLink] = useState<LinkState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([fetchPublicInfo(), fetchNodes()]).then((results) => {
      if (cancelled) return;
      const [info, list] = results;
      if (info.status === "fulfilled") setPublicInfo(info.value);
      if (list.status === "fulfilled") {
        setNodes(list.value ?? []);
      } else {
        const reason = list.reason as Error;
        setError(reason?.message ?? "load failed");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Komari does not push: the browser asks for a snapshot on a timer. One
  // socket is kept open and reused, the request is a plain text frame.
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let timer: number | undefined;
    let closed = false;

    const connect = () => {
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      setLink((prev) => (prev === "live" ? prev : "connecting"));
      try {
        socket = new WebSocket(`${scheme}//${window.location.host}/api/clients`);
      } catch {
        setLink("error");
        return;
      }

      socket.onopen = () => {
        setLink("live");
        socket?.send("get");
      };

      socket.onmessage = (event) => {
        try {
          const body = JSON.parse(event.data as string) as {
            status?: string;
            data?: Snapshot;
          };
          if (body.status === "success" && body.data) {
            setSnapshot({
              online: body.data.online ?? [],
              data: body.data.data ?? {},
            });
            setLink("live");
          }
        } catch {
          /* ignore malformed frame */
        }
      };

      socket.onerror = () => socket?.close();

      socket.onclose = () => {
        if (closed) return;
        setLink("reconnecting");
        retry = window.setTimeout(connect, POLL_MS);
      };
    };

    connect();

    timer = window.setInterval(() => {
      if (document.hidden) return;
      if (socket && socket.readyState === WebSocket.OPEN) socket.send("get");
    }, POLL_MS);

    return () => {
      closed = true;
      if (timer) window.clearInterval(timer);
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, []);

  return { publicInfo, nodes, snapshot, link, error, loading, reload };
}

export interface PingCell {
  taskId: number;
  name: string;
  value: number | null;
}

/** Average latency over the last hour for the tasks pinned on cards. */
export function usePingMap(taskIds: number[], enabled: boolean) {
  const [tasks, setTasks] = useState<PingTask[]>([]);
  const [map, setMap] = useState<Record<string, Record<number, number>>>({});
  const wanted = taskIds.join(",");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || taskIds.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const all = await fetchPingTasks();
        if (cancelled) return;
        setTasks(all);
        const chosen = all.filter((task) => taskIds.includes(task.id));
        const results = await Promise.allSettled(
          chosen.map((task) => fetchPingRecords(task.id, 1)),
        );
        if (cancelled) return;

        const next: Record<string, Record<number, number>> = {};
        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          const task = chosen[index];
          const buckets = new Map<string, { sum: number; n: number }>();
          for (const record of result.value) {
            if (typeof record.value !== "number") continue;
            const entry = buckets.get(record.client) ?? { sum: 0, n: 0 };
            entry.sum += record.value;
            entry.n += 1;
            buckets.set(record.client, entry);
          }
          for (const [client, { sum, n }] of buckets) {
            next[client] ??= {};
            next[client][task.id] = sum / n;
          }
        });
        setMap(next);
      } catch {
        if (!cancelled) setMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, enabled]);

  const cellsFor = useCallback(
    (uuid: string): PingCell[] =>
      tasks
        .filter((task) => taskIds.includes(task.id))
        .map((task) => ({
          taskId: task.id,
          name: task.name,
          value: map[uuid]?.[task.id] ?? null,
        })),
    [tasks, map, taskIds],
  );

  return { cellsFor };
}
