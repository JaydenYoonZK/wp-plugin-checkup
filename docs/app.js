import { parseSlugs, apiUrl, directoryUrl, verdict, parseWpVersion } from "./checkup.js?v=20260710a";

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

let currentVersion = "6.7"; // fallback; refreshed from WordPress.org on load
let nowMs = Date.UTC(2026, 6, 7); // fallback; replaced with real clock at runtime

const LABEL = { removed: "GONE", abandoned: "ABANDONED", outdated: "CHECK", ok: "HEALTHY", error: "RETRY", checking: "…" };

async function fetchCurrentVersion() {
  try {
    const res = await fetch("https://api.wordpress.org/core/stable-check/1.0/");
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
  } catch { /* keep fallback */ }
}

async function fetchInfo(slug) {
  try {
    const res = await fetch(apiUrl(slug), { headers: { Accept: "application/json" } });
    // The API returns 404 with {"error":"Plugin not found."} for missing
    // plugins, so read the body before deciding it was a transport failure.
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON body */ }
    if (data && data.error) return { exists: false };
    if (!res.ok || !data) return { error: "network" };
    return {
      exists: true,
      name: data.name, version: data.version, last_updated: data.last_updated,
      tested: data.tested, active_installs: data.active_installs,
      rating: data.rating, num_ratings: data.num_ratings
    };
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
  syncControls();
  nowMs = Date.now();
  const slugs = parseSlugs(input.value);
  tbody.innerHTML = "";
  summary.innerHTML = "";
  results.hidden = false;

  if (!slugs.length) {
    kindNote.textContent = "No plugin slugs found. Paste plugin names, folder/file.php paths, or wordpress.org plugin URLs.";
    progressWrap.hidden = true;
    return;
  }

  const list = slugs.slice(0, MAX_PLUGINS);
  kindNote.textContent = `Checking ${list.length} plugin${list.length === 1 ? "" : "s"} against the WordPress.org directory` +
    (slugs.length > MAX_PLUGINS ? `. Only the first ${MAX_PLUGINS} are checked; split larger lists to stay polite to the API.` : ".");
  progressWrap.hidden = false;
  progressBar.style.width = "0%";
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
    while (queue.length) {
      const { slug, i } = queue.shift();
      const info = await fetchInfo(slug);
      const v = verdict(slug, info, { now: nowMs, currentVersion });
      verdicts[i] = v;
      rows[i].innerHTML = rowHtml(slug, v);
      done++;
      progressBar.style.width = `${Math.round(done / list.length * 100)}%`;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

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
  const ok = count("ok");
  if (!chips.length) chips.push(`<span class="chip ok"><strong>All ${list.length}</strong> look healthy</span>`);
  else if (ok) chips.push(`<span class="chip"><strong>${ok}</strong> healthy</span>`);
  summary.innerHTML = chips.join("");
  running = false;
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

clearBtn.addEventListener("click", () => { input.value = ""; results.hidden = true; syncControls(); input.focus(); });
syncControls();

fetchCurrentVersion().then(() => {
  if (new URLSearchParams(location.search).has("demo")) loadSample();
});

const themeToggle = document.getElementById("theme-toggle");
function syncThemeIcon() { themeToggle.textContent = document.documentElement.dataset.theme === "light" ? "🌙" : "☀️"; }
themeToggle.addEventListener("click", () => {
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
  for (const a of navAnchors) a.classList.toggle("active", !!current && a.hash === "#" + current.id);
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
