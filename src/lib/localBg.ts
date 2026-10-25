export interface LocalBackground {
  url: string;
  veil: number;
  blur: number;
  fit: "cover" | "contain" | "tile";
}

const STORAGE_KEY = "theme-background";

export function readLocalBackground(): LocalBackground | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalBackground>;
    if (!parsed || typeof parsed.url !== "string" || !parsed.url) return null;
    return {
      url: parsed.url,
      veil: typeof parsed.veil === "number" ? parsed.veil : 55,
      blur: typeof parsed.blur === "number" ? parsed.blur : 0,
      fit:
        parsed.fit === "contain" || parsed.fit === "tile" ? parsed.fit : "cover",
    };
  } catch {
    return null;
  }
}

export function writeLocalBackground(value: LocalBackground | null): void {
  try {
    if (!value) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota or private mode; caller falls back */
  }
}

/**
 * Downscale in the browser before storing: a 4000px photo would blow past the
 * ~5 MB localStorage quota as a data URL.
 */
export async function fileToDataUrl(
  file: File,
  maxWidth = 1920,
  quality = 0.85,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, maxWidth / (image.naturalWidth || maxWidth));
    const width = Math.max(1, Math.round((image.naturalWidth || maxWidth) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || maxWidth) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Tries progressively smaller encodings until the quota accepts it. */
export async function fitForStorage(file: File): Promise<string> {
  const attempts: Array<[number, number]> = [
    [1920, 0.85],
    [1440, 0.78],
    [1080, 0.72],
  ];
  let lastError: unknown = null;
  for (const [width, quality] of attempts) {
    const dataUrl = await fileToDataUrl(file, width, quality);
    try {
      localStorage.setItem(`${STORAGE_KEY}__probe`, dataUrl);
      localStorage.removeItem(`${STORAGE_KEY}__probe`);
      return dataUrl;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("image too large");
}
