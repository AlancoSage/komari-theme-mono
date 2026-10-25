(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const pins = [...document.querySelectorAll(".map-pin")].map((p) => ({
    label: p.getAttribute("aria-label").split(" —")[0],
    left: p.style.left,
    top: p.style.top,
    count: p.querySelector(".map-pin__count")?.textContent ?? "1",
  }));
  return { pinCount: pins.length, pins, mapCard: !!document.querySelector('svg[role="img"]'), errors: window.__errs || [] };
})()
