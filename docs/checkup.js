/*! WP Plugin Checkup | Copyright (c) 2026 Jayden Yoon ZK | MIT License | https://github.com/JaydenYoonZK/wp-plugin-checkup */
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

const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const HEADER_NAMES = new Set(["name", "title", "slug", "status", "plugin"]);
const WPCLI_STATUSES = new Set(["active", "active-network", "inactive", "must-use", "dropin"]);
// Every column wp plugin list can print. A line made only of these words is a
// table header, not a plugin list; "update" and "version" are REAL directory
// slugs, so a header read as slugs would put phantom verdicts on top.
const COLUMN_NAMES = new Set([
  ...HEADER_NAMES, "update", "version", "update_version", "auto_update",
  "description", "wporg_status", "wporg_last_updated", "recently_active", "file",
  // wp plugin get prints an assoc Field/Value table; verify-checksums
  // reports plugin_name/file/message columns; author appears in both
  "field", "value", "author", "message"
]);
// The metadata keys a wp plugin get assoc table can print. A 2-cell row
// whose key is none of these ends the assoc block: it belongs to whatever
// the user pasted next, not to the table.
const ASSOC_META_KEYS = new Set([
  ...COLUMN_NAMES, "rating", "num_ratings", "requires", "requires_php",
  "tested", "downloaded", "last_updated", "homepage", "download_link"
]);
// A column label: a column word, or a phrase/compound made only of column
// words ("Plugin Name", "plugin_name"). "Site Name" is NOT one: "site" is
// someone's data, and treating it as the plugin column minted phantoms once.
function isColumnLabel(w) {
  if (COLUMN_NAMES.has(w)) return true;
  if (!/[\s_]/.test(w)) return false;
  return w.split(/[\s_]+/).filter(Boolean).every(p => COLUMN_NAMES.has(p) || p === "by");
}
// A header row is made of column labels: all of them, or at least two among
// three-plus cells (real headers tolerate one custom column; a data row
// like "name,akismet" that merely STARTS with a column word does not).
function isHeaderCells(lower) {
  if (lower.length < 2) return false;
  const labels = lower.filter(isColumnLabel).length;
  return labels === lower.length || (lower.length >= 3 && labels >= 2);
}
// The plugin column, by key priority (exact word first, then a compound
// containing the key), so an exact "Plugin" beats an earlier "... Name".
function slugColumnIndex(lower) {
  for (const k of ["slug", "plugin", "name", "title"]) {
    const i = lower.indexOf(k);
    if (i !== -1) return i;
  }
  for (const k of ["slug", "plugin", "name", "title"]) {
    const i = lower.findIndex(f => isColumnLabel(f) && /[\s_]/.test(f) && f.split(/[\s_]+/).includes(k));
    if (i !== -1) return i;
  }
  return -1;
}
// Directory slugs for files that live directly in wp-content/plugins/.
// index.php is the silence-is-golden stub in every install, not a plugin.
const FILE_ALIASES = new Map([["hello", "hello-dolly"], ["index", null]]);
const VERSION_TOKEN_RE = /^v?\d+(?:\.\d+)+$/;
// Listing furniture that must never become a verdict row on its own: the
// wp-admin row actions and status labels every Plugins-page copy contains,
// and wp-cli's update-column values. None is a live directory slug (checked
// against the API); anyone who really means one can paste its URL.
const UI_FRAMING_WORDS = new Set([
  ...WPCLI_STATUSES, "activate", "deactivate", "settings", "delete",
  "none", "available", "unavailable", "on", "off"
]);
// Conjunctions and glue words: a "list" containing one is a sentence, and a
// sentence is reported back, never guessed at ("and" would otherwise render
// its own verdict row in "akismet and contact-form-7").
const STOP_WORDS = new Set(["and", "or", "the", "with", "w", "plus", "also", "then"]);

/* ----------------------------- parsing ----------------------------- */

/** Email-quote prefixes on a forwarded list, and the markers of a
 *  hand-written checklist ("- akismet", "* akismet", "1. akismet"). A YAML
 *  "- name:" item survives because the yaml pattern tolerates a missing dash. */
function stripLineDecorations(s) {
  return s.replace(/^(?:>\s*)+/, "").replace(/^(?:[-*+•]|\d+[.)])\s+/, "");
}

/** A line of space-separated slugs (ls output of wp-content/plugins, a
 *  hand-typed one-liner). Three discriminators keep prose and table headers
 *  out, because every rejected line is reported while every accepted token
 *  gets a verdict: display names have capitals or bare numbers ("Contact
 *  Form 7"); lowercase prose ("yoast seo") has no slug-marker characters,
 *  while real folder listings virtually always carry a hyphen, underscore,
 *  digit, or .php somewhere; and a line made only of wp-cli column names is
 *  a borderless table header. Returns the tokens, or null. */
export function slugListTokens(line) {
  if (typeof line !== "string" || /[A-Z]/.test(line)) return null;
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  if (WPCLI_STATUSES.has(tokens[1]) || VERSION_TOKEN_RE.test(tokens[1])) return null;
  if (!tokens.some(t => /[-_./0-9]/.test(t))) return null;
  if (tokens.some(t => STOP_WORDS.has(t))) return null;
  const cleaned = tokens.map(t => {
    // ls -F / ls -p decorate entries with a trailing slash, and grep-style
    // output pairs the folder with a FILE (the dot is what separates
    // "akismet/akismet.php" from the conjunction "and/or")
    let w = t.replace(/\/+$/, "");
    const pair = /^([a-z0-9_-]+)\/[a-z0-9_-]+\.[a-z0-9.]+$/.exec(w);
    if (pair) w = pair[1];
    return w.replace(/\.php$/i, "");
  });
  // re-check the cleaned tokens: stripping "w/" must not resurrect a filler
  if (cleaned.some(t => STOP_WORDS.has(t))) return null;
  if (cleaned.every(t => COLUMN_NAMES.has(t))) return null;
  if (!cleaned.every(t => SLUG_RE.test(t) && !/^\d+$/.test(t))) return null;
  return cleaned;
}

/** Extract a plugin slug from one line of pasted input, or null. */
export function slugFromLine(line) {
  if (typeof line !== "string") return null;
  let s = line.trim();
  if (!s || s.startsWith("#") || s.startsWith("//")) return null;

  // WP-CLI table borders, separators (+----+----+), and Markdown
  // alignment rows (|:--|--:|)
  if (/^[+|:\-\s]+$/.test(s)) return null;

  // email-quote prefixes and checklist markers
  s = stripLineDecorations(s);

  // WP-CLI YAML list item: "- name: akismet" (also bare "slug: x" / "plugin: x")
  const yaml = /^-?\s*(?:name|slug|plugin):\s*(.+)$/.exec(s);
  if (yaml) s = yaml[1].trim().replace(/^["']|["']$/g, "");

  // Composer / wpackagist: wpackagist-plugin/akismet (with or without the
  // surrounding quotes and version constraint of a composer.json require line)
  const composer = /["']?wpackagist-(?:mu)?plugin\/([A-Za-z0-9_.-]+)/i.exec(s);
  if (composer) s = composer[1];

  // A JSON member carrying plugin identity, e.g. a line of truncated or
  // malformed wp-cli/REST JSON: {"name":"akismet", ... A "name" holding a
  // vendor/project pair is composer.json's project name, not a plugin.
  const jsonMember = !composer && /"(name|slug|plugin)"\s*:\s*"([^"]+)"/.exec(s);
  if (jsonMember && !(jsonMember[1] === "name" && jsonMember[2].includes("/"))) {
    s = jsonMember[2];
  }

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
      // wordpress.org/plugins/search/... and /plugins/tags/... are directory
      // navigation, not plugin pages
      if (s === "search" || s === "tags" || s === "browse") return null;
    } catch { return null; }
  } else if (!composer) {
    s = s.replace(/\\/g, "/");
    const pluginPath = /(?:^|\/)(?:wp-content\/)?plugins\/([^/]+)/i.exec(s);
    if (pluginPath) s = pluginPath[1];
    // first-segment reads only apply to a single path; on a multi-entry
    // line (an ls -F grid) it would swallow every entry after the first "/"
    else if (!/\s/.test(s) && s.includes("/")) s = s.split("/").filter(Boolean)[0] || "";
  }

  // Multi-token leftovers: keep the first cell of tabular tool output (second
  // token is a WP-CLI status or a version number), or the first entry of an
  // all-slug list line. Anything else is a display name or prose; guessing a
  // slug from its first word asserts a verdict about the wrong plugin.
  const tokens = s.split(/[\s|]+/).filter(Boolean);
  if (tokens.length > 1) {
    const first = tokens[0].toLowerCase();
    const second = tokens[1].toLowerCase();
    const tabular = WPCLI_STATUSES.has(second) || VERSION_TOKEN_RE.test(second);
    // "Version 5.7.2 | By Automattic" (a wp-admin Plugins-page line) is
    // tabular-shaped, but its first cell is a label, not a plugin
    if (tabular && (COLUMN_NAMES.has(first) || UI_FRAMING_WORDS.has(first))) return null;
    if (!tabular && !slugListTokens(s)) return null;
  }
  s = tokens[0] || "";

  // strip an ls -F trailing slash and a trailing .php just in case
  s = s.replace(/\/+$/, "").replace(/\.php$/i, "");

  // valid plugin slugs are lowercase letters, numbers, hyphens, underscores
  s = s.toLowerCase();
  if (FILE_ALIASES.has(s)) {
    const mapped = FILE_ALIASES.get(s);
    if (mapped === null) return null;
    s = mapped;
  }
  if (!SLUG_RE.test(s)) return null;
  // a bare number is a count or version, never a plugin
  if (/^\d+$/.test(s)) return null;
  // skip the WP-CLI header row's column name and lone listing furniture
  if (HEADER_NAMES.has(s)) return null;
  if (UI_FRAMING_WORDS.has(s)) return null;
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
      // slug and plugin (the REST API's "dir/file" key) are authoritative;
      // name is last because the REST API puts the DISPLAY name there
      if (item && typeof item === "object") return item.slug ?? item.plugin ?? item.file ?? item.textdomain ?? item.name ?? "";
      return "";
    });
  } catch { return null; }
}

// A JSON member line ("key": value) from a pasted composer.json or similar.
// These must never be split as CSV: csvFields strips the quotes and the
// key's first path segment ("composer/installers" -> "composer") would leak
// out as a phantom plugin with a false GONE verdict.
function isJsonMemberLine(line) {
  return /^\s*"[^"]+"\s*:/.test(line);
}

// Looser variant for the CSV guard: a "key": fragment ANYWHERE marks the
// line as JSON no matter what precedes it (a truncated paste can open with
// [{ on the same line), and slugFromLine knows how to read such lines whole.
function hasJsonMember(line) {
  return /"[^"]*"\s*:/.test(line);
}

// Lines that are input framing rather than user content: comments, WP-CLI
// table borders and header rows, YAML document markers, YAML keys that carry
// plugin metadata rather than identity, and the braces and non-plugin members
// of a pasted composer.json. These never count as "skipped" feedback.
function isStructuralLine(line) {
  // decorations first, so a quoted border ("> +---+") reads as the border
  const s = stripLineDecorations(line.trim()).trim();
  if (!s || s.startsWith("#") || s.startsWith("//")) return true;
  if (/^[+|:\-\s]+$/.test(s)) return true;
  if (/^-?\s*[a-z_]+:(\s|$)/.test(s) && !/^-?\s*(?:name|slug|plugin):/.test(s)) return true;
  if (s.startsWith("|")) {
    const first = (s.split("|").map(c => c.trim()).find(c => c) || "").toLowerCase();
    if (HEADER_NAMES.has(first)) return true;
  }
  // header rows without borders: a lone column word ("name" above a single
  // CSV column) or a line made only of column names ("name status update
  // version" from a borderless or tab-separated table)
  const words = s.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (words.length === 1 && HEADER_NAMES.has(words[0])) return true;
  if (words.length >= 2 && words.every(w => COLUMN_NAMES.has(w))) return true;
  // wp-admin Plugins-page furniture: lone action/status words ("Deactivate",
  // "Active"), "Version 5.7.2 ..." meta lines, and the "By Author" /
  // "View details" / "Visit plugin site" phrases
  if (words.length === 1 && UI_FRAMING_WORDS.has(words[0])) return true;
  // a lone version number is a fragment of a wrapped table row
  if (words.length === 1 && VERSION_TOKEN_RE.test(words[0])) return true;
  // Site Health debug-copy trailers on every plugin entry
  if (/^auto-updates (enabled|disabled)$/i.test(s)) return true;
  if (words.length >= 2 && COLUMN_NAMES.has(words[0]) && VERSION_TOKEN_RE.test(words[1])) return true;
  if (/^(?:by|view|visit)\s+\S/i.test(s)) return true;
  // Markdown code fences around a pasted debug report
  if (/^`+$/.test(s)) return true;
  if (/^[{}[\]],?$/.test(s)) return true;
  if (isJsonMemberLine(s) && !/wpackagist-(?:mu)?plugin\//i.test(s)) return true;
  return false;
}

/** Parse a pasted blob into { slugs, skipped }: a unique, ordered list of
 *  slugs plus the non-structural lines that yielded no plugin, so the UI can
 *  say what was not understood instead of silently ignoring it. */
export function parseSlugsDetailed(input) {
  if (typeof input !== "string") throw new TypeError("plugin list must be a string");
  if (input.length > MAX_INPUT_LENGTH) throw new RangeError("plugin list exceeds 1 MiB");
  const seen = new Set();
  const out = [];
  const skipped = [];
  const json = jsonSlugs(input);
  // \r alone is a line ending too: Excel's "CSV (Macintosh)" export still
  // produces bare CR, and a CR-joined CSV read as one line leaks its status
  // fields out as phantom slugs
  const lines = json ?? input.split(/\r\n?|\n/);
  let csvSlugColumn = null;
  let csvFieldCount = 0;
  let csvAssoc = false;
  let pipeSlugColumn = null;
  let pipeCellCount = 0;
  let pipeAssoc = false;
  // a slug candidate that stands alone in a cell: not row furniture, not a
  // bare number, not a column label
  const soloSlug = (cell) => {
    const w = cell.toLowerCase().replace(/\.php$/i, "");
    return SLUG_RE.test(w) && !/^\d+$/.test(w) &&
      !UI_FRAMING_WORDS.has(w) && !COLUMN_NAMES.has(w) && !VERSION_TOKEN_RE.test(cell);
  };
  for (const line of lines) {
    const raw = String(line);
    // a blank line ends a table block; what follows is a fresh paste section
    if (!json && !raw.trim()) {
      csvSlugColumn = null; csvFieldCount = 0; csvAssoc = false;
      pipeSlugColumn = null; pipeCellCount = 0; pipeAssoc = false;
      continue;
    }
    let items = [raw];
    let expanded = false; // items are fragments of the line, reported per item
    // CSV wins over the pipe split when a header is being tracked or the
    // line carries quoted fields: an audit sheet's quoted display name may
    // itself contain a pipe ("Yoast | SEO",wordpress-seo,active)
    // a non-identity "key: a, b, c" line is a metadata list (Site Health's
    // theme_features/gd_formats lines), never CSV to split into slugs
    const metaKeyList = /^-?\s*[a-z_]+:(\s|$)/.test(raw.trim()) &&
      !/^-?\s*(?:name|slug|plugin):/.test(raw.trim());
    const csvish = raw.includes(",") && !hasJsonMember(raw) && !metaKeyList &&
      (!raw.includes("|") || csvSlugColumn !== null || raw.includes('"'));
    if (!json && !csvish && raw.includes("|") && !hasJsonMember(raw) && !/^[+|:\-\s]+$/.test(raw.trim())) {
      // pipe-table row (wp-cli table, Markdown): track the header's plugin
      // column so status-first layouts (--fields=status,name) read the right
      // cell; without a header, take the one cell that looks like a slug
      const cells = raw.split("|").map(c => c.trim()).filter(Boolean);
      const lower = cells.map(c => c.toLowerCase());
      const fieldValuePair = lower.length === 2 && lower[0] === "field" && lower[1] === "value";
      // inside an assoc block, rows outrank header detection: the identity
      // row of `wp plugin get update` is "| name | update |", which is made
      // of column words but is DATA. An unknown key ends the block; only a
      // literal Field/Value pair re-opens one.
      if (pipeAssoc && cells.length === 2 && !fieldValuePair &&
          !["name", "slug", "plugin"].includes(lower[0]) && !ASSOC_META_KEYS.has(lower[0])) {
        pipeAssoc = false;
      }
      if (pipeAssoc && cells.length === 2 && !fieldValuePair) {
        // assoc row: the name/slug/plugin keys carry the identity, the
        // author/version/description/status keys are metadata (no items,
        // no skip note)
        items = ["name", "slug", "plugin"].includes(lower[0]) ? [cells[1]] : [];
        expanded = true;
      } else {
      // a tracked table only re-detects a header when the tracked column
      // cell is itself an identity key ("update,Update" under a name,title
      // header is a data row about the real plugin "update")
      const rowIsHeader = isHeaderCells(lower) &&
        (pipeSlugColumn === null || cells.length !== pipeCellCount ||
          ["slug", "plugin", "name", "title"].includes(lower[pipeSlugColumn] ?? ""));
      if (rowIsHeader) {
        // a Field/Value header opens an assoc table (wp plugin get): the
        // plugin identity lives in its "name" ROW, not in a column
        pipeAssoc = fieldValuePair;
        const idx = pipeAssoc ? -1 : slugColumnIndex(lower);
        pipeSlugColumn = idx !== -1 ? idx : null;
        pipeCellCount = cells.length;
        continue;
      }
      expanded = true;
      items = null;
      if (pipeSlugColumn !== null && cells.length === pipeCellCount) {
        const tracked = cells[pipeSlugColumn] ?? "";
        if (soloSlug(tracked)) items = [tracked];
        // a display name under the tracked column still deserves its report
        else if (!isStructuralLine(tracked)) items = [tracked];
        // a framing cell under the tracked column means this row belongs to
        // a differently shaped table; fall through to the shape-based read
      }
      if (items === null) {
        const solos = cells.filter(soloSlug);
        if (solos.length === 1) {
          // trust the lone slug-shaped cell only when its siblings are table
          // furniture. "OMGF | GDPR Compliant..." is a piped DISPLAY NAME
          // whose first word is not its slug; resolving it would put a
          // phantom verdict on a healthy plugin.
          const others = cells.filter(c => c !== solos[0]);
          if (others.every(c => isStructuralLine(c))) items = [solos[0]];
          else { items = []; skipped.push(raw.trim()); }
        } else if (solos.length > 1) {
          // two slug-shaped cells with no header is ambiguous: which is the
          // plugin? Guessing risks a phantom, dropping risks silence, so
          // every candidate goes to the skip report for the user to decide
          items = [];
          for (const c of solos) skipped.push(c);
        } else {
          // no slug-shaped cell: surface the content cells (a display-name
          // row deserves a skip report), drop the furniture ones silently
          items = cells.filter(c => !isStructuralLine(c));
        }
      }
      }
    } else if (!json && csvish) {
      const fields = csvFields(raw);
      if (fields) {
        const lower = fields.map(f => f.replace(/^"|"$/g, "").trim().toLowerCase());
        const fieldValuePair = lower.length === 2 && lower[0] === "field" && lower[1] === "value";
        // inside an assoc block, rows outrank header detection ("name,update"
        // is the identity row of `wp plugin get update`, not a header); an
        // unknown key ends the block, only Field/Value re-opens one
        if (csvAssoc && fields.length === 2 && !fieldValuePair &&
            !["name", "slug", "plugin"].includes(lower[0]) && !ASSOC_META_KEYS.has(lower[0])) {
          csvAssoc = false;
        }
        // a header row is made of column labels ("Plugin Name" counts,
        // "Site Name" is someone's data); a tracked table only re-detects a
        // header when its slug-column cell is an identity key ("update,Update"
        // under a name,title header is data about the real plugin "update")
        const rowIsHeader = !(csvAssoc && fields.length === 2 && !fieldValuePair) && isHeaderCells(lower) &&
          (csvSlugColumn === null || fields.length !== csvFieldCount ||
            ["slug", "plugin", "name", "title"].includes(lower[csvSlugColumn] ?? ""));
        if (rowIsHeader) {
          csvAssoc = fieldValuePair;
          const idx = csvAssoc ? -1 : slugColumnIndex(lower);
          csvSlugColumn = idx !== -1 ? idx : null;
          csvFieldCount = fields.length;
          continue;
        }
        if (csvAssoc && fields.length === 2) {
          // assoc row (wp plugin get --format=csv): identity keys only
          items = ["name", "slug", "plugin"].includes(lower[0]) ? [fields[1]] : [];
          expanded = true;
        }
        // only rows that match the header's shape are its data rows; a line
        // with a different field count is a fresh list, not a table row
        else if (csvSlugColumn !== null && fields.length === csvFieldCount) {
          items = [fields[csvSlugColumn] ?? ""];
        } else if (WPCLI_STATUSES.has(lower[1])) {
          items = [fields[0]];
        } else {
          // headerless list: statuses, update values, versions, and bare
          // numbers riding along in other columns are furniture, not slugs
          items = fields.filter(f => {
            const w = f.replace(/^"|"$/g, "").trim().toLowerCase();
            return w && !UI_FRAMING_WORDS.has(w) && !VERSION_TOKEN_RE.test(w) && !/^\d+$/.test(w);
          });
          expanded = true;
        }
      }
    } else if (!json) {
      // a line of space-separated slugs (ls output, one-line lists),
      // possibly behind a checklist marker or quote prefix
      const listed = slugListTokens(stripLineDecorations(raw.trim()));
      if (listed) { items = listed; expanded = true; }
    }
    let found = 0;
    for (const item of items) {
      const text = String(item);
      const slug = slugFromLine(text);
      if (slug) {
        found++;
        if (!seen.has(slug)) { seen.add(slug); out.push(slug); }
      } else if (expanded && text.trim() && !isStructuralLine(text)) {
        // a failed fragment of an expanded line is reported on its own; a
        // parsing sibling must not hide it ("contact-form-7, yoast seo"
        // still says what happened to "yoast seo")
        skipped.push(text.trim());
      }
      if (out.length >= MAX_PARSED_SLUGS) return { slugs: out, skipped };
    }
    if (!expanded && !found && !isStructuralLine(raw)) skipped.push(raw.trim());
  }
  return { slugs: out, skipped };
}

/** Parse a whole pasted blob into a unique, ordered list of slugs. */
export function parseSlugs(input) {
  return parseSlugsDetailed(input).slugs;
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

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", middot: "·",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  bull: "•", copy: "©", reg: "®", trade: "™", deg: "°"
};

/** Decode the HTML entities the plugin API bakes into names ("Name &#8211;
 *  Tagline"), so the UI's own escaping does not display them as literals.
 *  Unknown entities pass through unchanged. */
export function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+[0-9]*);/gi, (match, ent) => {
    if (ent[0] === "#") {
      const hex = ent[1] === "x" || ent[1] === "X";
      const code = parseInt(ent.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[ent.toLowerCase()] ?? match;
  });
}

/** Normalize a WordPress.org plugin-information API response. */
export function pluginInfoFromApi(data, { ok = true, status = 200 } = {}) {
  // A closed plugin answers 404 with {"error":"closed", "closed":true,
  // "closed_date":..., "reason_text":...}. This is the directory's strongest
  // signal, not an API failure, and must never be reported as one.
  if (data?.error === "closed" || data?.closed === true) {
    return {
      exists: false,
      closed: true,
      name: typeof data.name === "string" ? decodeEntities(data.name) : undefined,
      closedDate: typeof data.closed_date === "string" ? data.closed_date : undefined,
      reason: typeof data.reason_text === "string" ? data.reason_text : undefined
    };
  }
  if (status === 404 && data?.error === "Plugin not found.") return { exists: false };
  if (!ok || !data || typeof data !== "object" || data.error || typeof data.slug !== "string") {
    return { error: "api" };
  }
  return {
    exists: true,
    name: typeof data.name === "string" ? decodeEntities(data.name) : undefined,
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
  if (info?.closed) {
    const when = info.closedDate ? ` on ${info.closedDate}` : "";
    const why = info.reason ? ` WordPress.org gives the reason as: ${info.reason}.` : "";
    return {
      slug, level: "removed", label: "Closed by WordPress.org", name: info.name, closed: true,
      detail: `This plugin was closed${when} and can no longer be downloaded from the directory.${why} Installed copies keep running but receive no updates or review, so plan a replacement.`
    };
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
  // When the CURRENT WordPress version is unknown (stable-check unreachable),
  // that is a page-wide condition the UI reports once; flagging it per plugin
  // would downgrade every healthy plugin on the list to "Worth a look".
  else if (currentVersion == null) { /* comparison unavailable; not the plugin's fault */ }
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
