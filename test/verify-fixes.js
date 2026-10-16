const puppeteer = require("puppeteer-core");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader"]
  });
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1502, height: 900 });
  await pg.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await pg.goto("http://localhost:4173/", { waitUntil: "networkidle2" });

  await pg.evaluate(() => {
    const el = document.getElementById("calidad");
    window.scrollTo({ top: el.offsetTop - 70, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 3000));
  const cal = await pg.evaluate(() => {
    const s = document.getElementById("calidad");
    const img = s.querySelector("img");
    const col = s.querySelector(":scope > div:nth-child(2)");
    const r = (e) => {
      const b = e.getBoundingClientRect();
      return { top: Math.round(b.top), h: Math.round(b.height) };
    };
    return { seccion: r(s), imagen: r(img), columna: r(col) };
  });
  await pg.screenshot({ path: "shots/sec-s4-calidad.png" });

  // modal image natural size
  await pg.evaluate(() => {
    const el = document.getElementById("productos");
    window.scrollTo({ top: el.offsetTop - 70, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 600));
  await pg.evaluate(() => document.querySelector('[data-product="Tablas"]').click());
  await new Promise((r) => setTimeout(r, 1800));
  const modalImg = await pg.evaluate(() => {
    const i = document.querySelector("#technical-modal img");
    return { nat: `${i.naturalWidth}x${i.naturalHeight}`, complete: i.complete };
  });
  await pg.keyboard.press("Escape");

  // h1 ink width vs tree start
  await pg.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 800));
  const hero = await pg.evaluate(() => {
    const e = document.querySelector("h1");
    const rr = document.createRange();
    rr.selectNodeContents(e);
    const t = rr.getBoundingClientRect();
    return { h1w: Math.round(t.width), h1right: Math.round(t.right) };
  });

  // mobile: menu scrim + inert + CTA widths + form reveal
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await m.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  const cta = await m.evaluate(() => [...document.querySelectorAll(".hero .btn")].map((b) => Math.round(b.getBoundingClientRect().width)));
  await m.evaluate(() => document.getElementById("menu-toggle").click());
  await new Promise((r) => setTimeout(r, 800));
  const menu = await m.evaluate(() => ({
    scrimVisible: !document.getElementById("menu-scrim").classList.contains("hidden"),
    inertOpen: document.getElementById("mobile-nav").hasAttribute("inert"),
    focusableLinks: document.getElementById("mobile-nav").querySelector("a").matches(":focus") || !document.getElementById("mobile-nav").hasAttribute("inert")
  }));
  await m.screenshot({ path: "shots/mob-menu.png" });
  await m.evaluate(() => document.getElementById("menu-scrim").click());
  await new Promise((r) => setTimeout(r, 600));
  const menuClosed = await m.evaluate(() => ({
    scrimHidden: document.getElementById("menu-scrim").classList.contains("hidden"),
    inertClosed: document.getElementById("mobile-nav").hasAttribute("inert"),
    expanded: document.getElementById("menu-toggle").getAttribute("aria-expanded")
  }));

  // scroll to Escríbenos on mobile -> email card must reveal
  await m.evaluate(() => {
    const el = document.getElementById("contacto");
    window.scrollTo({ top: el.offsetTop - 60, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 900));
  await m.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1200));
  const emailReveal = await m.evaluate(() => {
    const c = document.querySelector("#contacto .email-card");
    return { isIn: c.classList.contains("is-in"), opacity: getComputedStyle(c).opacity };
  });
  await m.screenshot({ path: "shots/mob-contacto.png" });

  console.log(JSON.stringify({ cal, modalImg, hero, cta, menu, menuClosed, emailReveal }, null, 1));
  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
