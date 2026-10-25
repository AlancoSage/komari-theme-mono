(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  const btn = document.querySelector('button[aria-label="调色板 / Palette"]');
  if (!btn) return { button: false };
  btn.click();
  await wait(350);
  const panel = document.querySelector(".palette-panel");
  if (!panel) return { button: true, panel: false };
  const swatches = [...panel.querySelectorAll(".palette-swatch")];
  const colorInput = panel.querySelector('input[type="color"]');
  swatches[6].click();
  await wait(120);
  const save = [...panel.querySelectorAll("button")].find((b) => /保存|Save/.test(b.textContent));
  save.click();
  await wait(1800);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return {
    button: true,
    panel: true,
    swatches: swatches.length,
    colorInput: !!colorInput,
    accentAfterSave: accent,
    message: (panel.textContent.match(/已保存|保存失败|Saved|failed/) || [null])[0],
    errors: window.__errs || [],
  };
})()
