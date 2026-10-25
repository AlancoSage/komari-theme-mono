(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(500);
  const h1 = document.querySelector("h1");
  const cs = getComputedStyle(h1);
  const p = [...document.querySelectorAll("p")].find((el) => el.textContent?.includes("Powered by"));
  const info = {
    textShadow: cs.textShadow,
    fontWeight: cs.fontWeight,
    h1Font: cs.fontFamily.slice(0, 60),
    footerGap: p ? Math.round(innerHeight - p.getBoundingClientRect().bottom) : null,
  };
  const home = [...document.querySelectorAll("header nav a")].find((a) => a.getAttribute("href") === "#");
  home?.click();
  await wait(600);
  info.afterNav = { hash: location.hash, hero: !!document.querySelector("section.hero"), h1: document.querySelector("h1")?.textContent };
  const mapLink = [...document.querySelectorAll("header nav a")].find((a) => a.getAttribute("href") === "#sitemap");
  mapLink?.click();
  await wait(600);
  info.afterReturn = { hash: location.hash, title: document.querySelector("h1")?.textContent, sections: document.querySelectorAll("main section").length };
  info.errors = window.__errs || [];
  return info;
})()
