(async () => {
  const hero = document.querySelector(".hero");
  const after = getComputedStyle(hero, "::after");
  return { bg: after.backgroundImage.slice(0, 120), opacity: after.opacity, zIndex: after.zIndex };
})()
