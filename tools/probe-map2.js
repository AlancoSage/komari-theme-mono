(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(500);
  const p = document.querySelector(".map-pin");
  const out = { tag: p?.tagName, disabled: p?.disabled, tabIndex: p?.tabIndex };
  p.focus();
  await wait(300);
  out.activeAfterFocus = document.activeElement === p;
  out.activeClass = document.activeElement?.className;
  out.tipAfterFocus = document.querySelector(".map-tip")?.textContent ?? null;
  p.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await wait(300);
  out.tipAfterOver = document.querySelector(".map-tip")?.textContent ?? null;
  p.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
  await wait(300);
  out.tipAfterEnter = document.querySelector(".map-tip")?.textContent ?? null;
  out.errors = window.__errs || [];
  return out;
})()
