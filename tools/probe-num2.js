(() => {
  const num = document.querySelector(".num");
  const root = document.documentElement;
  const rules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ".num") rules.push(rule.cssText.slice(0, 160));
      }
    } catch (e) {}
  }
  const beforeVar = getComputedStyle(root).getPropertyValue("--num-variant").trim();
  root.style.setProperty("--num-variant", "normal");
  return {
    rules,
    beforeVar,
    varNow: getComputedStyle(root).getPropertyValue("--num-variant").trim(),
    inlineStyleAttr: root.getAttribute("style").slice(0, 200),
    computed: getComputedStyle(num).fontVariantNumeric,
  };
})()
