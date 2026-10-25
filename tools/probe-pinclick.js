(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(600);
  const pin = document.querySelector(".map-pin");
  pin.click();
  await wait(800);
  const drawer = document.querySelector('aside[role="dialog"]');
  const title = drawer?.querySelector("h2")?.textContent;
  const close = drawer?.querySelector('button[aria-label="关闭"]');
  close?.click();
  await wait(500);
  return { drawerOpened: !!drawer, title, hashAfterClose: location.hash, errors: window.__errs || [] };
})()
