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
export const LOW_INSTALLS = 1000;

/* ----------------------------- parsing ----------------------------- */

/** Extract a plugin slug from one line of pasted input, or null. */
export function slugFromLine(line) {
  let s = line.trim();
  if (!s || s.startsWith("#") || s.startsWith("//")) return null;

  // WP-CLI table borders and separators (+----+----+)
  if (/^[+|\-\s]+$/.test(s)) return null;

  // WP-CLI table row: | akismet | active | ... |  ->  first cell
  if (s.startsWith("|")) {
    s = s.split("|").map(c => c.trim()).find(c => c) || "";
    if (!s) return null;
  }

  // wordpress.org plugin URL
  const urlMatch = s.match(/wordpress\.org\/plugins\/([a-z0-9-]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  // Any other URL is not a directory plugin
  if (/^https?:\/\//i.test(s)) return null;

  // folder/file.php  ->  folder
  if (s.includes("/")) s = s.split("/")[0];

  // comma / space / remaining pipe separated: take the first non-empty token
  s = s.split(/[\s,|]+/).find(t => t) || "";

  // strip a trailing .php just in case
  s = s.replace(/\.php$/i, "");

  // valid plugin slugs are lowercase letters, numbers, and hyphens
  s = s.toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) return null;
  // skip the WP-CLI header row's column name
  if (["name", "title", "slug", "status", "plugin"].includes(s)) return null;
  return s;
}

/** Parse a whole pasted blob into a unique, ordered list of slugs. */
export function parseSlugs(input) {
  const seen = new Set();
  const out = [];
  for (const line of input.split(/\r?\n/)) {
    // A pipe row is a WP-CLI table (the slug is its first cell). Any other line
    // may be a comma-and-space separated list, so split it into items. The split
    // requires whitespace after the comma so that tight CSV output like
    // "akismet,active,none,5.7" is left whole and its columns are not mistaken
    // for plugin slugs; slugFromLine still takes the first token of that line.
    const items = line.includes("|") ? [line] : line.split(/,\s+/);
    for (const item of items) {
      const slug = slugFromLine(item);
      if (slug && !seen.has(slug)) { seen.add(slug); out.push(slug); }
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
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

/** Parse a WordPress version into {major, minor}. A WP "major" release is the
 *  x.y pair (6.4, 6.5), not just the leading integer, so 6.4 and 6.7 are
 *  different majors. Patch (6.4.1) and anything after is ignored. */
export function parseWpVersion(v) {
  if (v == null) return null;
  const m = /^(\d+)(?:\.(\d+))?/.exec(String(v));
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
  const p = new URLSearchParams();
  p.set("action", "plugin_information");
  p.set("request[slug]", slug);
  p.set("request[fields][sections]", "false");
  p.set("request[fields][screenshots]", "false");
  p.set("request[fields][versions]", "false");
  return "https://api.wordpress.org/plugins/info/1.2/?" + p.toString();
}

export function directoryUrl(slug) {
  return `https://wordpress.org/plugins/${slug}/`;
}

/* ----------------------------- verdict ----------------------------- */

const LEVEL_ORDER = { removed: 0, abandoned: 1, outdated: 2, error: 3, ok: 4 };

/**
 * Turn API facts into a verdict.
 * info: { exists, name?, version?, last_updated?, tested?, active_installs?, rating? }
 * ctx:  { now, currentVersion }
 */
export function verdict(slug, info, ctx) {
  const now = ctx.now;

  if (info && info.error === "network") {
    return { slug, level: "error", label: "Could not check", detail: "Network error reaching WordPress.org. Try again in a moment." };
  }
  if (!info || !info.exists) {
    return {
      slug, level: "removed", label: "Not in the directory",
      detail: "WordPress.org has no such plugin. It may have been removed from the directory, which often means an unresolved security or guideline problem, or it is a premium or custom plugin. If you did not install it deliberately from a trusted source, treat this as urgent."
    };
  }

  const updated = parseUpdated(info.last_updated);
  const months = updated ? monthsBetween(updated, now) : null;
  const currentVersion = ctx.currentVersion ?? ctx.currentMajor;
  const behind = testedVersionsBehind(info.tested, currentVersion);
  const flags = [];

  if (months !== null && months >= ABANDONED_MONTHS) {
    return {
      slug, level: "abandoned", label: "Abandoned",
      name: info.name,
      detail: `No update in about ${Math.round(months)} months. Unmaintained plugins are the most common way WordPress sites get compromised. Look for an actively maintained alternative.`,
      meta: metaLine(info, behind)
    };
  }

  if (months !== null && months >= STALE_MONTHS) flags.push(`last updated about ${Math.round(months)} months ago`);
  if (behind !== null && behind >= 2) flags.push(`only tested up to WordPress ${info.tested}`);
  if (typeof info.active_installs === "number" && info.active_installs > 0 && info.active_installs < LOW_INSTALLS) {
    flags.push(`${info.active_installs.toLocaleString()} active installs`);
  }

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
