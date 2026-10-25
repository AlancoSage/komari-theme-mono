(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  document.querySelector('button[aria-label="调色板 / Palette"]').click();
  await wait(300);
  const panel = document.querySelector(".palette-panel");
  const colorInput = panel.querySelector('input[type="color"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(colorInput, "#3366ff");
  colorInput.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(200);
  const status = panel.querySelector("span[class*='text-[11px]']");
  const save = [...panel.querySelectorAll("button")].find((b) => /保存|Save/.test(b.textContent));
  save.click();
  await wait(2500);
  return {
    statusText: status ? status.textContent : null,
    accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    accentOn: getComputedStyle(document.documentElement).getPropertyValue("--accent-on").trim(),
    errors: window.__errs || [],
  };
})()
