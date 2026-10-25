(() => {
  const root = document.documentElement;
  const body = getComputedStyle(document.body);
  const card = document.querySelector('article');
  const cardBg = card ? getComputedStyle(card).backgroundColor : null;
  return {
    dark: root.classList.contains('dark'),
    scheme: getComputedStyle(root).colorScheme,
    bodyBg: body.backgroundColor,
    bodyColor: body.color,
    cardBg,
    blend: card ? getComputedStyle(card).backdropFilter : null,
    accent: getComputedStyle(root).getPropertyValue('--accent-to').trim(),
    lang: root.lang,
    errors: window.__errs || [],
  };
})()
