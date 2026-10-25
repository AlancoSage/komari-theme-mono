/**
 * Talking to Komari's own admin API from the theme.
 *
 * The theme runs on the same origin as the panel, so the admin session cookie
 * is already attached — no token juggling needed. Komari exposes theme writes as
 * plain REST (`POST /api/admin/theme/settings?theme=<short>`), which lets us draw
 * a real colour picker here instead of a hex text box in the admin form.
 *
 * Everything is best-effort: a 401 (visitor is not an admin) simply hides the UI.
 */

const SETTINGS_PATH = "/api/admin/theme/settings";

/** True when the current browser holds a valid admin session. */
export async function probeAdmin(): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/theme/list", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { status?: string };
    return body?.status !== "error";
  } catch {
    return false;
  }
}

/**
 * Komari stores the whole settings map per theme, so callers must send the full
 * object (merged) rather than a patch — anything omitted would be dropped.
 */
export async function saveThemeSettings(
  short: string,
  settings: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(`${SETTINGS_PATH}?theme=${encodeURIComponent(short)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { status?: string };
    return body?.status !== "error";
  } catch {
    return false;
  }
}
