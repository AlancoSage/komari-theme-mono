(async () => {
  window.scrollTo(0, 1600);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const header = document.querySelector("header");
  const s = getComputedStyle(header);
  const brand = document.querySelector("header a span:nth-child(2)");
  return {
    scrollY: Math.round(window.scrollY),
    headerBg: s.backgroundColor,
    headerColor: s.color,
    borderBottom: s.borderBottomColor,
    brandColor: brand ? getComputedStyle(brand).color : null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    errors: window.__errs || [],
  };
})()
