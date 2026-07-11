/**
 * wp-plugin-checkup engine
 *
 * Parse a pasted list of WordPress plugins into slugs, and turn facts
 * from the WordPress.org plugin API into a plain-language health verdict.
 *
 * Pure functions, no DOM. Network calls live in app.js so this module
 * runs unchanged under Node's test runner. Dates are passed in so tests
 * are deterministic.
 */

export const ABANDONED_MONTHS = 24;
export const STALE_MONTHS = 12;
export const LOW_INSTALLS = 1000; // Legacy export. Install count no longer changes verdicts.
export const MAX_INPUT_LENGTH = 1024 * 1024;
export const MAX_PARSED_SLUGS = 10000;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADER_NAMES = new Set(["name", "title", "slug", "status", "plugin"]);
const WPCLI_STATUSES = new Set(["active", "active-network", "inactive", "must-use", "dropin"]);

/* ----------------------------- parsing ----------------------------- */

/** Extract a plugin slug from one line of pasted input, or null. */
export function slugFromLine(line) {
  if (typeof line !== "string") return null;
  let s = line.trim();
  if (!s || s.startsWith("#") || s.startsWith("//")) return null;

  // WP-CLI table borders and separators (+----+----+)
  if (/^[+|\-\s]+$/.test(s)) return null;

  // WP-CLI table row: | akismet | active | ... |  ->  first cell
  if (s.startsWith("|")) {
    s = s.split("|").map(c => c.trim()).find(c => c) || "";
    if (!s) return null;
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      const host = url.hostname.toLowerCase();
      if (host !== "wordpress.org" && !host.endsWith(".wordpress.org")) return null;
      const parts = url.pathname.split("/").filter(Boolean);
      const index = parts.indexOf("plugins");
      s = index !== -1 ? parts[index + 1] || "" : "";
    } catch { return null; }
  } else {
    s = s.replace(/\\/g, "/");
    const pluginPath = /(?:^|\/)wp-content\/plugins\/([^/]+)/i.exec(s);
    if (pluginPath) s = pluginPath[1];
    else if (s.includes("/")) s = s.split("/").filter(Boolean)[0] || "";
  }

  s = s.split(/[\s|]+/).find(t => t) || "";

  // strip a trailing .php just in case
  s = s.replace(/\.php$/i, "");

  // valid plugin slugs are lowercase letters, numbers, and hyphens
  s = s.toLowerCase();
  if (!SLUG_RE.test(s)) return null;
  // skip the WP-CLI header row's column name
  if (HEADER_NAMES.has(s)) return null;
  return s;
}

function csvFields(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      fields.push(value.trim()); value = "";
    } else value += c;
  }
  if (quoted) return null;
  fields.push(value.trim());
  return fields;
}

function jsonSlugs(input) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) return null;
    return data.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.name ?? item.slug ?? item.file ?? "";
      return "";
    });
  } catch { return null; }
}

/** Parse a whole pasted blob into a unique, ordered list of slugs. */
export function parseSlugs(input) {
  if (typeof input !== "string") throw new TypeError("plugin list must be a string");
  if (input.length > MAX_INPUT_LENGTH) throw new RangeError("plugin list exceeds 1 MiB");
  const seen = new Set();
  const out = [];
  const json = jsonSlugs(input);
  const lines = json ?? input.split(/\r?\n/);
  for (const line of lines) {
    let items = [String(line)];
    if (!json && !line.includes("|") && line.includes(",")) {
      const fields = csvFields(line);
      if (fields) {
        const first = fields[0].replace(/^"|"$/g, "").toLowerCase();
        const second = fields[1]?.toLowerCase();
        items = HEADER_NAMES.has(first) || WPCLI_STATUSES.has(second) ? [fields[0]] : fields;
      }
    }
    for (const item of items) {
      const slug = slugFromLine(item);
      if (slug && !seen.has(slug)) { seen.add(slug); out.push(slug); }
      if (out.length >= MAX_PARSED_SLUGS) return out;
    }
  }
  return out;
}

/* ----------------------------- helpers ----------------------------- */

/** Parse the API's "2026-05-28 1:51am GMT" into a timestamp (ms), or null. */
export function parseUpdated(str) {
  if (!str) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (!m) return null;
  const year = +m[1], month = +m[2], day = +m[3];
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? timestamp : null;
}

/** Parse a WordPress version into {major, minor}. A WP "major" release is the
 *  x.y pair (6.4, 6.5), not just the leading integer, so 6.4 and 6.7 are
 *  different majors. Patch (6.4.1) and anything after is ignored. */
export function parseWpVersion(v) {
  if (v == null) return null;
  const m = /^\s*(\d+)(?:\.(\d+))?(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?\s*$/.exec(String(v));
  return m ? { major: +m[1], minor: m[2] ? +m[2] : 0 } : null;
}

/** How many x.y releases the tested version is behind the current one. A major
 *  bump counts as ~10 minor releases, which is about how many WordPress ships
 *  per major, so the gap stays sensible across the x.9 -> (x+1).0 boundary.
 *  Positive means behind; zero or negative means current or ahead. Null when
 *  either version cannot be read. This replaces a leading-integer compare that
 *  treated every 6.x as the same version, which quietly disabled this check for
 *  the entire WordPress 6 era. */
export function testedVersionsBehind(tested, current) {
  const t = parseWpVersion(tested), c = parseWpVersion(current);
  if (!t || !c) return null;
  return (c.major - t.major) * 10 + (c.minor - t.minor);
}

export function monthsBetween(then, now) {
  return (now - then) / (1000 * 60 * 60 * 24 * 30.44);
}

export function apiUrl(slug) {
  if (!SLUG_RE.test(String(slug))) throw new TypeError("invalid WordPress.org plugin slug");
  const p = new URLSearchParams();
  p.set("action", "plugin_information");
  p.set("request[slug]", slug);
  for (const field of ["sections", "screenshots", "versions", "description", "short_description", "banners", "icons", "contributors", "ratings", "downloaded", "downloadlink", "donate_link"]) {
    p.set(`request[fields][${field}]`, "0");
  }
  return "https://api.wordpress.org/plugins/info/1.2/?" + p.toString();
}

export function directoryUrl(slug) {
  if (!SLUG_RE.test(String(slug))) throw new TypeError("invalid WordPress.org plugin slug");
  return `https://wordpress.org/plugins/${slug}/`;
}

/** Normalize a WordPress.org plugin-information API response. */
export function pluginInfoFromApi(data, { ok = true, status = 200 } = {}) {
  if (status === 404 && data?.error === "Plugin not found.") return { exists: false };
  if (!ok || !data || typeof data !== "object" || data.error || typeof data.slug !== "string") {
    return { error: "api" };
  }
  return {
    exists: true,
    name: typeof data.name === "string" ? data.name : undefined,
    version: typeof data.version === "string" ? data.version : undefined,
    last_updated: typeof data.last_updated === "string" ? data.last_updated : undefined,
    tested: typeof data.tested === "string" ? data.tested : undefined,
    active_installs: typeof data.active_installs === "number" ? data.active_installs : undefined,
    rating: typeof data.rating === "number" ? data.rating : undefined,
    num_ratings: typeof data.num_ratings === "number" ? data.num_ratings : undefined
  };
}

/* ----------------------------- verdict ----------------------------- */

const LEVEL_ORDER = { removed: 0, abandoned: 1, outdated: 2, error: 3, ok: 4 };

/**
 * Turn API facts into a verdict.
 * info: { exists, name?, version?, last_updated?, tested?, active_installs?, rating? }
 * ctx:  { now, currentVersion }
 */
export function verdict(slug, info, ctx) {
  const now = Number.isFinite(ctx?.now) ? ctx.now : Date.now();

  if (info?.error) {
    return { slug, level: "error", label: "Could not check", detail: "WordPress.org did not return usable plugin information. Try again in a moment." };
  }
  if (!info || !info.exists) {
    return {
      slug, level: "removed", label: "Not in the directory",
      detail: "No matching public listing was found. This can mean a custom or commercial plugin, an incorrect slug, or a directory plugin that was closed. Confirm the plugin's source and support status manually."
    };
  }

  const updated = parseUpdated(info.last_updated);
  const months = updated ? monthsBetween(updated, now) : null;
  const currentVersion = ctx?.currentVersion ?? ctx?.currentMajor;
  const behind = testedVersionsBehind(info.tested, currentVersion);
  const flags = [];

  if (months !== null && months >= ABANDONED_MONTHS) {
    return {
      slug, level: "abandoned", label: "Abandoned",
      name: info.name,
      detail: `No update in about ${Math.round(months)} months. Maintenance appears inactive, so compatibility and future fixes are uncertain. Check the support history and consider a maintained alternative.`,
      meta: metaLine(info, behind)
    };
  }

  if (months !== null && months >= STALE_MONTHS) flags.push(`last updated about ${Math.round(months)} months ago`);
  if (updated === null) flags.push("last-update date unavailable");
  if (!info.tested) flags.push("tested-up-to version unavailable");
  else if (currentVersion == null) flags.push("current WordPress version unavailable for comparison");
  else if (behind === null) flags.push("tested-up-to version could not be compared");
  else if (behind >= 2) flags.push(`only tested up to WordPress ${info.tested}`);

  if (flags.length) {
    return {
      slug, level: "outdated", label: "Worth a look",
      name: info.name,
      detail: capitalize(flags.join(", ")) + ". Not necessarily unsafe, but worth confirming it is still maintained before you rely on it.",
      meta: metaLine(info, behind)
    };
  }

  return {
    slug, level: "ok", label: "Healthy",
    name: info.name,
    detail: "Recently updated and tested with a current WordPress version.",
    meta: metaLine(info, behind)
  };
}

function metaLine(info, behind) {
  const bits = [];
  if (info.version) bits.push(`v${info.version}`);
  if (info.tested) bits.push(`tested to WP ${info.tested}`);
  if (typeof info.active_installs === "number" && info.active_installs > 0) {
    bits.push(`${info.active_installs.toLocaleString()}+ installs`);
  }
  if (typeof info.rating === "number" && info.num_ratings) bits.push(`${Math.round(info.rating)}% rating`);
  return bits.join(" · ");
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Sort verdicts most urgent first. */
export function sortVerdicts(list) {
  return [...list].sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9));
}
