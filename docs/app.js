import { parseSlugs, apiUrl, directoryUrl, pluginInfoFromApi, verdict, parseWpVersion } from "./checkup.js?v=1.2.2";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const input = $("input");
const results = $("results");
const summary = $("summary");
const tbody = $("tbody");
const kindNote = $("kind-note");
const progressWrap = $("progress");
const progressBar = $("progress-bar");
const checkBtn = $("check");
const clearBtn = $("clear");

// Enable Check and Clear only when there is content. Empty box = nothing to
// check and nothing to clear, so both are disabled (dimmed, dashed, not-allowed).
// Clear stays usable while a check runs; Check is disabled while busy or empty.
let running = false;
function syncControls() {
  const hasContent = input.value.trim().length > 0;
  checkBtn.disabled = running || !hasContent;
  clearBtn.disabled = !hasContent;
}
input.addEventListener("input", syncControls);

const MAX_PLUGINS = 150;
const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 12000;

let currentVersion = null;
let nowMs = Date.UTC(2026, 6, 7); // fallback; replaced with real clock at runtime
let runId = 0;
let activeRun = null;

const LABEL = { removed: "GONE", abandoned: "ABANDONED", outdated: "CHECK", ok: "HEALTHY", error: "RETRY", checking: "…" };

async function timedFetch(url, options = {}, parentSignal) {
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener("abort", relayAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", relayAbort);
  }
}

async function fetchCurrentVersion() {
  try {
    const res = await timedFetch("https://api.wordpress.org/core/stable-check/1.0/");
    if (!res.ok) return;
    const data = await res.json();
    const latest = Object.entries(data).filter(([, s]) => s === "latest").map(([v]) => v);
    if (latest.length) {
      // Pick the numerically highest "latest" version as x.y (string sort would
      // rank 6.9 above 6.10, so compare major then minor).
      currentVersion = latest.reduce((best, v) => {
        const a = parseWpVersion(v), b = parseWpVersion(best);
        if (!a) return best;
        if (!b || a.major > b.major || (a.major === b.major && a.minor > b.minor)) return v;
        return best;
      });
      $("wp-version").textContent = `current WordPress: ${currentVersion}`;
    }
  } catch { /* show the unavailable state below */ }
  if (!currentVersion) $("wp-version").textContent = "current WordPress version unavailable";
}

async function fetchInfo(slug, signal) {
  try {
    const res = await timedFetch(apiUrl(slug), { headers: { Accept: "application/json" } }, signal);
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    return pluginInfoFromApi(data, { ok: res.ok, status: res.status });
  } catch {
    return { error: "network" };
  }
}

function rowHtml(slug, v) {
  const level = v ? v.level : "checking";
  const pill = `<span class="pill ${level}">${LABEL[level] ?? level}</span>`;
  const name = v && v.name ? `<span class="pname">${esc(v.name)}</span><div class="pmeta">${esc(v.meta || "")}</div>` : "";
  const detail = v ? esc(v.detail) : "checking WordPress.org...";
  const link = ` <a href="${directoryUrl(slug)}" rel="noopener" target="_blank">directory</a>`;
  return `<td class="plug">${esc(slug)}${name ? "<br>" + name : ""}</td>
    <td>${pill}</td>
    <td><span class="detail">${detail}</span>${v && v.level !== "removed" && v.level !== "checking" ? link : ""}</td>`;
}

async function run() {
  activeRun?.abort();
  running = false;
  const id = ++runId;
  const controller = new AbortController();
  activeRun = controller;
  syncControls();
  nowMs = Date.now();
  let slugs;
  try {
    slugs = parseSlugs(input.value);
  } catch (error) {
    running = false;
    activeRun = null;
    syncControls();
    results.hidden = false;
    kindNote.textContent = error instanceof Error ? error.message : "Could not read that plugin list.";
    progressWrap.hidden = true;
    return;
  }
  tbody.innerHTML = "";
  summary.innerHTML = "";
  results.hidden = false;
  results.setAttribute("aria-busy", "false");

  if (!slugs.length) {
    kindNote.textContent = "No plugin slugs found. Paste plugin names, folder/file.php paths, or wordpress.org plugin URLs.";
    progressWrap.hidden = true;
    activeRun = null;
    return;
  }

  const list = slugs.slice(0, MAX_PLUGINS);
  kindNote.textContent = `Checking ${list.length} plugin${list.length === 1 ? "" : "s"} against the WordPress.org directory` +
    (slugs.length > MAX_PLUGINS ? `. Only the first ${MAX_PLUGINS} are checked; split larger lists to stay polite to the API.` : ".");
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
  progressWrap.setAttribute("aria-valuenow", "0");
  results.setAttribute("aria-busy", "true");
  running = true;
  syncControls();

  const rows = list.map(slug => {
    const tr = document.createElement("tr");
    tr.innerHTML = rowHtml(slug, null);
    tbody.appendChild(tr);
    return tr;
  });

  const verdicts = new Array(list.length);
  const queue = list.map((slug, i) => ({ slug, i }));
  let done = 0;

  async function worker() {
    while (queue.length && id === runId && !controller.signal.aborted) {
      const { slug, i } = queue.shift();
      const info = await fetchInfo(slug, controller.signal);
      if (id !== runId || controller.signal.aborted) return;
      const v = verdict(slug, info, { now: nowMs, currentVersion });
      verdicts[i] = v;
      rows[i].innerHTML = rowHtml(slug, v);
      done++;
      const percent = Math.round(done / list.length * 100);
      progressBar.style.width = `${percent}%`;
      progressWrap.setAttribute("aria-valuenow", String(percent));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (id !== runId || controller.signal.aborted) return;

  // reorder rows by severity
  const indexed = rows.map((tr, i) => ({ tr, level: verdicts[i]?.level ?? "error" }));
  const order = { removed: 0, abandoned: 1, outdated: 2, error: 3, ok: 4 };
  indexed.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  for (const { tr } of indexed) tbody.appendChild(tr);

  const count = (lvl) => verdicts.filter(v => v && v.level === lvl).length;
  const chips = [];
  if (count("removed")) chips.push(`<span class="chip red"><strong>${count("removed")}</strong> not in the directory</span>`);
  if (count("abandoned")) chips.push(`<span class="chip red"><strong>${count("abandoned")}</strong> abandoned</span>`);
  if (count("outdated")) chips.push(`<span class="chip amber"><strong>${count("outdated")}</strong> worth a look</span>`);
  if (count("error")) chips.push(`<span class="chip"><strong>${count("error")}</strong> could not be checked</span>`);
  const ok = count("ok");
  if (ok === list.length) chips.push(`<span class="chip ok"><strong>All ${list.length}</strong> look healthy</span>`);
  else if (ok) chips.push(`<span class="chip"><strong>${ok}</strong> healthy</span>`);
  summary.innerHTML = chips.join("");
  running = false;
  activeRun = null;
  results.setAttribute("aria-busy", "false");
  syncControls();
}

checkBtn.addEventListener("click", run);
input.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(); });

const SAMPLE = `woocommerce
classic-editor
akismet
hello-dolly
this-plugin-does-not-exist-xyz
contact-form-7`;

function loadSample() { input.value = SAMPLE; run(); }
$("sample").addEventListener("click", () => { loadSample(); input.scrollIntoView({ behavior: "smooth", block: "center" }); });

const pasteBtn = $("paste");
const pasteLabel = pasteBtn.textContent;
let pasteFlashTimer = 0;
let waitingForPaste = false;
function flashPaste(msg) {
  pasteBtn.textContent = msg;
  clearTimeout(pasteFlashTimer);
  pasteFlashTimer = setTimeout(() => { pasteBtn.textContent = pasteLabel; }, 2600);
}
pasteBtn.addEventListener("click", async () => {
  // Read the clipboard on every device. On iOS the system shows its Paste
  // confirmation bubble at the tap point; confirming it fills the box and
  // runs the check in one motion. That bubble is the minimum iOS allows
  // before a page may read the clipboard.
  try {
    const text = await navigator.clipboard.readText();
    if (text) { input.value = text; run(); return; }
    flashPaste("Clipboard is empty");
    return;
  } catch { /* declined or unsupported, fall back to a manual paste */ }
  waitingForPaste = true;
  input.focus();
  input.select(); // a manual paste then replaces the old content
  flashPaste(matchMedia("(pointer: coarse)").matches
    ? "Long-press the box, then Paste"
    : (navigator.platform?.includes("Mac") ? "Press ⌘V to paste" : "Press Ctrl+V to paste"));
});
// If the clipboard read was declined, the check still runs the moment a
// manual paste lands in the box.
input.addEventListener("paste", () => {
  if (!waitingForPaste) return;
  waitingForPaste = false;
  clearTimeout(pasteFlashTimer);
  pasteBtn.textContent = pasteLabel;
  setTimeout(run, 0); // let the pasted text land first
});

clearBtn.addEventListener("click", () => {
  activeRun?.abort();
  activeRun = null;
  runId++;
  running = false;
  input.value = "";
  tbody.innerHTML = "";
  summary.innerHTML = "";
  progressWrap.hidden = true;
  results.hidden = true;
  results.setAttribute("aria-busy", "false");
  syncControls();
  input.focus();
});
syncControls();

fetchCurrentVersion().then(() => {
  if (new URLSearchParams(location.search).has("demo")) loadSample();
});

const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() {
  const label = document.documentElement.dataset.theme === "light" ? "Switch to dark mode" : "Switch to light mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("data-tip", label);
}
let themeFadeTimer = 0;
themeToggle.addEventListener("click", () => {
  // Crossfade the page in one composited pass where the browser supports
  // view transitions; text then cannot re-ease its inherited color and lag
  // behind the page. Elsewhere, fall back to fading only non-inherited
  // colors so text switches in one clean step.
  if (document.startViewTransition) {
    document.documentElement.classList.add("vt-active");
    const vt = document.startViewTransition(() => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("theme", next);
      syncThemeIcon();
    });
    vt.finished.finally(() => document.documentElement.classList.remove("vt-active"));
    return;
  }
  document.documentElement.classList.add("theme-fading");
  clearTimeout(themeFadeTimer);
  themeFadeTimer = setTimeout(() => document.documentElement.classList.remove("theme-fading"), 500);
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  syncThemeIcon();
});
syncThemeIcon();

// Scroll spy: the active menu item is the last section whose heading sits
// at or above the reading line just below the sticky header. Computed from
// the scroll position rather than an IntersectionObserver band, because a
// menu jump lands the heading at the top of the viewport, outside any
// mid-viewport band, which left the highlight stuck on a section the page
// merely scrolled past.
const navAnchors = [...document.querySelectorAll(".nav-links a")];
const navSections = navAnchors.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
navSections.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
function syncActiveLink() {
  const nav = document.querySelector(".site-nav");
  const line = (nav ? nav.offsetHeight : 0) + 40;
  let current = null;
  for (const sec of navSections) {
    if (sec.getBoundingClientRect().top <= line) current = sec;
  }
  // At the very bottom the last section is current even when the page is
  // too short to lift its heading up to the line.
  if (navSections.length && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2) {
    current = navSections[navSections.length - 1];
  }
  for (const a of navAnchors) {
    const on = !!current && a.hash === "#" + current.id;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
}
let spyRaf = 0;
addEventListener("scroll", () => { if (!spyRaf) spyRaf = requestAnimationFrame(() => { spyRaf = 0; syncActiveLink(); }); }, { passive: true });
addEventListener("resize", syncActiveLink, { passive: true });
syncActiveLink();

const toTop = document.getElementById("to-top");
if (toTop) {
  addEventListener("scroll", () => { toTop.classList.toggle("show", scrollY > 600); }, { passive: true });
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

const scene = document.querySelector(".bg-scene");
if (scene && matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let rafId = 0;
  addEventListener("mousemove", (e) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      scene.style.setProperty("--px", (e.clientX / innerWidth - 0.5).toFixed(3));
      scene.style.setProperty("--py", (e.clientY / innerHeight - 0.5).toFixed(3));
    });
  }, { passive: true });
}
if (scene && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let scrollRaf = 0;
  const applyScroll = () => { scrollRaf = 0; scene.style.setProperty("--sy", String(scrollY)); };
  addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(applyScroll); }, { passive: true });
  applyScroll();
}

// The bar is a brand row plus a menu band, and the band wraps on narrow
// screens, so the anchor offset is measured rather than hardcoded.
const siteNav = document.querySelector(".site-nav");
if (siteNav) {
  const setNavHeight = () => document.documentElement.style.setProperty("--nav-h", siteNav.offsetHeight + "px");
  addEventListener("resize", setNavHeight, { passive: true });
  setNavHeight();
}

// Cursor dust: tiny chartreuse sparks trail the pointer and burn out about
// a second after it rests. Everything lives on one fixed canvas: spawning
// is distance-based so speed sets density, the animation loop stops the
// moment the last spark dies, and touch or reduced-motion visitors never
// pay for any of it.
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  // width/height 100% is load-bearing: a canvas is a replaced element, so
  // inset alone does not stretch it and it would lay out at its intrinsic
  // dpr-scaled size, drawing every spark dpr times too far from the cursor.
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2100;pointer-events:none;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let w = 0, h = 0;
  const size = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener("resize", size);

  // One pre-rendered glow sprite per theme: drawImage per spark is far
  // cheaper than building a fresh radial gradient every frame.
  const sprite = (core) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const halo = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    halo.addColorStop(0, "rgba(171, 207, 55, 0.55)");
    halo.addColorStop(0.4, "rgba(171, 207, 55, 0.16)");
    halo.addColorStop(1, "rgba(171, 207, 55, 0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = core;
    g.beginPath();
    g.arc(32, 32, 4.5, 0, 7);
    g.fill();
    return c;
  };
  // The pale core glows against the night theme; light mode gets a deeper
  // green core so the dust stays visible on cream.
  const dust = { dark: sprite("#d7ef7a"), light: sprite("#7e9c26") };

  const sparks = [];
  const MAX = 90;
  let raf = 0, prev = 0, lastX = -1, lastY = -1, carry = 0;

  const spawn = (x, y, dx, dy) => {
    if (sparks.length >= MAX) return;
    const a = Math.random() * Math.PI * 2;
    const push = 4 + Math.random() * 16;
    sparks.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(a) * push + dx * 1.4,
      vy: Math.sin(a) * push + dy * 1.4,
      life: 0,
      ttl: 0.45 + Math.random() * 0.5,
      r: 5 + Math.random() * 9,
      star: Math.random() < 0.25,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 4,
      seed: Math.random() * 40
    });
  };

  const star = (R) => {
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.quadraticCurveTo(R * 0.16, -R * 0.16, R, 0);
    ctx.quadraticCurveTo(R * 0.16, R * 0.16, 0, R);
    ctx.quadraticCurveTo(-R * 0.16, R * 0.16, -R, 0);
    ctx.quadraticCurveTo(-R * 0.16, -R * 0.16, 0, -R);
    ctx.fill();
  };

  const tick = (now) => {
    const t = now / 1000;
    const dt = Math.min(0.05, prev ? t - prev : 0.016);
    prev = t;
    ctx.clearRect(0, 0, w, h);
    const light = document.documentElement.dataset.theme === "light";
    const img = light ? dust.light : dust.dark;
    ctx.fillStyle = light ? "#7e9c26" : "#d7ef7a";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.ttl) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.9;
      s.vy = s.vy * 0.9 + 26 * dt; // the dust settles gently
      const k = 1 - s.life / s.ttl;
      const twinkle = 0.7 + 0.3 * Math.sin(t * 16 + s.seed);
      ctx.globalAlpha = k * k * twinkle;
      const R = s.r * (0.5 + 0.7 * k);
      ctx.drawImage(img, s.x - R, s.y - R, R * 2, R * 2);
      if (s.star) {
        s.rot += s.spin * dt;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        star(R * 0.9);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (sparks.length) raf = requestAnimationFrame(tick);
    else { raf = 0; prev = 0; ctx.clearRect(0, 0, w, h); }
  };

  addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    if (lastX < 0) { lastX = e.clientX; lastY = e.clientY; return; }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    carry += Math.hypot(dx, dy);
    while (carry > 10) {
      carry -= 10;
      spawn(e.clientX, e.clientY, dx, dy);
    }
    if (sparks.length && !raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();
