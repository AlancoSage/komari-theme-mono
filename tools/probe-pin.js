(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const cards = [...document.querySelectorAll("article")].map((el) => ({
    name: el.querySelector(".node-name, h3, [data-node]")?.textContent?.trim() ?? el.textContent.slice(0, 12),
    chips: [...el.querySelectorAll(".m3-chip")].map((c) => c.textContent.trim()).filter((t) => /ms$/.test(t)).length,
  }));
  return { order: cards.map((c) => c.name), firstHasPing: cards[0]?.chips > 0, total: cards.length, errors: window.__errs || [] };
})()
