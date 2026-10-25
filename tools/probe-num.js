(() => {
  const num = document.querySelector(".num");
  const before = num ? getComputedStyle(num).fontVariantNumeric : null;
  document.documentElement.style.setProperty("--num-variant", "normal");
  const after = num ? getComputedStyle(num).fontVariantNumeric : null;
  const cards = document.querySelectorAll("article").length;
  return { before, after, cards, errors: window.__errs || [] };
})()
