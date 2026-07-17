# WP Plugin Checkup ✅

Paste WordPress plugin slugs and review their public WordPress.org maintenance and compatibility metadata. Runs in your browser and does not connect to your site.

<p>
  <a href="https://jaydenyoonzk.github.io/wp-plugin-checkup/"><img src="https://img.shields.io/badge/Live%20tool-open-abcf37?style=for-the-badge&logo=githubpages&logoColor=black" alt="Open the live tool"></a>
  <a href="https://github.com/JaydenYoonZK/wp-plugin-checkup/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/JaydenYoonZK/wp-plugin-checkup/ci.yml?branch=main&style=for-the-badge&label=tests" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JaydenYoonZK/wp-plugin-checkup?style=for-the-badge" alt="MIT License"></a>
</p>

<a href="https://jaydenyoonzk.github.io/wp-plugin-checkup/?demo">
  <img src="docs/assets/preview.png" alt="WP Plugin Checkup shown in light and dark themes, the hero with its illustration flagging a removed plugin, a stale one, and a healthy one" width="100%">
</a>

**[Open the live tool](https://jaydenyoonzk.github.io/wp-plugin-checkup/)** or **[see it check a sample](https://jaydenyoonzk.github.io/wp-plugin-checkup/?demo)**.

## Why this exists

Plugin installations often outlive the task that introduced them. A public listing can close, updates can stop, or tested-up-to metadata can fall behind while the installed code keeps running. Those are useful review signals, but they are not vulnerability findings.

- **No public listing.** This can mean a custom or commercial plugin, an incorrect slug, or a directory plugin that was closed. When WordPress.org explicitly reports a closure, the verdict includes the closure date and the directory's stated reason; the other cases need manual confirmation.
- **Long update gap.** Two years without an update is a practical reason to review support history, compatibility, and maintained alternatives.

This tool checks a whole plugin list against the live WordPress.org directory in seconds.

## What it checks

For each plugin it looks up the WordPress.org plugin API and returns a verdict:

| Verdict | Meaning |
|---|---|
| **GONE** | No matching public listing. Closures reported by WordPress.org include the closure date and reason; otherwise confirm whether the plugin is custom, commercial, or renamed. |
| **ABANDONED** | No update in roughly two years or more. Review its support history. |
| **CHECK** | Stale, tested only against WordPress two or more releases back, or missing evidence needed for a confident result. |
| **HEALTHY** | Recently updated and tested with a current WordPress release. This is not a vulnerability verdict. |
| **RETRY** | WordPress.org could not be reached or did not answer usably for this plugin. Nothing is known either way; run the check again. |

The current WordPress version is fetched live from WordPress.org so "tested against an old version" stays accurate over time.

## Input formats

Any of these, mixed freely, one per line:

- Plain slugs: `woocommerce`, one per line or space-separated (an `ls` of `wp-content/plugins/` pastes straight in)
- Folder or file paths as WordPress stores them: `woocommerce/woocommerce.php`
- Directory URLs: `https://wordpress.org/plugins/woocommerce/`
- WP-CLI table, CSV, JSON, and YAML output
- Composer lines from a Bedrock-style setup: `wpackagist-plugin/woocommerce`
- Full Windows or Unix paths containing `wp-content/plugins/<slug>/`

The most reliable source is `wp plugin list --field=name`. WP-CLI can perform a related directory check itself with `wp plugin list --fields=name,wporg_status,wporg_last_updated`. Display names copied from the dashboard ("Contact Form 7") are not directory slugs, so the parser skips them and says so rather than guessing the wrong plugin.

## Privacy

The tool never touches your site and needs no login. You paste a list of names; it looks each name up in the public WordPress.org plugin API from your browser, sending nothing except the slugs it has to query. It is a static page with no backend.

## Use it

No install: [jaydenyoonzk.github.io/wp-plugin-checkup](https://jaydenyoonzk.github.io/wp-plugin-checkup/)

Run locally:

```bash
git clone https://github.com/JaydenYoonZK/wp-plugin-checkup.git
cd wp-plugin-checkup
npm run serve   # http://localhost:8421
```

## Use the engine in your own project

`docs/checkup.js` is a dependency-free ES module:

```js
import { parseSlugs, apiUrl, pluginInfoFromApi, verdict } from "./checkup.js";

const slugs = parseSlugs(pastedList);
for (const slug of slugs) {
  const res = await fetch(apiUrl(slug));
  const data = await res.json().catch(() => null);
  // pluginInfoFromApi is the step that keeps verdicts honest: it separates
  // "closed by the directory", "never listed", and "API failure" before
  // verdict() runs. Passing the raw response instead would misread every
  // plugin as removed.
  const info = pluginInfoFromApi(data, { ok: res.ok, status: res.status });
  const v = verdict(slug, info, { now: Date.now(), currentVersion: "7.0" });
}
```

## Tests

```bash
npm test
```

101 tests cover table, CSV, JSON, YAML, URL, composer, and installed-path parsing; space-separated lists; skipped-line reporting; input limits; strict API dates and WordPress versions; API error and closure classification; exact threshold boundaries; compatibility gaps; missing evidence; sorting; entity decoding; static page invariants; and every verdict path against fixed dates. Coverage is measured with `npm run test:coverage`.

## Limits

This checks public directory metadata, not installed code, active versions, or known vulnerabilities. The browser checks at most 150 slugs per run with five concurrent requests and a 12-second request timeout. The reusable parser accepts up to 1 MiB and returns at most 10,000 unique slugs. A missing listing does not reveal whether a plugin was private, mistyped, renamed, closed by its author, or closed by WordPress.org.

## Sources

The lookup uses the official [`plugin_information` API](https://developer.wordpress.org/reference/functions/plugins_api/). WordPress documents several [plugin closure reasons](https://developer.wordpress.org/plugins/wordpress-org/alerts-and-warnings/), including author requests, guideline or licensing issues, mergers into core, and security issues. Supported WP-CLI list formats and the `wporg_status` fields are documented by [`wp plugin list`](https://developer.wordpress.org/cli/commands/plugin/list/).

## A note on scope

This checks maintenance status, not specific vulnerabilities. A maintained plugin can still have had a bug; the difference is that it ships a fix and an abandoned one never does. For known-vulnerability lookups, a dedicated feed is the right tool, and keeping everything current is what neutralizes most of them.

## License

MIT. Built and maintained by [Jayden Yoon ZK](https://github.com/JaydenYoonZK). Part of a WordPress toolkit with [WP Serial Fix](https://github.com/JaydenYoonZK/wp-serial-fix) and [WP Config Doctor](https://github.com/JaydenYoonZK/wp-config-doctor).
