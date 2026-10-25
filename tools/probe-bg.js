(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const layer = document.querySelector(".bg-image");
  const cs = layer ? getComputedStyle(layer) : null;
  return {
    dark: document.documentElement.classList.contains("dark"),
    hasLayer: !!layer,
    bgImage: cs ? cs.backgroundImage : null,
    varLight: getComputedStyle(document.documentElement).getPropertyValue("--bg-light").trim() || null,
    heroPlain: !!document.querySelector(".hero--plain"),
    errors: window.__errs || [],
  };
})()
