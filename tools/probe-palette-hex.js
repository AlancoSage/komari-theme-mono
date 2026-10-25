(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  const btn = document.querySelector('button[aria-label="调色板 / Palette"]');
  if (!btn) return { button: false };
  btn.click();
  await wait(300);
  const panel = document.querySelector(".palette-panel");
  const input = panel.querySelector('input[type="color"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, "#3366ff");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(150);
  const hexField = panel.querySelector('input[aria-label]');
  const save = [...panel.querySelectorAll("button")].find((b) => /保存|Save/.test(b.textContent));
  save.click();
  await wait(1800);
  return {
    typedHex: hexField ? hexField.value : null,
    accentAfterSave: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    accentOn: getComputedStyle(document.documentElement).getPropertyValue("--accent-on").trim(),
    errors: window.__errs || [],
  };
})()
