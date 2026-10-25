(() => {
  const cs = getComputedStyle(document.body);
  const root = getComputedStyle(document.documentElement);
  const link = document.getElementById("komari-theme-font");
  const h1 = document.querySelector("h1");
  return {
    bodyFont: cs.fontFamily,
    bodySize: cs.fontSize,
    titleFont: h1 ? getComputedStyle(h1).fontFamily : null,
    varFontBody: root.getPropertyValue("--font-body").trim().slice(0, 70),
    varFontSize: root.getPropertyValue("--font-size").trim(),
    varNum: root.getPropertyValue("--num-variant").trim(),
    fontLink: link ? { href: link.getAttribute("href"), rel: link.rel } : null,
    errors: window.__errs || [],
  };
})()
