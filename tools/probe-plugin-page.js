(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(600);
  const swatches = [...document.querySelectorAll(".swatch")];
  const tag = document.getElementById("theme").textContent;
  swatches[1].click();            // violet
  await wait(120);
  const afterClick = {
    picker: document.getElementById("picker").value,
    active: document.querySelector('.swatch[data-active="1"]')?.title,
  };
  document.getElementById("save").click();
  await wait(900);
  return {
    theme: tag,
    swatchCount: swatches.length,
    afterClick,
    status: document.getElementById("status").textContent,
    errors: window.__errs || [],
  };
})()
