(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(600);
  const pins = [...document.querySelectorAll(".map-pin")];
  const counts = pins.map((p) => p.querySelector(".map-pin__count")?.textContent ?? "1");
  const box = document.querySelector('svg[role="img"]')?.getBoundingClientRect();
  const path = document.querySelector('svg path[fill]');
  const bbox = path?.getBBox();
  pins[0]?.focus();
  await wait(350);
  const tip = document.querySelector(".map-tip");
  const tipRows = [...document.querySelectorAll(".map-tip__row")].map((b) => b.textContent);
  const tipVisible = tip ? getComputedStyle(tip).opacity !== "0" && tip.offsetWidth > 0 : false;
  const label = pins[0]?.getAttribute("aria-label");
  tipRows.length && document.querySelectorAll(".map-tip__row")[0].click();
  await wait(800);
  const drawer = document.querySelector('aside[role="dialog"]');
  return {
    pinCount: pins.length,
    counts,
    mapRect: box ? { w: Math.round(box.width), h: Math.round(box.height) } : null,
    pathBBox: bbox ? { w: Math.round(bbox.width), h: Math.round(bbox.height) } : null,
    tipVisible,
    tipRows,
    label,
    drawerOpened: !!drawer,
    drawerTitle: drawer?.querySelector("h2")?.textContent,
    hash: location.hash,
    errors: window.__errs || [],
  };
})()
