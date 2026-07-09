# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- GitHub Actions now runs the test suite and syntax checks on Node 18, 20, and 22 across Linux, macOS, and Windows.
- A security policy points private vulnerability reports to GitHub Security Advisories.
- The package metadata now limits packed files to the reusable engine, README, and license.

### Fixed

- The README's reusable-engine example now passes `currentVersion`, matching the public API used by the app.
- `verdict()` still accepts the older `currentMajor` context key, so copied examples from older documentation keep flagging old tested-up-to versions instead of silently skipping that signal.
- The README stars badge now links to the repository page, avoiding GitHub's 404 on the empty stargazers page.
- The browser app cache-busts its engine import so GitHub Pages serves the current parser after deployment.

## [1.1.0] - 2026-07-09

### Fixed

- The "only tested up to WordPress X" check works again. WordPress major releases are the x.y pair (6.4, 6.5), but the comparison read only the leading integer, so it treated every 6.x as the same version. That quietly disabled the tested-version signal for the whole WordPress 6 era: a plugin whose tested tag stopped at 6.0 read as "tested with a current WordPress version" while 6.7 was out. The comparison now counts x.y releases, so a plugin two or more releases behind is flagged, and one release behind is still fine.
- A comma-and-space separated list on a single line no longer drops every plugin but the first. `akismet, jetpack, woocommerce` now checks all three. Tight CSV output (`akismet,active,none,5.7`) is still read as one plugin, so its status and version columns are not mistaken for plugin slugs.

### Added

- A Content Security Policy on the browser tool. The only network it needs is the WordPress.org plugin API, so `connect-src` is pinned to `https://api.wordpress.org` and nothing else; your plugin list cannot be sent elsewhere. Verified in a browser: the lookups still work and any other origin is blocked.

### Changed

- Accessibility: the paste box now has a real label instead of one hidden with `display:none`.
- 18 tests, up from 13, including the within-major version lag and the comma-versus-CSV parsing.

## [1.0.7] - 2026-07-09

### Changed

- Light mode's status colors are livelier and now measurably meet WCAG AA. The olive green, brown amber, and muted red came from darkening alone, which made them muddy; they are replaced with fully saturated deep equivalents (accent #4c7a00, green #1d7a25, orange #ba4700, red #c62a22), the soft chip tints were eased to match, primary buttons in light mode use white text on the deep accent, and light muted text was deepened one step. Measured on the rendered page, every status pill, link, button label, and muted text now sits at 4.5:1 or better; the previous accent and the muted text on tinted chips quietly failed. Dark mode is untouched.

## [1.0.6] - 2026-07-09

### Added

- The hero illustration now has a light-mode version. It is the same inline drawing recolored through the theme tokens, so it follows the theme toggle instantly and always stays in step with the palette. Dark mode is unchanged.

## [1.0.5] - 2026-07-09

### Fixed

- Clicking a menu item now always highlights the item you clicked. The highlight was driven by an observer watching a band in the middle of the viewport, but a menu jump lands the section heading at the top, outside that band, so the green pill often stayed on a section the page had merely scrolled past. The active item is now computed directly from the scroll position: the last section whose heading sits above the reading line under the header, with the last section winning at the very bottom of the page.

## [1.0.4] - 2026-07-09

### Changed

- The menu now sits in its own tinted band under the brand bar on every screen size, giving the header a clear hierarchy: brand and theme toggle on top, menu below, every item always visible. The whole header is sticky again on all devices, and section jumps measure the header instead of assuming its height, so they land exactly below it however many rows the menu wraps to.

## [1.0.3] - 2026-07-09

### Fixed

- On phones the menu no longer hides items behind an invisible horizontal scroll. Below 720px it wraps onto its own row under the brand with every item visible and centered, and the bar scrolls away with the page instead of pinning several rows to a small screen; the back-to-top button brings it back into reach. Desktop keeps the single sticky row, and section jumps account for the new offsets.

## [1.0.2] - 2026-07-09

### Fixed

- The Paste button works on iPhone and iPad again. The previous touch flow skipped the iOS clipboard confirmation and waited for a manual paste that most people never discover, so the button looked dead. The clipboard is now requested the same way on every device: iOS shows its Paste confirmation at the tap point, and confirming it fills the box and runs the check in one motion. If the read is declined, the box is focused with a hint and the check runs by itself as soon as a paste lands. An empty clipboard now says so.

## [1.0.1] - 2026-07-07

### Fixed

- Parse a pasted WP-CLI `wp plugin list` table (borders, header row, and pipe-delimited cells), so the most common list format now works.
- Results table scrolls inside its own container on mobile, with no horizontal page shift, and long inline URLs in the docs wrap instead of clipping.

## [1.0.0] - 2026-07-07

First stable release.

### Added

- Health check of a pasted WordPress plugin list against the live WordPress.org directory.
- Verdicts: GONE (not in the directory), ABANDONED (no update in ~2 years), CHECK (stale, old tested version, or few installs), HEALTHY.
- Current WordPress version fetched live so the tested-version check stays accurate over time.
- Input parsing for plain slugs, folder/file.php paths, and directory URLs, mixed freely.
- Live metadata per plugin: version, tested-up-to, active installs, rating.
- Dependency-free ES module engine (docs/checkup.js) with 13 Node tests.
- Browser UI in the shared suite design with light and dark themes and a ?demo deep link.

[1.0.7]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.7
[1.0.6]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.6
[1.0.5]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.5
[1.0.4]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.4
[1.0.3]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.3
[1.0.2]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.2
[1.1.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.0
