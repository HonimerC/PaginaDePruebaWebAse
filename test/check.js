const puppeteer = require("puppeteer-core");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader"]
  });
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) => errors.push("REQFAIL: " + r.url() + " " + (r.failure()?.errorText || "")));

  await page.setViewport({ width: 1502, height: 619, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  const resp = await page.goto("http://localhost:4173/", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: "shots/desktop-hero.png" });

  // scroll through the page to trigger reveals + lazy images
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(async () => {
    const timeout = (ms) => new Promise((res) => setTimeout(res, ms));
    await Promise.all(
      [...document.images]
        .filter((i) => !i.complete)
        .map((i) =>
          Promise.race([
            new Promise((res) => { i.onload = i.onerror = res; }),
            timeout(6000)
          ])
        )
    );
  });
  await new Promise((r) => setTimeout(r, 800));

  // full page
  await page.screenshot({ path: "shots/desktop-full.png", fullPage: true });

  // check webgl canvas exists
  const hasCanvas = await page.evaluate(() => {
    const c = document.querySelector("#hero-tree canvas");
    if (!c) return "no-canvas";
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    return c.width > 0 && c.height > 0 ? `ok ${c.width}x${c.height} gl:${!!gl}` : "zero-size";
  });

  // perf metrics
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const paints = {};
    performance.getEntriesByType("paint").forEach((p) => (paints[p.name] = Math.round(p.startTime)));
    const res = performance.getEntriesByType("resource").map(r => ({ name: r.name.split("/").pop().slice(0,60), dur: Math.round(r.duration), size: r.transferSize }));
    return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0), paints, resCount: res.length, slow: res.filter(r=>r.dur>400) };
  });

  // mobile
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: "shots/mobile-hero.png" });
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: "shots/mobile-full.png", fullPage: true });

  // horizontal overflow check
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  }));

  console.log(JSON.stringify({ status: resp.status(), hasCanvas, metrics, overflow, errors, warnings }, null, 2));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

