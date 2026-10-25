(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1200);
  document.querySelector('button[aria-label="调色板 / Palette"]').click();
  await wait(300);
  const panel = document.querySelector(".palette-panel");
  const inputs = [...panel.querySelectorAll("input")];
  const colorInput = panel.querySelector('input[type="color"]');
  const textInput = inputs.find((i) => i.type !== "color");
  const before = { color: colorInput.value, text: textInput.value, active: panel.querySelector("[data-active]")?.title ?? null };

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(colorInput, "#3366ff");
  colorInput.dispatchEvent(new Event("input", { bubbles: true }));
  await wait(200);
  const after = { color: colorInput.value, text: textInput.value, active: panel.querySelector("[data-active]")?.title ?? null };

  return { before, after, errors: window.__errs || [] };
})()
