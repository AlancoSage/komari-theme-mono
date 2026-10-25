(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(600);
  const title = document.querySelector(".hero-title");
  const header = document.querySelector("header");
  const out = {
    heroTitleColor: getComputedStyle(title).color,
    heroBg: getComputedStyle(document.querySelector(".hero")).backgroundImage.slice(0, 46),
    headerColor: getComputedStyle(header).color,
    navActiveColor: getComputedStyle(document.querySelector(".m3-navlink--active")).color,
  };
  document.documentElement.classList.add("has-banner");
  await wait(150);
  out.bannerHeaderColor = getComputedStyle(header).color;
  out.bannerHeroTitle = getComputedStyle(title).color;
  document.documentElement.classList.remove("has-banner");
  out.errors = window.__errs || [];
  return out;
})()
