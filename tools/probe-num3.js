(() => {
  const num = document.querySelector(".num");
  const root = document.documentElement;
  const matched = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const rule of rules) {
      if (!rule.selectorText) continue;
      const val = rule.style && rule.style.getPropertyValue("font-variant-numeric");
      if (!val) continue;
      let hit = false;
      try { hit = num.matches(rule.selectorText); } catch (e) {}
      if (hit) matched.push({ sel: rule.selectorText, val, layer: rule.parentRule ? "nested" : "top" });
    }
  }
  const readings = {};
  for (const v of ["normal", "slashed-zero", "tabular-nums"]) {
    root.style.setProperty("--num-variant", v);
    readings[v] = getComputedStyle(num).fontVariantNumeric;
  }
  return { cls: num.className, matched, readings };
})()
