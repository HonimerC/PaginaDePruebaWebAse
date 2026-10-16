/* =========================================================
   Pino Caribe — app.js (v2)
   Interacciones + animaciones de la landing (vanilla, sin dependencias)
   Dialectos: orgánico (.reveal) · medido (.wm) · dibujado (rules/ticks)
   ========================================================= */

const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReduced = rmQuery.matches;
if (rmQuery.addEventListener) {
  rmQuery.addEventListener("change", (e) => { prefersReduced = e.matches; });
}

/* ---------- viewport height custom var (evita saltos en mobile) ---------- */
const setVh = () => document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
setVh();
window.addEventListener("resize", setVh, { passive: true });

/* ---------- año en footer ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---------- menú móvil ---------- */
const menuButton = document.getElementById("menu-toggle");
const mobileNav = document.getElementById("mobile-nav");
const menuScrim = document.getElementById("menu-scrim");
const setMenu = (open) => {
  mobileNav.classList.toggle("is-open", open);
  mobileNav.toggleAttribute("inert", !open);
  menuScrim?.classList.toggle("hidden", !open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
};
menuButton?.addEventListener("click", () => setMenu(!mobileNav.classList.contains("is-open")));
menuScrim?.addEventListener("click", () => setMenu(false));
mobileNav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mobileNav?.classList.contains("is-open")) {
    setMenu(false);
    menuButton.focus();
  }
});

/* ---------- barra de progreso de scroll + header shrink + chain scrub ---------- */
const progressBar = document.getElementById("scroll-progress");
const header = document.getElementById("site-header");
const chain = document.getElementById("chain");
const proceso = document.getElementById("proceso");
const chainNodes = chain ? [...chain.querySelectorAll(".chain-node")] : [];
const CHAIN_MARKS = [0.06, 0.34, 0.62, 0.9];

const updateChain = () => {
  if (!chain || !proceso) return;
  if (prefersReduced) {
    chain.style.setProperty("--chain", "1");
    chainNodes.forEach((n) => n.classList.add("lit"));
    return;
  }
  const r = proceso.getBoundingClientRect();
  const vh = window.innerHeight;
  const span = r.height * 0.55 + vh * 0.3;
  const p = Math.max(0, Math.min(1, (vh * 0.8 - r.top) / span));
  chain.style.setProperty("--chain", p.toFixed(3));
  chainNodes.forEach((n, i) => n.classList.toggle("lit", p >= CHAIN_MARKS[i]));
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
    updateChain();
    ticking = false;
  });
};
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });
onScroll();

/* ---------- split text (dialecto medido: máscara por palabra / por carácter) ---------- */
const makeWord = (chunk, i, base) => {
  const wm = document.createElement("span");
  wm.className = "wm";
  const inner = document.createElement("i");
  inner.textContent = chunk;
  inner.style.setProperty("--i", String(i));
  inner.style.setProperty("--base", `${base}ms`);
  wm.appendChild(inner);
  return wm;
};

document.querySelectorAll("[data-split-words]").forEach((el) => {
  const base = Number(el.dataset.base || 0);
  const parts = (el.textContent || "").split(/(\s+)/);
  el.textContent = "";
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const chunk of parts) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      frag.appendChild(document.createTextNode(" "));
      continue;
    }
    frag.appendChild(makeWord(chunk, i, base));
    i++;
  }
  el.appendChild(frag);
});

document.querySelectorAll("[data-split-chars]").forEach((el) => {
  const base = Number(el.dataset.base || 0);
  const text = el.textContent || "";
  el.textContent = "";
  const frag = document.createDocumentFragment();
  let i = 0;
  for (const ch of text) {
    if (ch === " ") {
      frag.appendChild(document.createTextNode(" "));
      continue;
    }
    frag.appendChild(makeWord(ch, i, base));
    i++;
  }
  el.appendChild(frag);
});

/* ---------- tickers (solo números estructurales) ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
const runTicker = (el) => {
  if (el.dataset.ticked) return;
  el.dataset.ticked = "1";
  const target = Number(el.dataset.ticker || 0);
  if (prefersReduced) {
    el.textContent = pad2(target);
    return;
  }
  const dur = 750;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = pad2(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

/* ---------- reveal on scroll (observe todos los dialectos) ---------- */
const SELECTOR = ".reveal, .section-index, .scan-media, .grid-sweep, [data-split-words], [data-split-chars], [data-ticker]";
const revealEls = document.querySelectorAll(SELECTOR);
const enter = (el) => {
  el.classList.add("is-in");
  if (el.hasAttribute("data-ticker")) runTicker(el);
  el.querySelectorAll?.("[data-ticker]").forEach(runTicker);
  if (!prefersReduced) {
    const delayMs = (parseFloat(getComputedStyle(el).transitionDelay) || 0) * 1000;
    setTimeout(() => el.classList.add("is-settled"), delayMs + 800);
  }
};

if ("IntersectionObserver" in window && !prefersReduced) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          enter(entry.target);
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
  );
  revealEls.forEach((el) => io.observe(el));
  // failsafe: todo lo ya visible al cargar se revela sin esperar al observer
  requestAnimationFrame(() => {
    revealEls.forEach((el) => {
      if (el.classList.contains("is-in")) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95 && r.bottom > 0) enter(el);
    });
  });
} else {
  revealEls.forEach(enter);
}

/* ---------- spotlight que sigue el cursor en el hero ---------- */
const hero = document.getElementById("inicio");
const spotlight = document.getElementById("hero-spotlight");
if (hero && spotlight && !prefersReduced && window.matchMedia("(pointer: fine)").matches) {
  let raf = 0;
  hero.addEventListener(
    "pointermove",
    (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        spotlight.style.setProperty("--sx", `${((e.clientX - r.left) / r.width) * 100}%`);
        spotlight.style.setProperty("--sy", `${((e.clientY - r.top) / r.height) * 100}%`);
        raf = 0;
      });
    },
    { passive: true }
  );
}

/* ---------- spotlight en tarjetas (.spot-card) ---------- */
if (!prefersReduced && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".spot-card").forEach((card) => {
    card.addEventListener(
      "pointermove",
      (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      },
      { passive: true }
    );
  });
}

/* ---------- nav activa según sección visible (orden = orden del documento) ---------- */
const sectionIds = ["empresa", "proceso", "productos", "calidad", "mercados", "sostenibilidad", "contacto"];
const navLinks = [...document.querySelectorAll('.nav-link[href^="#"], .nav-cta[href^="#"]')];
if ("IntersectionObserver" in window && navLinks.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => {
          const active = a.getAttribute("href") === `#${entry.target.id}`;
          if (active) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sectionIds.forEach((id) => {
    const sec = document.getElementById(id);
    if (sec) spy.observe(sec);
  });
}

/* ---------- filtros de productos (pill que se desliza + estado) ---------- */
const filterButtons = [...document.querySelectorAll(".filter-btn")];
const productCards = [...document.querySelectorAll("#product-grid article")];
const filterPill = document.getElementById("filter-pill");
const filterStatus = document.getElementById("filter-status");

const movePill = (btn) => {
  if (!filterPill || !btn) return;
  filterPill.style.width = `${btn.offsetWidth}px`;
  filterPill.style.height = `${btn.offsetHeight}px`;
  filterPill.style.transform = `translateX(${btn.offsetLeft}px)`;
};

const updateStatus = () => {
  if (!filterStatus) return;
  const visible = productCards.filter((c) => !c.hidden).length;
  filterStatus.textContent = `Mostrando ${visible} de ${productCards.length} categorías`;
};

const applyFilter = (button) => {
  filterButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  movePill(button);
  const filter = button.dataset.filter;
  productCards.forEach((card) => {
    const show = filter === "todos" || card.dataset.category === filter;
    card.hidden = !show;
    if (show) {
      card.classList.remove("is-in");
      requestAnimationFrame(() => card.classList.add("is-in"));
    }
  });
  updateStatus();
};

filterButtons.forEach((button) => button.addEventListener("click", () => applyFilter(button)));
const activeBtn = filterButtons.find((b) => b.getAttribute("aria-pressed") === "true") || filterButtons[0];
movePill(activeBtn);
window.addEventListener("load", () => movePill(filterButtons.find((b) => b.getAttribute("aria-pressed") === "true")));
document.fonts?.ready?.then(() => movePill(filterButtons.find((b) => b.getAttribute("aria-pressed") === "true")));
window.addEventListener("resize", () => movePill(filterButtons.find((b) => b.getAttribute("aria-pressed") === "true")), { passive: true });

/* ---------- correo comercial (fuente única: #email-slot) ---------- */
const emailSlot = document.getElementById("email-slot");
const emailBadge = document.getElementById("email-badge");
const emailMailto = document.getElementById("email-mailto");
const EMAIL = (emailSlot?.textContent || "").trim();

if (emailSlot && EMAIL) {
  emailSlot.href = `mailto:${EMAIL}`;
  emailMailto?.setAttribute("href", `mailto:${EMAIL}`);
  // el badge "por confirmar" solo se muestra mientras el correo sea placeholder (.example)
  if (!/\.example$/i.test(EMAIL)) emailBadge?.setAttribute("hidden", "");
  document.querySelectorAll("[data-email-mirror]").forEach((el) => {
    el.textContent = EMAIL;
    if (el.tagName === "A") el.setAttribute("href", `mailto:${EMAIL}`);
  });
}

const copyBtn = document.getElementById("copy-email");
const copyStatus = document.getElementById("copy-status");
const legacyCopy = (text) => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
};

copyBtn?.addEventListener("click", async () => {
  if (!EMAIL || !copyStatus) return;
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(EMAIL);
      ok = true;
    }
  } catch { ok = false; }
  if (!ok) ok = legacyCopy(EMAIL);

  copyStatus.textContent = ok
    ? "Correo copiado al portapapeles."
    : `No se pudo copiar automáticamente. Correo: ${EMAIL}`;
  copyStatus.classList.add("is-visible");
  if (ok) {
    copyBtn.classList.add("is-copied");
    setTimeout(() => copyBtn.classList.remove("is-copied"), 2400);
  }
});

/* ---------- motes (partículas sutiles en Escríbenos) ---------- */
const motes = document.getElementById("motes");
if (motes && !prefersReduced) {
  const count = window.innerWidth < 768 ? 10 : 18;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "mote";
    s.style.left = `${(i / count) * 96 + Math.random() * 4}%`;
    s.style.setProperty("--o", (0.1 + Math.random() * 0.2).toFixed(2));
    s.style.animationDuration = `${10 + Math.random() * 10}s`;
    s.style.animationDelay = `${-Math.random() * 20}s`;
    motes.appendChild(s);
  }
}

/* ---------- modal de ficha técnica ---------- */
const modal = document.getElementById("technical-modal");
const modalName = document.getElementById("modal-product-name");
const closeBtn = document.getElementById("close-modal");
const contactBtn = document.getElementById("modal-contact");
const modalBg = [
  document.getElementById("site-header"),
  document.getElementById("contenido"),
  document.querySelector("footer"),
  document.getElementById("menu-scrim")
].filter(Boolean);
let returnFocus = null;

const focusables = () =>
  [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
  );

function openModal(product, trigger) {
  returnFocus = trigger;
  modalName.textContent = product;
  if (contactBtn && EMAIL) {
    contactBtn.setAttribute("href", `mailto:${EMAIL}?subject=${encodeURIComponent(`Ficha técnica — ${product}`)}`);
  }
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  if (progressBar) progressBar.style.opacity = "0";
  modalBg.forEach((el) => el.setAttribute("inert", ""));
  closeBtn.focus();
}

function closeModal(restore = true) {
  modal.classList.remove("is-open");
  document.body.style.overflow = "";
  if (progressBar) progressBar.style.opacity = "";
  modalBg.forEach((el) => el.removeAttribute("inert"));
  const finish = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    if (restore && returnFocus) returnFocus.focus();
  };
  prefersReduced ? finish() : setTimeout(finish, 220);
}

document.querySelectorAll("[data-product]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.product, button));
});
closeBtn?.addEventListener("click", () => closeModal());
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (modal.classList.contains("hidden")) return;
  if (e.key === "Escape") return closeModal();
  if (e.key === "Tab") {
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
contactBtn?.addEventListener("click", () => {
  setTimeout(() => closeModal(false), 80);
});

/* ---------- pausa de animaciones CSS fuera de pantalla ---------- */
if ("IntersectionObserver" in window && !prefersReduced) {
  const animIo = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.target.classList.toggle("anim-off", !en.isIntersecting)),
    { threshold: 0 }
  );
  document.querySelectorAll(".beam, .logo-marquee, .hero, .shine, .motes, .email-card").forEach((el) => animIo.observe(el));
}
