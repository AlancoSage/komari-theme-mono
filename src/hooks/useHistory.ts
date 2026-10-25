import { useEffect, useState } from "react";
import { fetchLoadHistory, fetchPingRecords, fetchPingTasks } from "../lib/api";
import type { LoadRecord, PingRecord, PingTask } from "../lib/types";

interface HistoryState {
  records: LoadRecord[];
  loading: boolean;
  error: string | null;
}

export function useHistory(uuid: string | null, hours: number): HistoryState {
  const [state, setState] = useState<HistoryState>({
    records: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!uuid) {
      setState({ records: [], loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ records: [], loading: true, error: null });

    fetchLoadHistory(uuid, hours)
      .then((records) => {
        if (!cancelled) setState({ records, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({ records: [], loading: false, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [uuid, hours]);

  return state;
}

interface PingState {
  tasks: PingTask[];
  records: PingRecord[];
  loading: boolean;
}

/** Latency series for one node, grouped client-side by task id. */
export function useNodePing(uuid: string | null, hours = 1): PingState {
  const [state, setState] = useState<PingState>({
    tasks: [],
    records: [],
    loading: false,
  });

  useEffect(() => {
    if (!uuid) {
      setState({ tasks: [], records: [], loading: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const tasks = await fetchPingTasks();
        // An empty `clients` list means the task probes every node.
        const mine = tasks.filter(
          (task) =>
            !task.clients ||
            task.clients.length === 0 ||
            task.clients.includes(uuid),
        );
        const results = await Promise.allSettled(
          mine.map((task) => fetchPingRecords(task.id, hours)),
        );
        if (cancelled) return;
        const records: PingRecord[] = [];
        for (const result of results) {
          if (result.status === "fulfilled") {
            for (const record of result.value) {
              if (record.client === uuid) records.push(record);
            }
          }
        }
        setState({ tasks: mine, records, loading: false });
      } catch {
        if (!cancelled) setState({ tasks: [], records: [], loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uuid, hours]);

  return state;
}
