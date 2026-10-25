(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(500);
  const header = document.querySelector("header");
  const links = [...header.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() }));
  return {
    adminLinks: header.querySelectorAll('a[href="/admin"]').length,
    links,
    navItems: [...header.querySelectorAll("nav a")].map((a) => a.textContent.trim()),
    iconButtons: [...header.querySelectorAll(".m3-icon-btn")].map((el) => el.getAttribute("aria-label") || el.title),
    errors: window.__errs || [],
  };
})()
