import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugFromLine, slugListTokens, parseSlugs, parseSlugsDetailed, parseUpdated,
  parseWpVersion, testedVersionsBehind, monthsBetween, apiUrl, directoryUrl,
  pluginInfoFromApi, verdict, sortVerdicts, decodeEntities,
  MAX_PARSED_SLUGS
} from "../docs/checkup.js";

const NOW = Date.UTC(2026, 6, 7); // 2026-07-07
const CTX = { now: NOW, currentVersion: "7.0" };

test("slugFromLine handles the common formats", () => {
  assert.equal(slugFromLine("classic-editor"), "classic-editor");
  assert.equal(slugFromLine("classic-editor/classic-editor.php"), "classic-editor");
  assert.equal(slugFromLine("https://wordpress.org/plugins/akismet/"), "akismet");
  assert.equal(slugFromLine("  woocommerce  "), "woocommerce");
  assert.equal(slugFromLine("# a comment"), null);
  assert.equal(slugFromLine(""), null);
  assert.equal(slugFromLine("https://example.com/not-a-plugin"), null);
});

test("parseSlugs reads a pasted WP-CLI table", () => {
  const table = `+----------------+--------+-----------+---------+
| name           | status | update    | version |
+----------------+--------+-----------+---------+
| akismet        | active | none      | 5.7     |
| classic-editor | active | available | 1.7.0   |
+----------------+--------+-----------+---------+`;
  assert.deepEqual(parseSlugs(table), ["akismet", "classic-editor"]);
});

test("parseSlugs dedupes and preserves order", () => {
  const input = `classic-editor
akismet
classic-editor/classic-editor.php
# comment
https://wordpress.org/plugins/jetpack/`;
  assert.deepEqual(parseSlugs(input), ["classic-editor", "akismet", "jetpack"]);
});

test("parseUpdated reads the API date format", () => {
  const ts = parseUpdated("2026-05-28 1:51am GMT");
  assert.equal(ts, Date.UTC(2026, 4, 28));
  assert.equal(parseUpdated(""), null);
});

test("apiUrl requests the plugin without heavy fields", () => {
  const u = apiUrl("classic-editor");
  assert.match(u, /action=plugin_information/);
  assert.match(u, /request%5Bslug%5D=classic-editor/);
  assert.match(u, /request%5Bfields%5D%5Bsections%5D=0/);
  assert.match(u, /request%5Bfields%5D%5Bdescription%5D=0/);
  assert.throws(() => apiUrl("not a slug"), /invalid WordPress/);
  assert.throws(() => directoryUrl("../bad"), /invalid WordPress/);
});

test("verdict: removed when the plugin does not exist", () => {
  const v = verdict("made-up-plugin", { exists: false }, CTX);
  assert.equal(v.level, "removed");
});

test("verdict: network error is surfaced, not treated as removed", () => {
  const v = verdict("x", { error: "network" }, CTX);
  assert.equal(v.level, "error");
});

test("verdict: abandoned when no update in 24+ months", () => {
  const v = verdict("old-plugin", {
    exists: true, name: "Old Plugin", last_updated: "2023-01-01 12:00am GMT", tested: "6.1", active_installs: 5000
  }, CTX);
  assert.equal(v.level, "abandoned");
});

test("verdict: outdated when tested two majors behind", () => {
  const v = verdict("laggy", {
    exists: true, name: "Laggy", last_updated: "2026-05-01 12:00am GMT", tested: "5.0", active_installs: 200000
  }, CTX);
  assert.equal(v.level, "outdated");
  assert.match(v.detail, /tested up to WordPress 5\.0/);
});

test("verdict: outdated when stale but not abandoned", () => {
  const v = verdict("stale", {
    exists: true, name: "Stale", last_updated: "2025-05-01 12:00am GMT", tested: "6.8", active_installs: 300000
  }, CTX);
  assert.equal(v.level, "outdated");
});

test("verdict: low installs are metadata, not a maintenance warning", () => {
  const v = verdict("tiny", {
    exists: true, name: "Tiny", last_updated: "2026-06-01 12:00am GMT", tested: "7.0", active_installs: 40
  }, CTX);
  assert.equal(v.level, "ok");
  assert.match(v.meta, /40\+ installs/);
});

test("verdict: healthy when fresh and current", () => {
  const v = verdict("good", {
    exists: true, name: "Good Plugin", version: "3.2.1",
    last_updated: "2026-06-20 12:00am GMT", tested: "7.0", active_installs: 900000, rating: 96, num_ratings: 500
  }, CTX);
  assert.equal(v.level, "ok");
  assert.match(v.meta, /tested to WP 7\.0/);
  assert.match(v.meta, /900,000\+ installs/);
});

test("sortVerdicts puts the urgent ones first", () => {
  const list = [
    { level: "ok" }, { level: "removed" }, { level: "outdated" }, { level: "abandoned" }
  ];
  assert.deepEqual(sortVerdicts(list).map(v => v.level),
    ["removed", "abandoned", "outdated", "ok"]);
});

test("monthsBetween is sane", () => {
  const m = monthsBetween(Date.UTC(2026, 0, 7), NOW);
  assert.ok(m > 5.5 && m < 6.5, `about 6 months, got ${m}`);
});

test("verdict: tested-version lag is caught WITHIN a major (the 6.x bug)", () => {
  // Plugin tested only to WP 6.0 while current is 6.7: seven x.y releases behind.
  // The old leading-integer compare treated both as major "6" and missed this.
  const v = verdict("laggy6", {
    exists: true, name: "Laggy6", last_updated: "2026-06-01 12:00am GMT",
    tested: "6.0", active_installs: 200000
  }, { now: NOW, currentVersion: "6.7" });
  assert.equal(v.level, "outdated");
  assert.match(v.detail, /tested up to WordPress 6\.0/);
});

test("verdict: one x.y release behind is still healthy", () => {
  const v = verdict("recent", {
    exists: true, name: "Recent", last_updated: "2026-06-20 12:00am GMT",
    tested: "6.6", active_installs: 900000
  }, { now: NOW, currentVersion: "6.7" });
  assert.equal(v.level, "ok");
});

test("verdict: legacy currentMajor context still catches old tested versions", () => {
  const v = verdict("legacy-docs", {
    exists: true, name: "Legacy Docs", last_updated: "2026-06-20 12:00am GMT",
    tested: "6.0", active_installs: 900000
  }, { now: NOW, currentMajor: 7 });
  assert.equal(v.level, "outdated");
});

test("parseSlugs reads a comma-and-space separated list", () => {
  assert.deepEqual(parseSlugs("akismet, jetpack, woocommerce"),
    ["akismet", "jetpack", "woocommerce"]);
});

test("parseSlugs does not split tight CSV columns into fake slugs", () => {
  // wp plugin list --format=csv row: only the first cell is a plugin slug.
  assert.deepEqual(parseSlugs("akismet,active,none,5.7"), ["akismet"]);
});

test("parseSlugs reads tight lists, quoted CSV, and WP-CLI JSON", () => {
  assert.deepEqual(parseSlugs("akismet,jetpack,woocommerce"), ["akismet", "jetpack", "woocommerce"]);
  assert.deepEqual(parseSlugs('"akismet","active","none","5.7"'), ["akismet"]);
  assert.deepEqual(parseSlugs('[{"name":"akismet","status":"active"},{"name":"jetpack"}]'), ["akismet", "jetpack"]);
  assert.deepEqual(parseSlugs('["akismet","classic-editor"]'), ["akismet", "classic-editor"]);
});

test("slug parsing handles installed paths and validates WordPress.org URLs", () => {
  assert.equal(slugFromLine("wp-content/plugins/woocommerce/woocommerce.php"), "woocommerce");
  assert.equal(slugFromLine("C:\\sites\\wp-content\\plugins\\classic-editor\\classic-editor.php"), "classic-editor");
  assert.equal(slugFromLine("https://en-gb.wordpress.org/plugins/akismet/"), "akismet");
  assert.equal(slugFromLine("https://evilwordpress.org/plugins/akismet/"), null);
  assert.equal(slugFromLine("https://example.com/?next=wordpress.org/plugins/akismet"), null);
  assert.equal(slugFromLine("bad--slug"), null);
  assert.equal(slugFromLine("bad-slug-"), null);
});

test("parseSlugs rejects non-string and oversized input", () => {
  assert.throws(() => parseSlugs(null), /must be a string/);
  assert.throws(() => parseSlugs("x".repeat(1024 * 1024 + 1)), /exceeds 1 MiB/);
});

test("parseUpdated rejects normalized calendar overflow", () => {
  assert.equal(parseUpdated("2026-02-29 1:00am GMT"), null);
  assert.equal(parseUpdated("2024-02-29 1:00am GMT"), Date.UTC(2024, 1, 29));
  assert.equal(parseUpdated("2026-13-01"), null);
});

test("WordPress versions are parsed completely, not from junk prefixes", () => {
  assert.deepEqual(parseWpVersion("7.0.1"), { major: 7, minor: 0 });
  assert.deepEqual(parseWpVersion("6.9-RC1"), { major: 6, minor: 9 });
  assert.equal(parseWpVersion("6.7 nonsense"), null);
  assert.equal(testedVersionsBehind("6.9", "7.0.1"), 1);
  assert.equal(testedVersionsBehind("6.8", "7.0.1"), 2);
});

test("plugin API responses distinguish not-found from service errors", () => {
  assert.deepEqual(pluginInfoFromApi({ error: "Plugin not found." }, { ok: false, status: 404 }), { exists: false });
  assert.deepEqual(pluginInfoFromApi({ error: "Rate limit" }, { ok: false, status: 429 }), { error: "api" });
  assert.deepEqual(pluginInfoFromApi({ error: "Temporary failure" }, { ok: true, status: 200 }), { error: "api" });
  assert.deepEqual(pluginInfoFromApi(null, { ok: true, status: 200 }), { error: "api" });
  const info = pluginInfoFromApi({
    slug: "akismet", name: "Akismet", version: "5.7", last_updated: "2026-04-23 10:34pm GMT",
    tested: "7.0.1", active_installs: 6000000, rating: 94, num_ratings: 1184
  });
  assert.equal(info.exists, true);
  assert.equal(info.active_installs, 6000000);
});

test("healthy requires update and compatibility evidence", () => {
  const base = { exists: true, name: "Incomplete", active_installs: 5000 };
  const noDate = verdict("incomplete", { ...base, tested: "7.0" }, CTX);
  assert.equal(noDate.level, "outdated");
  assert.match(noDate.detail, /date unavailable/i);
  const noTested = verdict("incomplete", { ...base, last_updated: "2026-06-01 12:00am GMT" }, CTX);
  assert.equal(noTested.level, "outdated");
  assert.match(noTested.detail, /tested-up-to version unavailable/i);
  // An unknown CURRENT WordPress version is a page-wide condition (the UI
  // reports it once); it must not downgrade every healthy plugin on the list.
  const noCurrent = verdict("incomplete", { ...base, last_updated: "2026-06-01 12:00am GMT", tested: "7.0" }, { now: NOW });
  assert.equal(noCurrent.level, "ok");
});

test("unknown API errors never become directory-removal verdicts", () => {
  assert.equal(verdict("x", { error: "api" }, CTX).level, "error");
  assert.match(verdict("x", { exists: false }, CTX).detail, /custom or commercial/i);
});


/* ------------------- regressions from the deep quality pass ------------------- */

test("closed plugins get a removal verdict with the closure date and reason", () => {
  // the real API shape for a closed listing: HTTP 404 with error:"closed"
  const closed = pluginInfoFromApi({
    error: "closed", name: "Display Widgets", slug: "display-widgets",
    closed: true, closed_date: "2021-01-30", reason: "security-issue", reason_text: "Security Issue"
  }, { ok: false, status: 404 });
  assert.equal(closed.exists, false);
  assert.equal(closed.closed, true);
  const v = verdict("display-widgets", closed, CTX);
  assert.equal(v.level, "removed");
  assert.equal(v.closed, true);
  assert.match(v.detail, /2021-01-30/);
  assert.match(v.detail, /Security Issue/);
  // never the "try again in a moment" error path: retrying cannot help
  assert.doesNotMatch(v.detail, /try again/i);
});

test("display names are skipped, never guessed from their first word", () => {
  assert.equal(slugFromLine("Contact Form 7"), null);
  assert.equal(slugFromLine("Yoast SEO"), null);
  assert.equal(slugFromLine("All in One SEO"), null);
  assert.deepEqual(parseSlugs("Contact Form 7\nYoast SEO"), []);
  // lowercase prose with a bare number is a display name, not a slug list
  assert.deepEqual(parseSlugs("contact form 7"), []);
  // tabular tool output still reads its first cell
  assert.equal(slugFromLine("akismet active none 5.7"), "akismet");
  assert.equal(slugFromLine("akismet 5.7 active"), "akismet");
});

test("space-separated slug lists (ls output, one-liners) keep every entry", () => {
  assert.deepEqual(slugListTokens("akismet hello-dolly woocommerce"), ["akismet", "hello-dolly", "woocommerce"]);
  assert.equal(slugListTokens("Contact Form 7"), null);
  assert.deepEqual(
    parseSlugs("akismet contact-form-7 woocommerce\njetpack wp-mail-smtp"),
    ["akismet", "contact-form-7", "woocommerce", "jetpack", "wp-mail-smtp"]
  );
  // plugins-root stub files: hello.php is Hello Dolly, index.php is not a plugin
  assert.deepEqual(parseSlugs("akismet hello.php index.php woocommerce"), ["akismet", "hello-dolly", "woocommerce"]);
  // a marker character (hyphen, underscore, digit, dot) must appear somewhere:
  // "yoast seo" is a typed display name whose words are BOTH real directory
  // slugs ("seo" is even a closed one), so guessing would put phantom closure
  // verdicts on top of the report. Skipped with feedback instead.
  const prose = parseSlugsDetailed("yoast seo");
  assert.deepEqual(prose.slugs, []);
  assert.deepEqual(prose.skipped, ["yoast seo"]);
});

test("table header rows never mint phantom slugs, bordered or not", () => {
  // "update" and "version" are REAL directory slugs (update is a closed
  // plugin), so a header read as a slug list would top the report with
  // phantom closure verdicts for plugins the user never pasted.
  const borderless = parseSlugsDetailed("name status update version\nakismet active none 5.7");
  assert.deepEqual(borderless.slugs, ["akismet"]);
  assert.deepEqual(borderless.skipped, []);
  const tsv = parseSlugsDetailed("name\tstatus\tupdate\tversion\nakismet\tactive\tnone\t5.7");
  assert.deepEqual(tsv.slugs, ["akismet"]);
  assert.deepEqual(tsv.skipped, []);
  // the lone header word above a single CSV column is framing too
  const single = parseSlugsDetailed("name\nakismet\ncontact-form-7");
  assert.deepEqual(single.slugs, ["akismet", "contact-form-7"]);
  assert.deepEqual(single.skipped, []);
});

test("a CSV block ends at a blank line or a shape change", () => {
  // the header's column choice must not swallow a later slug list
  assert.deepEqual(
    parseSlugs("name,status\njetpack,active\nwp-mail-smtp,inactive\n\nakismet, wordfence, classic-editor"),
    ["jetpack", "wp-mail-smtp", "akismet", "wordfence", "classic-editor"]
  );
  assert.deepEqual(
    parseSlugs("name,status\njetpack,active\nakismet, wordfence, classic-editor"),
    ["jetpack", "akismet", "wordfence", "classic-editor"]
  );
});

test("truncated or malformed JSON recovers identity keys and never fabricates", () => {
  // csvFields would strip the quotes and leak "BROKEN" as a phantom GONE slug
  assert.deepEqual(parseSlugs(String.raw`[{"name":"akismet", BROKEN`), ["akismet"]);
  assert.equal(slugFromLine(`{"plugin":"contact-form-7/wp-contact-form-7","status":"active"},`), "contact-form-7");
  // composer.json's project "name" is vendor/project, not a plugin
  assert.deepEqual(parseSlugs(`"name": "roots/bedrock",`), []);
  const garbage = parseSlugsDetailed("[{BROKEN garbage");
  assert.deepEqual(garbage.slugs, []);
  assert.deepEqual(garbage.skipped, ["[{BROKEN garbage"]);
});

test("underscore slugs are real directory slugs and parse everywhere", () => {
  assert.equal(slugFromLine("serve_static"), "serve_static");
  assert.deepEqual(parseSlugs("serve_static\nf12_configurator\nakismet"), ["serve_static", "f12_configurator", "akismet"]);
  assert.match(apiUrl("serve_static"), /serve_static/);
  assert.equal(directoryUrl("serve_static"), "https://wordpress.org/plugins/serve_static/");
});

test("composer and wpackagist lines resolve to the plugin, not the vendor", () => {
  assert.equal(slugFromLine("wpackagist-plugin/akismet"), "akismet");
  assert.equal(slugFromLine('"wpackagist-plugin/contact-form-7": "^5.9",'), "contact-form-7");
  assert.equal(slugFromLine("wpackagist-muplugin/mu-tool"), "mu-tool");
  assert.deepEqual(parseSlugs("wpackagist-plugin/akismet\nwpackagist-plugin/woocommerce"), ["akismet", "woocommerce"]);
});

test("JSON arrays prefer identity keys over display names", () => {
  // WP REST API /wp/v2/plugins: plugin carries "dir/file", name is the display name
  const rest = JSON.stringify([
    { plugin: "contact-form-7/wp-contact-form-7", name: "Contact Form 7", status: "active" },
    { plugin: "akismet/akismet", name: "Akismet Anti-spam", status: "active" }
  ]);
  assert.deepEqual(parseSlugs(rest), ["contact-form-7", "akismet"]);
  // wp-cli JSON still resolves through its name key, which is the slug there
  assert.deepEqual(parseSlugs('[{"name":"akismet","status":"active"}]'), ["akismet"]);
  // malformed JSON falls back to line parsing without fabricating slugs
  assert.deepEqual(parseSlugs('[{"name": broken'), []);
});

test("CSV columns other than the header-named plugin column never leak as slugs", () => {
  assert.deepEqual(parseSlugs("name,update\nakismet,none\ncontact-form-7,available"), ["akismet", "contact-form-7"]);
  assert.deepEqual(parseSlugs("status,name\nactive,akismet\ninactive,jetpack"), ["akismet", "jetpack"]);
  // a headerless comma one-liner still reads every field
  assert.deepEqual(parseSlugs("akismet, jetpack, wordfence"), ["akismet", "jetpack", "wordfence"]);
});

test("relative plugins/ paths and directory navigation URLs resolve honestly", () => {
  assert.equal(slugFromLine("plugins/query-monitor"), "query-monitor");
  assert.equal(slugFromLine("wp-content/plugins/akismet/akismet.php"), "akismet");
  assert.equal(slugFromLine("https://wordpress.org/plugins/search/backup/"), null);
  assert.equal(slugFromLine("https://wordpress.org/plugins/tags/security/"), null);
});

test("WP-CLI YAML output parses to its slugs", () => {
  const yaml = "---\n- name: akismet\n  status: active\n  version: \"5.7\"\n- name: classic-editor\n  status: inactive";
  assert.deepEqual(parseSlugs(yaml), ["akismet", "classic-editor"]);
});

test("parseSlugsDetailed reports the lines it could not read", () => {
  const detailed = parseSlugsDetailed("akismet\nContact Form 7\n# a comment\n\njetpack");
  assert.deepEqual(detailed.slugs, ["akismet", "jetpack"]);
  assert.deepEqual(detailed.skipped, ["Contact Form 7"]);
  // structural YAML lines are framing, not skipped content
  assert.deepEqual(parseSlugsDetailed("- name: akismet\n  status: active").skipped, []);
});

test("an unknown current WordPress version never downgrades a healthy plugin", () => {
  const healthy = { exists: true, name: "A", last_updated: "2026-06-01 12:00am GMT", tested: "7.0", active_installs: 5 };
  assert.equal(verdict("a", healthy, { now: NOW }).level, "ok");
});

test("verdict thresholds hold at their exact boundaries", () => {
  const mk = (updated, tested = "7.0") =>
    verdict("x", { exists: true, last_updated: updated, tested, active_installs: 1 }, CTX).level;
  // ABANDONED_MONTHS = 24: 2024-07-05 is ~24.1 months before NOW, 2024-07-20 is ~23.9
  assert.equal(mk("2024-07-05 1:00am GMT"), "abandoned");
  assert.equal(mk("2024-07-20 1:00am GMT"), "outdated");
  // STALE_MONTHS = 12: ~12.5 months is stale, ~11.5 is not
  assert.equal(mk("2025-06-22 1:00am GMT"), "outdated");
  assert.equal(mk("2025-07-22 1:00am GMT"), "ok");
  // behind >= 2 releases: tested 6.5 vs current 6.7 flags, 6.6 does not
  const behindLevel = (tested, currentVersion) =>
    verdict("x", { exists: true, last_updated: "2026-06-01 12:00am GMT", tested, active_installs: 1 }, { now: NOW, currentVersion }).level;
  assert.equal(behindLevel("6.5", "6.7"), "outdated");
  assert.equal(behindLevel("6.6", "6.7"), "ok");
  // the x.9 -> (x+1).0 rollover counts as one release
  assert.equal(testedVersionsBehind("5.9", "6.0"), 1);
  assert.equal(behindLevel("5.9", "6.1"), "outdated");
  // an unreadable tested value is flagged, not silently passed
  assert.equal(behindLevel("not-a-version", "7.0"), "outdated");
});

test("input caps are enforced", () => {
  const big = Array.from({ length: MAX_PARSED_SLUGS + 5 }, (_, i) => `plugin-${i}`).join("\n");
  assert.equal(parseSlugs(big).length, MAX_PARSED_SLUGS);
});

test("API names arrive entity-encoded and decode exactly once", () => {
  assert.equal(decodeEntities("A &#8211; B &amp; C"), "A – B & C");
  assert.equal(decodeEntities("&#x2013; &quot;q&quot;"), "– \"q\"");
  assert.equal(decodeEntities("keep &unknownent; as-is"), "keep &unknownent; as-is");
  const info = pluginInfoFromApi({ slug: "p", name: "Forms &#8211; Builder &amp; Editor" }, { ok: true, status: 200 });
  assert.equal(info.name, "Forms – Builder & Editor");
});

test("sortVerdicts places every level, including error, in urgency order", () => {
  const levels = ["ok", "error", "removed", "outdated", "abandoned"].map(level => ({ slug: level, level }));
  assert.deepEqual(sortVerdicts(levels).map(v => v.level), ["removed", "abandoned", "outdated", "error", "ok"]);
});

test("directoryUrl builds the public plugin page", () => {
  assert.equal(directoryUrl("akismet"), "https://wordpress.org/plugins/akismet/");
});


test("a wholesale composer.json paste yields its plugins and zero phantoms", () => {
  const composer = `{
  "require": {
    "php": ">=8.1",
    "composer/installers": "^2.2",
    "wpackagist-plugin/akismet": "^5.3",
    "wpackagist-plugin/contact-form-7": "^5.9",
    "roots/wordpress": "^6.5"
  }
}`;
  const detailed = parseSlugsDetailed(composer);
  assert.deepEqual(detailed.slugs, ["akismet", "contact-form-7"]);
  // braces and non-plugin members are composer framing, not skipped content
  assert.deepEqual(detailed.skipped, []);
  // the trap: csvFields would strip the quotes from a comma-bearing member
  // line and leak the key's first path segment as a phantom GONE plugin
  assert.deepEqual(parseSlugs('"composer/installers": "^2.2",'), []);
});

test("WP-CLI pipe header rows are framing, not skipped content", () => {
  const detailed = parseSlugsDetailed("+----+\n| name | status |\n| akismet | active |\nTotally Not A Plugin Name");
  assert.deepEqual(detailed.slugs, ["akismet"]);
  assert.deepEqual(detailed.skipped, ["Totally Not A Plugin Name"]);
});


/* --------- regressions from the third adversarial round (v1.3.3) --------- */

test("a wp-admin Plugins-page copy never yields phantom verdicts", () => {
  // the most common paste this tool will receive: name line, row-action
  // line, version/author line, per plugin. "version", "deactivate", and
  // "active" must never become verdict rows ("update" and "seo" are even
  // real CLOSED directory slugs, so phantoms would render as closures).
  const paste = [
    "Akismet Anti-spam: Spam Protection",
    "Deactivate | Settings",
    "Version 5.7.2 | By Automattic | View details",
    "Jetpack",
    "Deactivate",
    "Version 14.5 | By Automattic | View details"
  ].join("\n");
  const detailed = parseSlugsDetailed(paste);
  // "Jetpack" alone IS its own slug; the multi-word name is reported instead
  assert.deepEqual(detailed.slugs, ["jetpack"]);
  assert.deepEqual(detailed.skipped, ["Akismet Anti-spam: Spam Protection"]);
  // lone UI words are furniture in any listing copy
  assert.deepEqual(parseSlugsDetailed("Deactivate\nActive\nInactive\nSettings").slugs, []);
  assert.deepEqual(parseSlugsDetailed("Deactivate\nActive\nInactive\nSettings").skipped, []);
});

test("pipe tables track their header column, so the slug never has to be first", () => {
  const statusFirst = parseSlugsDetailed("| status | name |\n| active | akismet |\n| inactive | jetpack |");
  assert.deepEqual(statusFirst.slugs, ["akismet", "jetpack"]);
  assert.deepEqual(statusFirst.skipped, []);
  assert.deepEqual(parseSlugs("| update | name |\n| none | akismet |\n| available | jetpack |"), ["akismet", "jetpack"]);
  // headerless rows take the one slug-shaped cell, wherever it sits
  assert.deepEqual(parseSlugs("| active | akismet |"), ["akismet"]);
  // Markdown tables of display names resolve their single-word names
  assert.deepEqual(parseSlugs("| Status | Plugin |\n|---|---|\n| Active | Akismet |"), ["akismet"]);
  // a display-name cell with no slug sibling is reported, not dropped
  assert.deepEqual(parseSlugsDetailed("| Some Plugin Name | active |").skipped, ["Some Plugin Name"]);
});

test("bare numbers and CSV row furniture never become slugs", () => {
  // wp plugin list --format=count prints a bare integer
  const count = parseSlugsDetailed("12");
  assert.deepEqual(count.slugs, []);
  assert.deepEqual(count.skipped, ["12"]);
  // headerless CSV rows: versions, statuses, and update values ride along
  assert.deepEqual(parseSlugs("akismet,5.3.2,active"), ["akismet"]);
  assert.deepEqual(parseSlugs("akismet,none"), ["akismet"]);
  assert.deepEqual(parseSlugs("akismet,available,on"), ["akismet"]);
  // hand-made audit sheets use multi-word header phrases
  assert.deepEqual(parseSlugs("Plugin Name,Version\nakismet,5.3.2\nwordpress-seo,22.1"), ["akismet", "wordpress-seo"]);
});

test("failed fragments of a comma list are reported, not hidden by their siblings", () => {
  const mixed = parseSlugsDetailed("contact-form-7, yoast seo");
  assert.deepEqual(mixed.slugs, ["contact-form-7"]);
  assert.deepEqual(mixed.skipped, ["yoast seo"]);
  // conjunctions mark prose: no verdict row for "and"
  const prose = parseSlugsDetailed("akismet and contact-form-7");
  assert.deepEqual(prose.slugs, []);
  assert.deepEqual(prose.skipped, ["akismet and contact-form-7"]);
});

test("CR-only line endings (Excel CSV Macintosh) parse like any other", () => {
  assert.deepEqual(parseSlugs("name,status\rakismet,active\rjetpack,active"), ["akismet", "jetpack"]);
  assert.deepEqual(parseSlugs("akismet,active\rjetpack,active"), ["akismet", "jetpack"]);
});


test("checklists, numbered lists, and quoted forwards parse their slugs", () => {
  assert.deepEqual(parseSlugs("- akismet\n- contact-form-7"), ["akismet", "contact-form-7"]);
  assert.deepEqual(parseSlugs("* akismet\n* wp-mail-smtp"), ["akismet", "wp-mail-smtp"]);
  assert.deepEqual(parseSlugs("1. akismet\n2) contact-form-7"), ["akismet", "contact-form-7"]);
  assert.deepEqual(parseSlugs("> akismet\n> contact-form-7"), ["akismet", "contact-form-7"]);
  // the marker strip must not eat a YAML item or a version-led line
  assert.deepEqual(parseSlugs("- name: akismet\n  status: active"), ["akismet"]);
  assert.equal(slugFromLine("5.7 akismet"), null);
});

test("Markdown alignment rows are borders, and ambiguous pipe rows are reported", () => {
  const md = parseSlugsDetailed("| Plugin | Status |\n|:--|--:|\n| akismet | active |");
  assert.deepEqual(md.slugs, ["akismet"]);
  assert.deepEqual(md.skipped, []);
  // two slug-shaped cells with no header: guessing risks a phantom and
  // dropping risks silence, so both candidates go to the skip report
  const ambiguous = parseSlugsDetailed("| akismet | jetpack |");
  assert.deepEqual(ambiguous.slugs, []);
  assert.deepEqual(ambiguous.skipped, ["akismet", "jetpack"]);
});


/* --------- regressions from the fourth adversarial round (v1.3.4) --------- */

test("multi-column folder listings parse every entry (ls -F, ls -p, grep pairs)", () => {
  // the first-path-segment rule must never swallow a whole grid line
  const grid = parseSlugsDetailed("akismet/    contact-form-7/    hello.php");
  assert.deepEqual(grid.slugs, ["akismet", "contact-form-7", "hello-dolly"]);
  assert.deepEqual(grid.skipped, []);
  assert.deepEqual(parseSlugs("akismet/ jetpack/ wordfence/"), ["akismet", "jetpack", "wordfence"]);
  assert.deepEqual(parseSlugs("akismet/akismet.php contact-form-7/wp-contact-form-7.php"), ["akismet", "contact-form-7"]);
  // a checklist marker in front of a multi-slug line expands too
  assert.deepEqual(parseSlugs("- akismet contact-form-7"), ["akismet", "contact-form-7"]);
});

test("piped display names never resolve their first word (OMGF, iubenda)", () => {
  // 7 of the top 250 plugins carry " | " in their display name, and the
  // first word is NOT the slug (OMGF lives at host-webfonts-local), so
  // resolving it would render a false GONE row for a healthy plugin
  const omgf = parseSlugsDetailed("OMGF | GDPR/DSGVO Compliant, Faster Google Fonts. Easy.");
  assert.deepEqual(omgf.slugs, []);
  assert.deepEqual(omgf.skipped, ["OMGF | GDPR/DSGVO Compliant, Faster Google Fonts. Easy."]);
  // real table rows keep working: siblings there are furniture
  assert.deepEqual(parseSlugs("| akismet | active | none | 5.7 |"), ["akismet"]);
});

test("CSV header picking is by key priority, not field order", () => {
  // "Site Name" merely contains the word name; the exact Plugin column wins
  assert.deepEqual(
    parseSlugs("Site Name,Plugin,Status\nblog-one,akismet,active\nshop,woocommerce,active"),
    ["akismet", "woocommerce"]
  );
  assert.deepEqual(
    parseSlugs("Author Name,Plugin Slug,Status\nAutomattic,akismet,active\nWPForms,wpforms-lite,active"),
    ["akismet", "wpforms-lite"]
  );
});

test("quoted CSV fields may contain pipes; JSON lines are never pipe-split", () => {
  const sheet = parseSlugsDetailed('Plugin Name,Slug,Status\n"Yoast | SEO",wordpress-seo,active\nAkismet,akismet,active');
  assert.deepEqual(sheet.slugs, ["wordpress-seo", "akismet"]);
  assert.deepEqual(sheet.skipped, []);
  const json = parseSlugsDetailed('{"name":"akismet","description":"Anti-spam | protection by Automattic"}');
  assert.deepEqual(json.slugs, ["akismet"]);
  assert.deepEqual(json.skipped, []);
});

test("forwarded and wrapped table framing stays out of the skip note", () => {
  // email-quoted wp-cli table: borders and blank quote lines are framing
  const quoted = parseSlugsDetailed("> +---+---+\n> | name | status |\n> | akismet | active |\n> +---+---+\n>");
  assert.deepEqual(quoted.slugs, ["akismet"]);
  assert.deepEqual(quoted.skipped, []);
  // a soft-wrapped row leaves a lone version fragment behind
  const wrapped = parseSlugsDetailed("| name | status | update |\n| very-long-plugin-slug | active | none\n| 5.3.2 |");
  assert.deepEqual(wrapped.slugs, ["very-long-plugin-slug"]);
  assert.deepEqual(wrapped.skipped, []);
  // a stale pipe column falls back to reading the row by shape
  assert.deepEqual(
    parseSlugs("| name | status |\n| akismet | active |\n| inactive | jetpack |"),
    ["akismet", "jetpack"]
  );
});


/* ---------- regressions from the fifth adversarial round (v1.3.5) ---------- */

test("wp plugin get output recovers the plugin from its assoc table", () => {
  // the Field/Value table of `wp plugin get akismet`: identity lives in the
  // name ROW; author/version/description are metadata, never verdict rows
  const table = [
    "+-------------+------------------------+",
    "| Field       | Value                  |",
    "+-------------+------------------------+",
    "| name        | akismet                |",
    "| title       | Akismet Anti-spam: Spam Protection |",
    "| author      | Automattic             |",
    "| version     | 5.3.7                  |",
    "| description | The best anti-spam.    |",
    "| status      | active                 |",
    "+-------------+------------------------+"
  ].join("\n");
  const fromTable = parseSlugsDetailed(table);
  assert.deepEqual(fromTable.slugs, ["akismet"]);
  assert.deepEqual(fromTable.skipped, []);
  const csv = 'Field,Value\nname,akismet\ntitle,"Akismet Anti-spam"\nauthor,Automattic\nversion,5.3.7\nstatus,active';
  const fromCsv = parseSlugsDetailed(csv);
  assert.deepEqual(fromCsv.slugs, ["akismet"]);
  assert.deepEqual(fromCsv.skipped, []);
});

test("verify-checksums CSV reads its plugin_name column, not paths or labels", () => {
  const report = [
    "plugin_name,file,message",
    "akismet,akismet.php,Checksum does not match",
    "wordfence,lib/wordfenceClass.php,Checksum does not match",
    "wordfence,views/diff.php,File was added"
  ].join("\n");
  const parsed = parseSlugsDetailed(report);
  assert.deepEqual(parsed.slugs, ["akismet", "wordfence"]);
  assert.deepEqual(parsed.skipped, []);
});

test("data rows starting with a column word are data, not headers", () => {
  // "name,akismet" must not be consumed as a header (the old rule swallowed
  // the one plugin a wp plugin get csv was about)
  assert.deepEqual(parseSlugs("name,akismet"), ["akismet"]);
  // real headers still detect: all labels, or two labels among three cells
  assert.deepEqual(parseSlugs("Site Name,Plugin,Status\nblog-one,akismet,active"), ["akismet"]);
});

test("conjunction slash pairs never mint fillers as slugs", () => {
  // the grep-pair read requires a FILE on the right; "and/or" is a sentence
  const conj = parseSlugsDetailed("akismet and/or jetpack");
  assert.deepEqual(conj.slugs, []);
  assert.deepEqual(conj.skipped, ["akismet and/or jetpack"]);
  assert.deepEqual(parseSlugs("wordfence either/or sucuri-scanner"), []);
  assert.deepEqual(parseSlugs("akismet  n/a"), []);
  assert.deepEqual(parseSlugs("akismet w/ jetpack"), []);
  // real grep pairs keep parsing
  assert.deepEqual(parseSlugs("akismet/akismet.php contact-form-7/wp-contact-form-7.php"), ["akismet", "contact-form-7"]);
});


test("an assoc block ends at the first unknown key", () => {
  // rows pasted after a wp plugin get table belong to the user, not the table
  assert.deepEqual(
    parseSlugs("Field,Value\nname,akismet\nstatus,active\njetpack,active\nwordfence,inactive"),
    ["akismet", "jetpack", "wordfence"]
  );
  assert.deepEqual(
    parseSlugs("| Field | Value |\n| name | akismet |\n| jetpack | active |\n| wordfence | inactive |"),
    ["akismet", "jetpack", "wordfence"]
  );
});

test("a Site Health debug copy reports names without phantoms or trailer noise", () => {
  const copy = [
    "### wp-plugins-active (2) ###",
    "",
    "Akismet Anti-spam: Spam Protection: version 5.3.7, author: Automattic, Auto-updates enabled",
    "Jetpack: version 14.5, author: Automattic, Auto-updates disabled"
  ].join("\n");
  const parsed = parseSlugsDetailed(copy);
  assert.deepEqual(parsed.slugs, []);
  assert.deepEqual(parsed.skipped, ["Akismet Anti-spam: Spam Protection: version 5.3.7", "Jetpack: version 14.5"]);
});


/* ---------- regressions from the sixth adversarial round (v1.3.6) ---------- */

test("Site Health metadata comma lists never mint slugs", () => {
  // theme_features / gd_formats / imagemagick_file_formats lines appear in
  // every Site Health debug copy; "post-thumbnails" is even a real closed
  // directory plugin, so splitting these would lead the report with a
  // phantom closure verdict for a theme feature
  const media = parseSlugsDetailed("theme_features: core-block-patterns, block-templates, post-thumbnails, editor-styles, html5\n\ngd_formats: GIF, JPEG, PNG, WebP");
  assert.deepEqual(media.slugs, []);
  assert.deepEqual(media.skipped, []);
  // fenced full-copy flavor: names reported, everything else silent
  const copy = "`\n### wp-plugins-active (1) ###\n\nJetpack: version 14.5, author: Automattic, Auto-updates disabled\n\n### wp-media ###\n\ngd_formats: GIF, PNG\n`";
  const parsed = parseSlugsDetailed(copy);
  assert.deepEqual(parsed.slugs, []);
  assert.deepEqual(parsed.skipped, ["Jetpack: version 14.5"]);
});

test("wp plugin get parses plugins whose slug is itself a column word", () => {
  // "update" and "author" are real (closed) directory slugs; their assoc
  // identity rows ("name,update") are data, not headers
  const table = "| Field | Value |\n| name | update |\n| title | Update |\n| author | Someone |\n| version | 1.1 |\n| status | active |";
  const fromTable = parseSlugsDetailed(table);
  assert.deepEqual(fromTable.slugs, ["update"]);
  assert.deepEqual(fromTable.skipped, []);
  assert.deepEqual(parseSlugs("Field,Value\nname,author\ntitle,Author Tools\nstatus,active"), ["author"]);
  // a tracked table's data row made of column words is data too
  assert.deepEqual(parseSlugs("name,title\nakismet,Akismet\nupdate,Update\njetpack,Jetpack"), ["akismet", "update", "jetpack"]);
  // two consecutive assoc tables both parse
  assert.deepEqual(
    parseSlugs("| Field | Value |\n| name | akismet |\n| status | active |\n| Field | Value |\n| name | jetpack |\n| status | active |"),
    ["akismet", "jetpack"]
  );
});


test("wp option get active_plugins parses its var_export array", () => {
  const dump = "array (\n  0 => 'akismet/akismet.php',\n  1 => 'jetpack/jetpack.php',\n  2 => 'contact-form-7/wp-contact-form-7.php',\n)";
  const parsed = parseSlugsDetailed(dump);
  assert.deepEqual(parsed.slugs, ["akismet", "jetpack", "contact-form-7"]);
  assert.deepEqual(parsed.skipped, []);
});


/* --------- regressions from the seventh adversarial round (v1.3.7) --------- */

test("wp db query output against wp_options never mints column phantoms", () => {
  // mysql batch headers: option_value alone, or the SELECT * TSV header
  const single = parseSlugsDetailed('option_value\na:2:{i:0;s:19:"akismet/akismet.php";i:1;s:19:"jetpack/jetpack.php";}');
  assert.deepEqual(single.slugs, []);
  assert.equal(single.skipped.length, 1); // the serialized row is reported
  assert.deepEqual(parseSlugsDetailed("option_id\toption_name\toption_value\tautoload\n1\tactive_plugins\ta:1:{}\tyes").slugs, []);
  // mysql -t single-cell header row
  assert.deepEqual(parseSlugsDetailed("+--------------+\n| option_value |\n+--------------+").slugs, []);
});

test("verify-checksums json and yaml read plugin_name, not file paths", () => {
  const json = JSON.stringify([
    { plugin_name: "akismet", file: "readme.txt", message: "Checksum does not match" },
    { plugin_name: "wordfence", file: "lib/wordfenceClass.php", message: "Checksum does not match" },
    { plugin_name: "wordfence", file: "views/diff.php", message: "File was added" }
  ]);
  const fromJson = parseSlugsDetailed(json);
  assert.deepEqual(fromJson.slugs, ["akismet", "wordfence"]);
  assert.deepEqual(fromJson.skipped, []);
  const yaml = "---\n- \n  plugin_name: akismet\n  file: readme.txt\n  message: Checksum does not match\n- \n  plugin_name: wordfence\n  file: lib/wordfenceClass.php\n  message: Checksum does not match";
  const fromYaml = parseSlugsDetailed(yaml);
  assert.deepEqual(fromYaml.slugs, ["akismet", "wordfence"]);
  assert.deepEqual(fromYaml.skipped, []);
});

test("repeated compound-label headers re-detect instead of parsing as data", () => {
  // two verify-checksums csv runs concatenated: the second plugin_name
  // header must not become a verdict row
  const twice = parseSlugsDetailed("plugin_name,file,message\nakismet,akismet.php,Checksum does not match\nplugin_name,file,message\nwordfence,lib/x.php,Checksum does not match");
  assert.deepEqual(twice.slugs, ["akismet", "wordfence"]);
  assert.deepEqual(twice.skipped, []);
});
