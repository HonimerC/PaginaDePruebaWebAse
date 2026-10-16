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
  await new Promise((r) => setTimeout(r, 1500));

  // 1) brackets geometry + hover glow en Empresa
  await pg.evaluate(() => window.scrollTo({ top: document.getElementById("empresa").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1200));
  const cardBox = await pg.evaluate(() => {
    const c = document.querySelector("#empresa .spot-card.brackets");
    const r = c.getBoundingClientRect();
    const before = getComputedStyle(c, "::before");
    const after = getComputedStyle(c, "::after");
    return {
      bx: Math.round(r.x + r.width / 2), by: Math.round(r.y + r.height / 2),
      before: { w: before.width, h: before.height, bg: before.backgroundImage, bw: before.borderTopWidth },
      after: { w: after.width, h: after.height },
      hasGlow: !!c.querySelector(".spot-glow")
    };
  });
  await pg.hover(`#empresa .spot-card.brackets`);
  await new Promise((r) => setTimeout(r, 600));
  const empresaHover = await pg.evaluate(() => {
    const c = document.querySelector("#empresa .spot-card.brackets");
    const glow = c.querySelector(".spot-glow");
    return { glowOpacity: getComputedStyle(glow).opacity, transform: getComputedStyle(c).transform };
  });

  // hero CTA hover
  await pg.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 800));
  await pg.hover(`.hero .btn-primary`);
  await new Promise((r) => setTimeout(r, 600));
  const heroHover = await pg.evaluate(() => {
    const b = document.querySelector(".hero .btn-primary");
    return { transform: getComputedStyle(b).transform };
  });

  // product card hover
  await pg.evaluate(() => window.scrollTo({ top: document.getElementById("productos").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1200));
  await pg.hover(`#product-grid article:first-child`);
  await new Promise((r) => setTimeout(r, 700));
  const prodHover = await pg.evaluate(() => {
    const c = document.querySelector("#product-grid article:first-child");
    return { transform: getComputedStyle(c).transform };
  });

  // 2) map geometry
  const map = await pg.evaluate(() => {
    const area = document.querySelector(".map-area");
    const ar = area.getBoundingClientRect();
    const marker = area.querySelector(".map-marker").getBoundingClientRect();
    const tag = area.querySelector(".map-tag").getBoundingClientRect();
    const r1 = area.querySelector(".r1").getBoundingClientRect();
    const r2 = area.querySelector(".r2").getBoundingClientRect();
    const rel = (b) => ({ x: Math.round(b.x - ar.x), y: Math.round(b.y - ar.y), w: Math.round(b.width), h: Math.round(b.height) });
    return { marker: rel(marker), tag: rel(tag), r1: rel(r1), r2: rel(r2), tagOverlapsR1: !(tag.bottom < r1.top || tag.top > r1.bottom) };
  });
  await pg.screenshot({ path: "shots/gate-mercados.png" });

  // 3) email card self-start + caret on desktop
  await pg.evaluate(() => window.scrollTo({ top: document.getElementById("contacto").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1200));
  const emailDesk = await pg.evaluate(() => {
    const card = document.querySelector(".email-card");
    const slot = document.getElementById("email-slot");
    const caret = document.querySelector(".email-caret");
    const sb = slot.getBoundingClientRect();
    const cb = caret.getBoundingClientRect();
    return { cardH: Math.round(card.getBoundingClientRect().height), caretSameLine: Math.abs(cb.top - sb.top) < Math.max(24, sb.height) };
  });
  await pg.screenshot({ path: "shots/gate-contacto.png" });

  // 4) modal: progress hidden + inert
  await pg.evaluate(() => window.scrollTo({ top: document.getElementById("productos").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 500));
  await pg.evaluate(() => document.querySelector('[data-product="Tablas"]').click());
  await new Promise((r) => setTimeout(r, 600));
  const modalBits = await pg.evaluate(() => ({
    progressOpacity: getComputedStyle(document.getElementById("scroll-progress")).opacity,
    mainInert: document.getElementById("contenido").hasAttribute("inert")
  }));
  await pg.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 500));
  const progressBack = await pg.evaluate(() => getComputedStyle(document.getElementById("scroll-progress")).opacity);

  // 5) empresa brackets visual
  await pg.evaluate(() => window.scrollTo({ top: document.getElementById("empresa").offsetTop - 70, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1000));
  await pg.screenshot({ path: "shots/gate-empresa.png" });

  // 6) mobile: caret line + menu icon
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await m.goto("http://localhost:4173/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  await m.evaluate(() => {
    const el = document.getElementById("contacto");
    window.scrollTo({ top: el.offsetTop - 40, behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 1200));
  const caretMobile = await m.evaluate(() => {
    const slot = document.getElementById("email-slot");
    const caret = document.querySelector(".email-caret");
    const sb = slot.getBoundingClientRect();
    const cb = caret.getBoundingClientRect();
    const mr = document.documentElement;
    return { caretSameLine: Math.abs(cb.top - sb.top) < Math.max(24, sb.height), overflowX: mr.scrollWidth > mr.clientWidth };
  });
  await m.screenshot({ path: "shots/gate-mob-email.png" });
  await m.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 500));
  await m.evaluate(() => document.getElementById("menu-toggle").click());
  await new Promise((r) => setTimeout(r, 700));
  const menuIcon = await m.evaluate(() => ({
    expanded: document.getElementById("menu-toggle").getAttribute("aria-expanded"),
    closeVisible: getComputedStyle(document.querySelector("#menu-toggle .icon-close")).display !== "none",
    menuHidden: getComputedStyle(document.querySelector("#menu-toggle .icon-menu")).display === "none"
  }));
  await m.screenshot({ path: "shots/gate-mob-menu.png" });

  console.log(JSON.stringify({ cardBox, empresaHover, heroHover, prodHover, map, emailDesk, modalBits, progressBack, caretMobile, menuIcon }, null, 1));
  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
