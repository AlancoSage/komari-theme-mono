(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const sections = () =>
    [...document.querySelectorAll("main section")].map((section) => ({
      title: section.querySelector("h2")?.textContent ?? "",
      rows: section.querySelectorAll("li").length,
    }));

  await wait(600);
  const byGroup = sections();
  const rows = document.querySelectorAll("main li button").length;
  const activeNav = document.querySelector(".m3-navlink--active")?.textContent?.trim();
  const headerBg = getComputedStyle(document.querySelector("header")).backgroundColor;
  const title = document.querySelector("h1")?.textContent;

  const regionTab = [...document.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("按地区"),
  );
  regionTab?.click();
  await wait(400);
  const byRegion = sections();

  const firstRow = document.querySelector("main li button");
  firstRow?.click();
  await wait(900);
  const drawer = document.querySelector('aside[role="dialog"]');
  const drawerTitle = drawer?.querySelector("h2")?.textContent;
  drawer?.querySelector('button[aria-label="关闭"]')?.click();
  await wait(500);

  return {
    hash: location.hash,
    title,
    activeNav,
    headerBg,
    byGroup,
    byRegion,
    rows,
    drawerOpened: !!drawer,
    drawerTitle,
    hashAfterClose: location.hash,
    errors: window.__errs || [],
  };
})()
