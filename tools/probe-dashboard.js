(() => {
  const cards = [...document.querySelectorAll("article")];
  const meters = [...document.querySelectorAll(".track")].slice(0, 8).map((track) => ({
    width: Math.round(track.getBoundingClientRect().width),
    fill: getComputedStyle(track.querySelector("i")).backgroundColor,
    pct: track.querySelector("i").style.width,
  }));
  const hero = document.querySelector(".hero");
  const sidebar = document.querySelector("aside");
  return {
    cards: cards.length,
    heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
    heroTitle: document.querySelector("h1")?.textContent,
    heroTitleSize: getComputedStyle(document.querySelector("h1")).fontSize,
    sidebarWidgets: sidebar ? sidebar.querySelectorAll("section").length : 0,
    cardBg: cards[0] ? getComputedStyle(cards[0]).backgroundColor : null,
    cardRadius: cards[0] ? getComputedStyle(cards[0]).borderRadius : null,
    pageBg: getComputedStyle(document.body).backgroundColor,
    meters,
    errors: window.__errs || [],
  };
})()
