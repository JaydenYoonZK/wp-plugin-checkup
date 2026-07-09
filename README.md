# WP Plugin Checkup ✅

Paste your WordPress plugins and check each against WordPress.org: removed from the directory, abandoned, or untested with current WordPress. The plugins you forgot about are the ones that get you hacked. Runs in your browser.

<p>
  <a href="https://jaydenyoonzk.github.io/wp-plugin-checkup/"><img src="https://img.shields.io/badge/Live%20tool-open-abcf37?style=for-the-badge&logo=githubpages&logoColor=black" alt="Open the live tool"></a>
  <a href="https://github.com/JaydenYoonZK/wp-plugin-checkup/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/JaydenYoonZK/wp-plugin-checkup/ci.yml?branch=main&style=for-the-badge&label=tests" alt="CI status"></a>
  <a href="https://github.com/JaydenYoonZK/wp-plugin-checkup"><img src="https://img.shields.io/github/stars/JaydenYoonZK/wp-plugin-checkup?style=for-the-badge&logo=github" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JaydenYoonZK/wp-plugin-checkup?style=for-the-badge" alt="MIT License"></a>
</p>

<a href="https://jaydenyoonzk.github.io/wp-plugin-checkup/?demo">
  <img src="docs/assets/preview.png" alt="WP Plugin Checkup shown in light and dark themes, the hero with its illustration flagging a removed plugin, a stale one, and a healthy one" width="100%">
</a>

**[Open the live tool](https://jaydenyoonzk.github.io/wp-plugin-checkup/)** or **[see it check a sample](https://jaydenyoonzk.github.io/wp-plugin-checkup/?demo)**.

## Why this exists

Most WordPress compromises are not clever. They come from a plugin with a known, published vulnerability that nobody updated, because nobody remembered it was installed. Two situations deserve immediate attention, and both are invisible from inside wp-admin:

- **Removed from the directory.** When WordPress.org pulls a plugin, it is often for an unresolved security issue. The plugin keeps running on your site but stops getting updates and vanishes from search, so you may never hear there was a problem.
- **Abandoned.** A plugin untouched for years is a bet that no vulnerability will ever be found in it, and that bet worsens every month.

This tool checks a whole plugin list against the live WordPress.org directory in seconds.

## What it checks

For each plugin it looks up the WordPress.org plugin API and returns a verdict:

| Verdict | Meaning |
|---|---|
| **GONE** | Not in the directory. Possibly removed for a security or guideline problem (urgent), or a premium/custom plugin the directory never listed. |
| **ABANDONED** | No update in roughly two years or more. |
| **CHECK** | Stale (about a year), only tested against an old WordPress version, or very few installs. |
| **HEALTHY** | Recently updated and tested with current WordPress. |

The current WordPress version is fetched live from WordPress.org so "tested against an old version" stays accurate over time.

## Input formats

Any of these, mixed freely, one per line:

- Plain slugs: `woocommerce`
- Folder or file paths as WordPress stores them: `woocommerce/woocommerce.php`
- Directory URLs: `https://wordpress.org/plugins/woocommerce/`

To get your list: in the dashboard open **Plugins** and copy the names, or run `wp plugin list --field=name` with WP-CLI, or read the folder names in `wp-content/plugins/`.

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
import { parseSlugs, apiUrl, verdict } from "./checkup.js";

const slugs = parseSlugs(pastedList);
// fetch apiUrl(slug) yourself, then:
const v = verdict(slug, info, { now: Date.now(), currentVersion: "7.0" });
```

## Tests

```bash
npm test
```

19 tests cover slug parsing across formats (including comma-separated lists and WP-CLI CSV), the WordPress x.y version comparison, the API date format, and every verdict path against fixed dates.

## A note on scope

This checks maintenance status, not specific vulnerabilities. A maintained plugin can still have had a bug; the difference is that it ships a fix and an abandoned one never does. For known-vulnerability lookups, a dedicated feed is the right tool, and keeping everything current is what neutralizes most of them.

## License

MIT. Built and maintained by [Jayden Yoon ZK](https://github.com/JaydenYoonZK). Part of a WordPress toolkit with [WP Serial Fix](https://github.com/JaydenYoonZK/wp-serial-fix) and [WP Config Doctor](https://github.com/JaydenYoonZK/wp-config-doctor).
