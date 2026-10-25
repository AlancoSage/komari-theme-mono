import { useEffect, useMemo, useRef, useState } from "react";
import { buildPins } from "../lib/geo";
import { MAP_BOTTOM, MAP_TOP, MAP_W, WORLD_PATH } from "../lib/geoData";
import type { MessageKey } from "../lib/i18n";
import type { Client } from "../lib/types";

export function WorldMap({
  nodes,
  online,
  onOpen,
  t,
}: {
  nodes: Client[];
  online: Set<string>;
  onOpen: (uuid: string) => void;
  t: (key: MessageKey) => string;
}) {
  const { pins, located } = useMemo(() => buildPins(nodes, online), [nodes, online]);
  const [hover, setHover] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const onlinePins = pins.filter((pin) => pin.online).length;
  const active = pins.find((pin) => pin.key === hover) ?? null;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const openPin = (key: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setHover(key);
  };

  // A short grace period lets the pointer travel from the pin into the tooltip.
  const closePin = (key: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setHover((prev) => (prev === key ? null : prev));
    }, 180);
  };

  return (
    <section className="m3-card mt-4 overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-3.5">
        <h2 className="text-[13px] font-semibold">{t("worldMap")}</h2>
        <span className="m3-chip num">
          {located}/{nodes.length} {t("located")}
        </span>
        <span className="m3-chip num">
          {onlinePins} {t("online")}
        </span>
        <span className="ml-auto flex items-center gap-3 text-[11px] t-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: "var(--primary)" }} />
            {t("online")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--outline-variant)" }}
            />
            {t("offline")}
          </span>
        </span>
      </header>

      <div
        className="relative mx-4 mb-4 overflow-hidden rounded-xl"
        style={{
          background: "var(--map-sea)",
          aspectRatio: `${MAP_W} / ${MAP_BOTTOM - MAP_TOP}`,
        }}
      >
        <svg
          viewBox={`0 ${MAP_TOP} ${MAP_W} ${MAP_BOTTOM - MAP_TOP}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={t("worldMap")}
        >
          <path
            d={WORLD_PATH}
            fill="var(--map-land)"
            stroke="var(--map-coast)"
            strokeWidth={1.2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute inset-0">
          {pins.map((pin) => (
            <button
              key={pin.key}
              type="button"
              className="map-pin"
              data-online={pin.online}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onMouseEnter={() => openPin(pin.key)}
              onMouseLeave={() => closePin(pin.key)}
              onFocus={() => openPin(pin.key)}
              onBlur={() => closePin(pin.key)}
              onClick={() => onOpen(pin.nodes[0].uuid)}
              aria-label={`${pin.nodes.map((node) => node.name).join(", ")} — ${t("viewDetails")}`}
            >
              <span className="map-pin__ring" aria-hidden="true" />
              <span className="map-pin__dot" aria-hidden="true" />
              {pin.count > 1 && (
                <span className="map-pin__count num" aria-hidden="true">
                  {pin.count}
                </span>
              )}
            </button>
          ))}

          {active && (
            <div
              className="map-tip"
              data-flip={active.y < 26}
              style={{
                left: `${Math.min(88, Math.max(12, active.x))}%`,
                top: `${active.y}%`,
              }}
              onMouseEnter={() => openPin(active.key)}
              onMouseLeave={() => closePin(active.key)}
            >
              {active.nodes.slice(0, 4).map((node) => (
                <button
                  key={node.uuid}
                  className="map-tip__row"
                  onClick={() => onOpen(node.uuid)}
                >
                  {node.name}
                </button>
              ))}
              {active.count > 4 && <span className="map-tip__more">+{active.count - 4}</span>}
            </div>
          )}
        </div>
      </div>

      {nodes.length > 0 && located === 0 && (
        <p className="px-4 pb-3 text-[11px] t-muted">{t("noRegion")}</p>
      )}
    </section>
  );
}
