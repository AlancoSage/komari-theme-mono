import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { ACCENTS, normalizeHex, type AccentKey } from "../lib/settings";
import type { Lang } from "../lib/i18n";

const PRESETS: { key: AccentKey; zh: string; en: string }[] = [
  { key: "mono", zh: "跟随主题", en: "Theme ink" },
  { key: "violet", zh: "紫罗兰", en: "Violet" },
  { key: "blue", zh: "天蓝", en: "Blue" },
  { key: "cyan", zh: "青色", en: "Cyan" },
  { key: "emerald", zh: "薄荷绿", en: "Emerald" },
  { key: "lime", zh: "柠檬绿", en: "Lime" },
  { key: "amber", zh: "琥珀黄", en: "Amber" },
  { key: "orange", zh: "橙色", en: "Orange" },
  { key: "rose", zh: "玫瑰粉", en: "Rose" },
  { key: "pink", zh: "品红", en: "Pink" },
];

const COPY = {
  zh: {
    title: "调色板",
    hint: "选中的颜色会写入 Komari 主题设置，对所有人生效。",
    custom: "自定义颜色",
    save: "保存",
    cancel: "取消",
    saved: "已保存，正在刷新…",
    failed: "保存失败，确认你仍处于登录状态",
    adminOnly: "仅管理员可见",
  },
  en: {
    title: "Palette",
    hint: "Written to Komari's theme settings and applied for every visitor.",
    custom: "Custom colour",
    save: "Save",
    cancel: "Cancel",
    saved: "Saved, refreshing…",
    failed: "Save failed — check that you are still signed in",
    adminOnly: "Admins only",
  },
} as const;

export function PalettePanel({
  open,
  accent,
  accentColor,
  saving,
  message,
  lang,
  onApply,
  onClose,
}: {
  open: boolean;
  accent: AccentKey;
  accentColor: string;
  saving: boolean;
  message: string | null;
  lang: Lang;
  onApply: (accent: AccentKey, hex?: string) => void;
  onClose: () => void;
}) {
  const copy = COPY[lang === "en" ? "en" : "zh"];
  const fallbackHex = normalizeHex(accentColor) ?? "#7c5cff";
  const [draft, setDraft] = useState<AccentKey>(accent);
  const [hex, setHex] = useState(fallbackHex);

  // Re-sync whenever the panel opens or the stored settings change under us.
  useEffect(() => {
    if (!open) return;
    setDraft(accent);
    setHex(fallbackHex);
  }, [open, accent, fallbackHex]);

  if (!open) return null;

  const choose = (key: AccentKey) => {
    setDraft(key);
    const preset = ACCENTS[key];
    if (preset) setHex(preset.fill);
  };

  return (
    <div className="palette-panel" role="dialog" aria-label={copy.title}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold" style={{ color: "var(--on-surface)" }}>
            {copy.title}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--on-surface-variant)" }}>
            {copy.hint}
          </div>
        </div>
        <button className="m3-icon-btn size-8" onClick={onClose} aria-label={copy.cancel}>
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {PRESETS.map((preset) => {
          const swatch = ACCENTS[preset.key];
          const active = draft === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => choose(preset.key)}
              title={lang === "en" ? preset.en : preset.zh}
              aria-label={lang === "en" ? preset.en : preset.zh}
              className="palette-swatch"
              data-active={active || undefined}
              style={{
                background:
                  swatch?.fill ??
                  "linear-gradient(135deg, var(--on-surface) 0%, var(--on-surface) 48%, var(--surface) 48%, var(--surface) 52%, var(--on-surface) 52%, var(--on-surface) 100%)",
              }}
            >
              {active && swatch && <Check size={13} style={{ color: swatch.on }} />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label
          className="relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg"
          style={{ background: hex, border: "1px solid var(--outline-variant)" }}
          title={copy.custom}
        >
          <input
            type="color"
            value={hex}
            onChange={(event) => {
              setDraft("custom");
              setHex(event.target.value);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={copy.custom}
          />
        </label>
        <input
          value={hex}
          onChange={(event) => {
            const next = normalizeHex(event.target.value);
            setDraft("custom");
            setHex(next ?? event.target.value);
          }}
          className="w-full rounded-lg px-2.5 py-1.5 font-mono text-[12px] outline-none"
          style={{
            background: "var(--surface)",
            color: "var(--on-surface)",
            border: "1px solid var(--outline-variant)",
          }}
          aria-label={copy.custom}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px]" style={{ color: message ? "var(--on-surface-variant)" : "transparent" }}>
          {message ?? copy.adminOnly}
        </span>
        <div className="flex items-center gap-2">
          <button className="m3-btn m3-btn--outlined h-8 px-3 text-[12px]" onClick={onClose}>
            {copy.cancel}
          </button>
          <button
            className="m3-btn h-8 px-3 text-[12px]"
            disabled={saving}
            onClick={() => onApply(draft, draft === "custom" ? normalizeHex(hex) ?? undefined : undefined)}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : copy.save}
          </button>
        </div>
      </div>
    </div>
  );
}
