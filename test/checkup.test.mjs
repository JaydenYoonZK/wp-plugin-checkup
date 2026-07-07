import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugFromLine, parseSlugs, parseUpdated, monthsBetween, apiUrl, verdict, sortVerdicts
} from "../docs/checkup.js";

const NOW = Date.UTC(2026, 6, 7); // 2026-07-07
const CTX = { now: NOW, currentMajor: 7 };

test("slugFromLine handles the common formats", () => {
  assert.equal(slugFromLine("classic-editor"), "classic-editor");
  assert.equal(slugFromLine("classic-editor/classic-editor.php"), "classic-editor");
  assert.equal(slugFromLine("https://wordpress.org/plugins/akismet/"), "akismet");
  assert.equal(slugFromLine("  woocommerce  "), "woocommerce");
  assert.equal(slugFromLine("# a comment"), null);
  assert.equal(slugFromLine(""), null);
  assert.equal(slugFromLine("https://example.com/not-a-plugin"), null);
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
  assert.match(u, /request%5Bfields%5D%5Bsections%5D=false/);
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

test("verdict: low installs flagged", () => {
  const v = verdict("tiny", {
    exists: true, name: "Tiny", last_updated: "2026-06-01 12:00am GMT", tested: "7.0", active_installs: 40
  }, CTX);
  assert.equal(v.level, "outdated");
  assert.match(v.detail, /active installs/);
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
