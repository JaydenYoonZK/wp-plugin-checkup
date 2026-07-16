import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docs = join(root, "docs");
const html = readFileSync(join(docs, "index.html"), "utf8");
const notFound = readFileSync(join(docs, "404.html"), "utf8");

test("every button and select has an accessible name", () => {
  // An accessible name is an aria-label or visible text content; the FAQ
  // disclosure buttons are named by the question text they contain.
  for (const page of [html, notFound]) {
    for (const match of page.matchAll(/<(button|select)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const hasLabel = /\baria-label="[^"]+"/.test(match[0].slice(0, match[0].indexOf(">") + 1));
      const visibleText = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      assert.ok(hasLabel || visibleText.length > 0, `no accessible name: ${match[0].slice(0, 120)}`);
    }
  }
});

test("internal navigation targets exist", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const targets = [...html.matchAll(/\bhref="#([^"]+)"/g)].map(match => match[1]);
  for (const target of targets) assert.ok(ids.has(target), `missing #${target}`);
  // the 404 page points back at the live page's sections
  for (const match of notFound.matchAll(/\bhref="\/wp-plugin-checkup\/#([^"]+)"/g)) {
    assert.ok(ids.has(match[1]), `404 page links to missing #${match[1]}`);
  }
});

test("local page assets exist", () => {
  const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1]);
  const local = references.filter(value =>
    !/^(?:[a-z]+:|#)/i.test(value) && !value.startsWith("//")
  );
  for (const reference of local) {
    const path = reference.split(/[?#]/, 1)[0];
    assert.ok(existsSync(join(docs, path)), `missing local asset: ${reference}`);
  }
});

test("the 404 page references assets by project-absolute URL only", () => {
  // GitHub Pages serves 404.html at arbitrary deep paths, where relative
  // asset URLs resolve against the missing directory and break.
  for (const match of notFound.matchAll(/\b(?:href|src)="([^"]+\.(?:css|js|png|svg|webmanifest)(?:\?[^"]*)?)"/g)) {
    const url = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(url)) continue; // external or data:
    assert.ok(url.startsWith("/wp-plugin-checkup/"), `relative asset URL on 404 page: ${url}`);
    const path = url.slice("/wp-plugin-checkup/".length).split(/[?#]/, 1)[0];
    assert.ok(existsSync(join(docs, path)), `404 asset missing on disk: ${url}`);
  }
});

test("security and structured metadata remain valid", () => {
  assert.match(html, /connect-src https:\/\/api\.wordpress\.org/);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLd, "missing JSON-LD metadata");
  assert.doesNotThrow(() => JSON.parse(jsonLd[1]));
});

test("search and social metadata point to the canonical site", () => {
  const robots = readFileSync(join(docs, "robots.txt"), "utf8");
  const sitemap = readFileSync(join(docs, "sitemap.xml"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/jaydenyoonzk\.github\.io\/wp-plugin-checkup\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/jaydenyoonzk\.github\.io\/wp-plugin-checkup\/<\/loc>/);
  assert.match(html, /<meta property="og:image:alt" content="[^"]+">/);
  assert.match(html, /<meta name="twitter:description" content="[^"]+">/);
});
