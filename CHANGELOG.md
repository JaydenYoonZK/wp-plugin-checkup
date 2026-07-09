# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

[1.0.4]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.4
[1.0.3]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.3
[1.0.2]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.2
[1.0.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.0
