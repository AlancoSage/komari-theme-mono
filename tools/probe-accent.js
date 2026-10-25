(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(600);
  const cs = getComputedStyle(document.documentElement);
  const chip = document.querySelector(".m3-chip--accent");
  return {
    accent: cs.getPropertyValue("--accent").trim(),
    accentOn: cs.getPropertyValue("--accent-on").trim(),
    chipBg: chip ? getComputedStyle(chip).backgroundColor : null,
    chipFg: chip ? getComputedStyle(chip).color : null,
    errors: window.__errs || [],
  };
})()
