(async () => {
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 500));
  const list = [...document.querySelectorAll("footer")];
  const f = list[list.length - 1];
  const cs = getComputedStyle(f);
  const r = f.getBoundingClientRect();
  const hit = document.elementFromPoint(
    Math.min(innerWidth - 10, r.x + r.width / 2),
    Math.min(innerHeight - 10, r.y + r.height / 2)
  );
  return {
    footerCls: f.className,
    position: cs.position,
    zIndex: cs.zIndex,
    text: f.innerText.replace(/\s+/g, " ").slice(0, 70),
    scrollY: Math.round(window.scrollY),
    hit: hit ? `${hit.tagName}.${String(hit.className).slice(0, 50)}` : null,
    errors: window.__errs || [],
  };
})()
