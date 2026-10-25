(() => {
  const layer = document.querySelector(".bg-image");
  const veil = document.querySelector(".bg-veil");
  const hero = document.querySelector(".hero");
  const footer = document.querySelector("footer");
  const card = document.querySelector("article");
  const cs = (el) => (el ? getComputedStyle(el) : null);
  return {
    hasLayer: !!layer,
    layerClass: layer ? layer.className : null,
    backgroundImage: layer ? cs(layer).backgroundImage.slice(0, 60) : null,
    size: layer ? cs(layer).backgroundSize : null,
    repeat: layer ? cs(layer).backgroundRepeat : null,
    filter: layer ? cs(layer).filter : null,
    veilOpacity: veil ? cs(veil).opacity : null,
    heroPlain: hero ? hero.className.includes("hero--plain") : null,
    heroBgImage: hero ? cs(hero).backgroundImage : null,
    cardOpacity: card ? cs(card).opacity : null,
    footerZ: footer ? cs(footer).zIndex : null,
    errors: window.__errs || [],
  };
})()
