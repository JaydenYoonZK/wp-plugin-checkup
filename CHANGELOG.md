# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.10] - 2026-07-10

### Changed

- The theme toggle is redesigned from an emoji swap into a morphing mark. One vector drawing plays the whole switch: the sun's core grows into the moon while a masked bite slides in to carve the crescent, the eight rays spring away with an overshoot, and the mark tilts to seat the crescent, all reversed when switching back. The moon is brand chartreuse at night and the sun is warm amber by day, the round button trades the key edge for a soft brand halo on hover, and a tooltip appears below it saying which mode a click will switch to, on hover and keyboard focus only, never on touch. The morph is disabled under reduced-motion preferences.
- The README preview is regenerated.

## [1.1.9] - 2026-07-10

### Fixed

- The back-to-top button no longer casts a heavy black smudge in light mode. Its shadow was a single wide dark-theme blur that was never re-tuned for a cream background. Each theme now gets a layered shadow of its own: a tight warm contact shadow plus a soft chartreuse halo in light mode, and a grounded contact shadow with a gentle chartreuse under-glow in dark, with matching hover and pressed variants.

## [1.1.8] - 2026-07-10

### Changed

- Removed the pulsing status dot from the privacy pill. The animated dot has become one of the most recognizable template cliches on the web, and it was redundant next to the lock icon that already carries the meaning. The pill now leads with the lock alone, with its padding evened out.
- The README preview is regenerated.

## [1.1.7] - 2026-07-10

### Added

- Tactile depth across the interface. Every button is now built like a physical key: a hard edge shadow beneath it, a soft ambient shadow, and a hairline top bevel. Hovering lifts the key slightly, and pressing travels it down while the edge collapses underneath, a real press you can feel. Primary buttons carry a chartreuse edge and glow, secondary buttons use a warm brand-brown edge in light mode and a deep neutral one in dark, disabled buttons stay flat since a dead control should not look pressable, and the movement is disabled under reduced-motion preferences while the shadow feedback remains. Cards gain a quiet layered elevation per theme.
- The README preview is regenerated.

## [1.1.6] - 2026-07-10

### Fixed

- The menu's hover state no longer turns grey, and no longer sticks. Hovering used a grey panel tone that clashed with the brand language, and on phones a tap glued that grey pill to the last-tapped item because touch browsers keep a sticky hover. Hover styling now only applies on devices with a real pointer and uses a faint chartreuse brand tint, while the active item keeps the stronger chartreuse wash and always wins when it is both hovered and active.
- The active menu item now also carries `aria-current`, so screen readers hear which section you are in, kept in sync with the highlight by the same scroll logic.

## [1.1.5] - 2026-07-10

### Changed

- Light mode brings the brand home. The signature chartreuse #abcf37 button with dark ink text, the same button dark mode has always had, is now the primary action in light mode too, and chartreuse drives the accent washes, the menu band, the page glow, and the decorative scene. The airy cream background and crisp white cards return, links use a fresh deep green that passes AA on every chartreuse wash, and the verdict colors return to the vivid set with bright washes. Every rendered text pair measures 4.5:1 or better on the live page (the brand button measures above 10:1), and the dark theme is untouched.
- The README preview is regenerated for the new palette.

## [1.1.4] - 2026-07-10

### Changed

- Light mode now uses the studio palette chosen from design references: sand background #EEE3CF, warm ivory cards, coral #FE6E54 primary buttons with dark ink text (mirroring dark mode's dark-on-chartreuse buttons), a deep coral accent for links and highlights, sage #93A86C washes with the dark green #375554 as success text, a pale gold #FCDB99 wash under warning pills, teal #40A5A0 washes with indigo #363D6E as info text, and a coral, sage, and teal decorative scene. Every rendered text pair measures 4.5:1 or better on the live page, and the dark theme is untouched.
- The README preview is regenerated for the new palette.

## [1.1.3] - 2026-07-10

### Changed

- Light mode is redesigned around a warm editorial palette inspired by premium product sites: terracotta coral becomes the accent for buttons, links, and highlights, the success wash turns sage, the danger red deepens toward crimson so it stays clearly apart from the coral, type warms one step browner, the menu band turns soft sage, and the decorative scene (orbs, spheres, cube wireframes) moves to coral, sage, and warm brown. The cream background and the whole dark theme are untouched, and every rendered text pair measures 4.5:1 or better on the live page.
- The README preview is regenerated for the new light palette.

## [1.1.2] - 2026-07-10

### Changed

- Light mode's palette is rebuilt around fresh hues instead of darkened earth tones. The accent is now a vivid deep green, success is emerald, the warning orange is clear instead of brown, and the red is brighter. Chip and pill washes are tinted from bright brand colors rather than from the dark text colors, so they read as lively pastels instead of a gray film, and the light-mode decorative constants (page glow, cube wireframes, spheres) moved from olive to brand chartreuse. Every rendered text pair was re-measured at 4.5:1 or better on the live page; dark mode is untouched.
- The README preview is regenerated to show the new light palette beside dark mode.

## [1.1.1] - 2026-07-10

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

[1.1.10]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.10
[1.1.9]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.9
[1.1.8]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.8
[1.1.7]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.7
[1.1.6]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.6
[1.1.5]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.5
[1.1.4]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.4
[1.1.3]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.3
[1.1.2]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.2
[1.1.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.1
[1.0.7]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.7
[1.0.6]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.6
[1.0.5]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.5
[1.0.4]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.4
[1.0.3]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.3
[1.0.2]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.2
[1.1.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.0.0
