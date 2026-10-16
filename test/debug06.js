const puppeteer = require("puppeteer-core");
(async () => {
  const b = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader"]
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1502, height: 900 });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  await p.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 350) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
  });
  await new Promise((r) => setTimeout(r, 2500));
  const info = await p.evaluate(() => {
    const el = document.querySelector('#sostenibilidad .reveal[data-reveal="mask"]');
    const img = el.querySelector("img");
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const q = img.getBoundingClientRect();
    return {
      cls: el.className,
      clip: cs.clipPath,
      opacity: cs.opacity,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      imgOk: img.complete && img.naturalWidth > 0,
      imgRect: { w: Math.round(q.width), h: Math.round(q.height) }
    };
  });
  console.log(JSON.stringify(info, null, 1));
  const el = await p.$("#sostenibilidad");
  await el.screenshot({ path: "shots/sec06.png" });
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
