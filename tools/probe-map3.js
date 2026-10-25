(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(400);
  const p = document.querySelector(".map-pin");
  const out = { hasFocus: document.hasFocus() };
  let seen = 0;
  p.addEventListener("focusin", () => { seen += 1; }, { once: true });
  p.focus();
  await wait(250);
  out.focusinSeen = seen;
  out.tip1 = document.querySelector(".map-tip")?.textContent ?? null;

  p.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  await wait(250);
  out.tip2 = document.querySelector(".map-tip")?.textContent ?? null;

  p.blur();
  await wait(250);
  out.tip3 = document.querySelector(".map-tip")?.textContent ?? null;

  // keyboard path: Enter should trigger the click handler
  p.focus();
  p.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await wait(250);
  p.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  p.click();
  await wait(700);
  out.drawer = !!document.querySelector('aside[role="dialog"]');
  out.hash = location.hash;
  out.errors = window.__errs || [];
  return out;
})()
