const puppeteer = require("puppeteer-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--use-gl=swiftshader"]
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.setViewport({ width: 1502, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto("http://localhost:4173/", { waitUntil: "networkidle2", timeout: 45000 });

  const sections = [
    ["inicio", "s0-hero"],
    ["empresa", "s1-empresa"],
    ["proceso", "s2-proceso"],
    ["productos", "s3-productos"],
    ["calidad", "s4-calidad"],
    ["mercados", "s5-mercados"],
    ["sostenibilidad", "s6-sostenibilidad"],
    ["contacto", "s7-contacto"]
  ];

  const imgsOkEarly = await page.evaluate(() =>
    [...document.images].filter((i) => !i.closest("#technical-modal")).every((i) => i.complete && i.naturalWidth > 0)
  );

  for (const [id, name] of sections) {
    await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "instant" });
    }, id);
    await new Promise((r) => setTimeout(r, 1600));
    await page.screenshot({ path: `shots/sec-${name}.png` });
  }

  // tras recorrer todas las secciones, las lazy images deberían estar cargadas
  await new Promise((r) => setTimeout(r, 1800));
  const imgsOk = await page.evaluate(() =>
    [...document.images].filter((i) => !i.closest("#technical-modal")).every((i) => i.complete && i.naturalWidth > 0)
  );
  const imgsBroken = await page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src)
  );

  // modal interaction test
  await page.evaluate(() => window.scrollTo({ top: document.getElementById("productos").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => document.querySelector('[data-product="Vigas"]').click());
  await new Promise((r) => setTimeout(r, 900));
  const modalState = await page.evaluate(() => ({
    open: !document.getElementById("technical-modal").classList.contains("hidden"),
    name: document.getElementById("modal-product-name").textContent,
    focus: document.activeElement?.id
  }));
  await page.screenshot({ path: "shots/sec-modal.png" });

  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 500));
  const modalClosed = await page.evaluate(() => document.getElementById("technical-modal").classList.contains("hidden"));

  // filter test
  await page.evaluate(() => document.querySelector('[data-filter="vigas"]').click());
  await new Promise((r) => setTimeout(r, 300));
  const filterState = await page.evaluate(() => ({
    cards: [...document.querySelectorAll("#product-grid article")].map((a) => ({
      cat: a.dataset.category, hidden: a.hidden
    })),
    status: document.getElementById("filter-status").textContent,
    pill: (() => {
      const p = document.getElementById("filter-pill");
      const b = document.querySelector('[data-filter="vigas"]');
      return { w: p.style.width, tx: p.style.transform, matchesBtn: p.style.width === `${b.offsetWidth}px` };
    })()
  }));

  // copy email test (Escríbenos)
  await page.evaluate(() => window.scrollTo({ top: document.getElementById("contacto").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => document.getElementById("copy-email").click());
  await new Promise((r) => setTimeout(r, 500));
  const copyState = await page.evaluate(() => ({
    status: document.getElementById("copy-status").classList.contains("is-visible"),
    text: document.getElementById("copy-status").textContent,
    copied: document.getElementById("copy-email").classList.contains("is-copied"),
    badgeShown: !document.getElementById("email-badge").hasAttribute("hidden"),
    email: document.getElementById("email-slot").textContent.trim(),
    mirrors: [...document.querySelectorAll("[data-email-mirror]")].every((m) => m.textContent.trim() === document.getElementById("email-slot").textContent.trim())
  }));
  await page.screenshot({ path: "shots/sec-copy-ok.png" });

  // mobile
  const m = await browser.newPage();
  m.on("pageerror", (e) => errors.push("MOBILE PAGEERROR: " + e.message));
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await m.goto("http://localhost:4173/", { waitUntil: "networkidle2", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  await m.screenshot({ path: "shots/mob-hero.png" });
  await m.evaluate(() => document.getElementById("menu-toggle").click());
  await new Promise((r) => setTimeout(r, 800));
  await m.screenshot({ path: "shots/mob-menu.png" });
  await m.evaluate(() => document.getElementById("menu-toggle").click());
  for (const [id, name] of [["productos", "productos"], ["contacto", "contacto"]]) {
    await m.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: "instant" });
    }, id);
    await new Promise((r) => setTimeout(r, 1400));
    await m.screenshot({ path: `shots/mob-${name}.png` });
  }
  const mobileOverflow = await m.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth
  }));

  console.log(JSON.stringify({ imgsOkEarly, imgsOk, imgsBroken, modalState, modalClosed, filterState, copyState, mobileOverflow, errors }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
