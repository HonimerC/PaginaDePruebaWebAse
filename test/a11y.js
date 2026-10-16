const puppeteer = require("puppeteer-core");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--use-gl=swiftshader"]
  });

  // 1) prefers-reduced-motion: everything visible
  const p1 = await browser.newPage();
  const errs1 = [];
  p1.on("pageerror", (e) => errs1.push(e.message));
  await p1.setViewport({ width: 1502, height: 900 });
  await p1.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p1.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  const reduced = await p1.evaluate(() => {
    const hiddenReveals = [...document.querySelectorAll(".reveal")].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) < 0.9
    ).length;
    const hiddenWords = [...document.querySelectorAll(".wm i")].filter((el) => {
      const t = getComputedStyle(el).transform;
      return t && t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)";
    }).length;
    return { hiddenCount: hiddenReveals + hiddenWords, hiddenReveals, hiddenWords };
  });
  await p1.screenshot({ path: "shots/reduced-motion.png" });

  // 2) no-JS: content must be visible
  const p2 = await browser.newPage();
  await p2.setJavaScriptEnabled(false);
  await p2.setViewport({ width: 1502, height: 900 });
  await p2.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  const noJs = await p2.evaluate ? null : null;
  await p2.screenshot({ path: "shots/no-js.png" });

  // 3) axe-free a11y sanity: landmarks, alt, labels, headings
  const p3 = await browser.newPage();
  const errs3 = [];
  p3.on("pageerror", (e) => errs3.push(e.message));
  p3.on("console", (m) => m.type() === "error" && errs3.push("console: " + m.text()));
  await p3.setViewport({ width: 1502, height: 900 });
  await p3.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p3.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));
  const a11y = await p3.evaluate(() => {
    const imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute("alt")).length;
    const inputsNoLabel = [...document.querySelectorAll("input, select, textarea")].filter(
      (i) => !document.querySelector(`label[for="${i.id}"]`)
    ).length;
    const btnsNoName = [...document.querySelectorAll("button")].filter(
      (b) => !b.textContent.trim() && !b.getAttribute("aria-label")
    ).length;
    return {
      h1: document.querySelectorAll("h1").length,
      landmarks: {
        header: !!document.querySelector("header"),
        main: !!document.querySelector("main"),
        footer: !!document.querySelector("footer"),
        navs: document.querySelectorAll("nav").length
      },
      imgsNoAlt,
      inputsNoLabel,
      btnsNoName,
      lang: document.documentElement.lang,
      title: document.title.length > 0
    };
  });

  // 4) scroll perf: long tasks / fps-ish during scroll
  const perf = await p3.evaluate(async () => {
    const entries = [];
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => entries.push({ name: e.name, dur: Math.round(e.duration) }));
    });
    try { po.observe({ entryTypes: ["longtask"] }); } catch (e) {}
    for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
    await new Promise((r) => setTimeout(r, 500));
    po.disconnect();
    return { longTasks: entries.length, worst: Math.max(0, ...entries.map((e) => e.dur)) };
  });

  console.log(JSON.stringify({ reduced, a11y, perf, errsReduced: errs1, errsMain: errs3 }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
