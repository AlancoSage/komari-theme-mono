(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(700);
  const a = document.querySelector('header a[href="/"]');
  const img = a?.querySelector("img");
  return {
    badge: img ? null : a?.querySelector("span")?.textContent?.trim(),
    hasImg: !!img,
    imgSrc: img?.getAttribute("src") ?? null,
    imgSize: img ? [img.clientWidth, img.clientHeight] : null,
    errors: window.__errs || [],
  };
})()
