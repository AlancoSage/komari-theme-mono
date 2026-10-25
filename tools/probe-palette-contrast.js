(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1000);
  document.querySelector('button[aria-label*="Palette"]').click();
  await wait(300);
  const panel = document.querySelector(".palette-panel");
  const text = [...panel.querySelectorAll("input")].find((i) => i.type !== "color");
  const cs = getComputedStyle(text);
  const mono = panel.querySelector(".palette-swatch");
  const monoCs = getComputedStyle(mono);
  return {
    hexColor: cs.color,
    hexBackground: cs.backgroundColor,
    panelBg: getComputedStyle(panel).backgroundColor,
    monoRing: monoCs.boxShadow,
    errors: window.__errs || [],
  };
})()
