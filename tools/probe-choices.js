(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const cs = getComputedStyle(document.documentElement);
  const bg = document.querySelector(".bg-image");
  const card = document.querySelector("article");
  return {
    accent: cs.getPropertyValue("--accent").trim(),
    fontBody: cs.getPropertyValue("--font-body").trim().slice(0, 46),
    bgClass: bg ? bg.className : null,
    cardClass: card ? card.className : null,
    errors: window.__errs || [],
  };
})()
