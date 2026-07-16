# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.1] - 2026-07-17

### Fixed

- The test runner is invoked with explicit file paths instead of a shell glob. PowerShell does not expand globs and Node 20's test runner does not either, so the 1.3.0 suite could not start on Windows CI while every other platform expanded the pattern in bash first.

## [1.3.0] - 2026-07-17

A deep quality pass from an adversarial review. The headline fixes stop the two ways this tool could assert a wrong verdict.

### Fixed

- Closed plugins now get the removal verdict they deserve. WordPress.org answers a closed listing with its own response shape (error "closed" plus a closure date and reason), which previously fell into the generic API-failure branch and rendered as "Could not check. Try again in a moment.", forever. A plugin pulled for a security issue, the exact case this tool exists to surface, now shows GONE with the closure date and the directory's stated reason, and keeps its directory link since the public page documents the closure.
- Display names are skipped honestly instead of guessed. "Contact Form 7" used to collapse to its first word and return a red ABANDONED verdict for "contact", a real but unrelated plugin. Multi-word lines that are not tabular tool output or all-slug lists now parse to nothing, and the run note says which lines were skipped and why.
- A failed current-WordPress-version lookup no longer downgrades every healthy plugin to "Worth a look". The unavailable comparison is a page-wide condition reported once, and each check now awaits the version fetch (with retry) instead of racing it.
- Plugin names from the API arrive with HTML entities baked in and were double-escaped, so popular plugins displayed literal "&#8211;" in their names. Names are decoded once at the trust boundary and escaped once at render.
- Composer lines (wpackagist-plugin/akismet) resolved to the vendor name and produced a false GONE row for "wpackagist-plugin" while every real plugin went unchecked; they now resolve to the plugin slug, quoted composer.json lines included.
- Underscore slugs (serve_static and friends, live directory plugins) were silently dropped by the slug pattern and rejected by the URL builders; underscores are now accepted end to end.
- WP REST API JSON (wp-json/wp/v2/plugins) resolved through the display-name field and mis-identified plugins; identity keys (slug, plugin, file, textdomain) now take precedence.
- CSV exports with custom columns leaked non-name fields as phantom GONE rows; the header row now selects the plugin column for the rows beneath it.
- Relative plugins/ paths resolved to the literal slug "plugins" (a real abandoned plugin); wordpress.org search and tag URLs resolved to phantom "search" and "tags" slugs. Both parse honestly now.
- The 404 page loaded its stylesheet and script by relative URL, so deep missing paths rendered unstyled with dead links; every 404 asset and link is now project-absolute, and its service worker registration no longer narrows the worker scope.
- The hero illustration showed a 31-month update gap as an amber OLD pill; the engine calls that red ABANDONED. The art now shows a 14-month CHECK, and its pills use the product's real labels (CHECK, HEALTHY). The README preview is regenerated to match.
- The hidden scroll-to-top button was an invisible keyboard tab stop; it is now visibility-hidden until shown.
- Theme storage access is guarded for private-mode browsers, on both pages and in the boot scripts.

### Added

- Space-separated slug lists parse in full: an ls of wp-content/plugins pastes straight in, including the hello.php and index.php stubs (mapped to Hello Dolly and skipped, respectively). WP-CLI YAML output is now understood too.
- The run note reports skipped lines by name, so nothing disappears silently.
- A RETRY row in the verdict legend on the page and in the README, documenting the API-failure pill that could always appear.
- prefers-reduced-motion now pauses the SMIL animations in the hero and 404 illustrations, which CSS alone cannot stop.
- A theme-color meta for browser chrome, PNG favicon fallbacks (32px and apple-touch), a data-theme fallback on the html element, and a polite live region on the run status for screen readers.
- Static site tests in the suite convention (accessible names, anchor targets, asset existence, 404 absolute-URL policy) plus engine regressions for every fix above: 27 tests grow to 49.

## [1.2.31] - 2026-07-15

### Added

- A sponsor heart in the navigation, beside the theme toggle: quiet at rest, GitHub sponsor pink on hover, with the toggle's own downward tooltip and arrow, linking to the GitHub Sponsors profile. On the 404 page too.

## [1.2.30] - 2026-07-12

### Fixed

- The strip above the navigation bar is solid now. iOS skips the frosted blur in the overscroll zone, so the translucent skin let content ghost through it; the bleed wears the opaque page background, which reads identically to the bar over an empty page in both themes.

## [1.2.29] - 2026-07-12

### Fixed

- The navigation bar now bleeds its own skin above the viewport, so iOS elastic scrolling, the collapsing Safari chrome, and desktop rubber-banding show navigation instead of a bare transparent strip. Works in both themes.

## [1.2.28] - 2026-07-12

### Added

- A purpose-built 1280x640 social preview card, and the page's link-sharing metadata now points at it with honest dimensions.

## [1.2.27] - 2026-07-12

### Changed

- The navigation bar's soft shadow shows at all times now instead of appearing on scroll.

## [1.2.26] - 2026-07-12

### Added

- The navigation bar lifts with a soft, tight shadow once the page scrolls beneath it, and sits flush again at the top. Each theme carries its own tint.

## [1.2.25] - 2026-07-12

### Added

- An "All projects" pill at the end of the navigation and a footer link, both pointing at the new projects directory, one page that lists every tool.

## [1.2.24] - 2026-07-12

### Added

- A "Why I built this" story closes the page, paired with the suite's sprout scene and linked from the navigation, matching the sibling tools.

### Changed

- The FAQ heading reads "Frequently asked questions" now.

## [1.2.23] - 2026-07-12

### Added

- The FAQ is a set of full-width accordions now, each question carrying a plus that turns into a close mark as the answer unfolds, with the state exposed to keyboards and screen readers.
- The page carries a plugin heartbeat scene beside the maintenance explainer, so sections close at the full width instead of trailing off empty on the right.

### Changed

- Result chips grow to close each row, the seam between the tool and the prose is tighter, and loose paragraphs run the full section width.

## [1.2.22] - 2026-07-12

### Fixed

- The privacy pill's lock now stays vertically centered when the text wraps to a second line.

## [1.2.21] - 2026-07-12

### Changed

- The footer is now centered, and the copyright line links a bold Jayden Yoon ZK to https://www.JaydenYoonZK.com.

## [1.2.20] - 2026-07-12

### Added

- Every page, including the 404, now closes with a quiet copyright line in the footer: Copyright © Jayden Yoon ZK with the current year, All Rights Reserved. The year keeps itself current.

## [1.2.19] - 2026-07-12

### Added

- Source attribution in the shipped files. Every stylesheet and script now opens with a license banner naming Jayden Yoon ZK, each page carries an author meta tag and an HTML notice, and the browser console prints a small signature with a link back to the source.

## [1.2.18] - 2026-07-12

### Fixed

- The 404 page's key and tool cards no longer pick up the prose link underline on hover, focus, or press.

## [1.2.17] - 2026-07-12

### Fixed

- The 404 page now carries the same Built by Jayden Yoon ZK footer as every other page.
- Short pages no longer show a hard-edged second copy of the page glow near the bottom. The body background propagates to the canvas, which tiles the glow image below a short page; the glow is now painted exactly once.

## [1.2.16] - 2026-07-12

### Added

- The page now loads offline. A small service worker caches the shell on the first visit, answers repeat visits from cache while refreshing in the background, and drops old caches on every release. Live lookups still need a connection and pass through the worker untouched.

## [1.2.15] - 2026-07-11

### Changed

- The 404 page is now a full member of the site. It carries the brand navigation bar with the working theme toggle and crossfade, the ambient three dimensional background scene with its parallax, the cursor dust, and a new animated illustration of a browser window missing its page, complete with a searching magnifying glass. Navigation links from the 404 lead back into the tool's sections.

## [1.2.14] - 2026-07-11

### Added

- A branded 404 page. Broken or mistyped links now land on a page in the full design, with a note written in the tool's own voice, a chartreuse key back to the tool, and a grid linking the six sibling tools. GitHub Pages serves it automatically for any missing path, and search engines are told not to index it.

## [1.2.13] - 2026-07-11

### Added

- The site now publishes its own search and AI crawler metadata: a robots.txt with a deliberate allow policy, a sitemap.xml, and an llms.txt that maps the tool, documentation, and source for AI systems. The llms.txt follows the structure the format proposes, with the required name heading, a summary blockquote, and annotated link sections.

## [1.2.12] - 2026-07-11

### Added

- A skip to main content link for keyboard and screen reader users. It waits off screen as the page's first focusable element and drops in as a chartreuse key when focused, jumping past the navigation straight to the tool. The slide respects reduced motion preferences.

## [1.2.11] - 2026-07-11

### Changed

- Social sharing metadata carries explicit X and Twitter titles and descriptions, matching the other tools in the suite.

## [1.2.10] - 2026-07-11

### Fixed

- A disabled primary button no longer blends the pressed-key look with the dashed disabled outline. The primary styling outranked the disabled state, so buttons such as a not-yet-usable submit looked clickable and not clickable at once, with light mode even painting the full chartreuse key under the dashes. Disabled primaries now render as a flat ghost in both themes.
- The "directory" links in the results table carry a small open-in-new icon, so they read as something that opens.

## [1.2.9] - 2026-07-11

### Fixed

- Tables are readable on phones. The old narrow-screen treatment turned tables into sideways-scrolling boxes with no hint that more columns existed, so status pills were chopped mid-word and explanation columns sat invisible off-screen. Rows now restack as cards on narrow screens: names and pills flow on one line, the explanation wraps at full width beneath them, decorative header rows step aside, and nothing scrolls sideways.

## [1.2.8] - 2026-07-11

### Changed

- The film grain steps up once more in both themes. With the fine dot size this reads as richer paper texture rather than noise. README previews regenerated.

## [1.2.7] - 2026-07-11

### Changed

- The film grain is a touch more present in both themes, still well below its original strength, keeping gradients dithered while the texture stays a quiet detail. README previews regenerated.

## [1.2.6] - 2026-07-11

### Changed

- Button shadows are lighter. The ground shadow under the 3D keys drops much of its opacity and trades its tight spread for a softer blur, so it reads as ambient light falloff instead of an ink block, and the hard edge tone eases slightly in both themes. The key geometry and travel are unchanged. README previews regenerated.

## [1.2.5] - 2026-07-11

### Added

- The resize corner of text boxes shows a hand-drawn affordance again: two diagonal grip lines in brand green floating on a transparent square, so people can tell the box expands while the rounded corner stays clean. Light mode uses the deeper green for contrast on cream.

## [1.2.4] - 2026-07-11

### Fixed

- Scrollbars inside rounded boxes no longer break the corner. A scrollbar strip is always rectangular, so the glow, the center rail, and the system resize grip read as a square poking through a text box's corner radius. Inner scrollables now show a clean chartreuse pill with no glow or rail and an invisible resizer, while the page scrollbar, whose corners really are square, keeps the full glowing treatment.

## [1.2.3] - 2026-07-11

### Changed

- The scrollbar now carries the brand. The thumb is a glowing chartreuse key-cap pill with the same top-lit gradient the buttons use, riding a faint chartreuse center rail. It brightens and thickens under the pointer and charges up with a hotter gradient and stronger glow while being dragged. Firefox shows a solid chartreuse thumb through the standard scrollbar properties.

## [1.2.2] - 2026-07-11

### Added

- Custom scrollbars, on the page and inside any scrollable box such as the paste areas and code snippets. A slim rounded pill floats on a fully transparent track in each theme's surface tone, thickens and brightens under the pointer, and turns chartreuse while being dragged, the same accent the buttons use. WebKit browsers get the full treatment and Firefox gets the matching thin themed scrollbar through the standard properties.

## [1.2.1] - 2026-07-11

### Added

- Selected text now wears the brand. Highlighting any text shows the same chartreuse-with-dark-ink pairing the primary buttons use, identical in both themes, replacing the browser's default blue.

## [1.2.0] - 2026-07-11

### Added

- Input parsing now supports quoted WP-CLI CSV, WP-CLI JSON, tight comma lists, localized WordPress.org URLs, and Windows or Unix paths containing `wp-content/plugins`.
- API responses are normalized in the reusable engine, with separate results for a confirmed 404 plugin-not-found response and other service errors.
- Requests have a 12-second timeout, overlapping runs cancel cleanly, Clear cancels in-flight work, and progress exposes its current value to assistive technology.
- Regression coverage now includes malformed dates and versions, hostile URLs, input limits, API outages, missing evidence, and low-install-count neutrality.

### Changed

- A healthy verdict now requires both recent update metadata and a tested-up-to value that can be compared with the current WordPress release.
- Active-install count remains visible as metadata but no longer changes a maintenance verdict.
- Missing directory entries are described neutrally because the plugin-information API cannot distinguish private plugins, typos, renames, and directory closures.
- Direct API field switches use numeric zero, reducing a live Akismet response to 921 bytes while retaining the fields used by the check.
- CI covers Node.js 20, 22, and 24 on Linux, with Windows and macOS jobs retained.

### Fixed

- An API outage can no longer be reported as either a removed plugin or an all-healthy result.
- Clearing or replacing a running check no longer lets stale requests rewrite the current result table.
- Invalid calendar dates and version strings are no longer normalized into plausible maintenance evidence.

## [1.1.25] - 2026-07-11

### Fixed

- The cursor dust now lands directly on the pointer. The trail canvas is a replaced element, so inset alone did not stretch it and it laid out at its intrinsic retina-scaled size; on high-density displays every spark drew at a multiple of the cursor's position, drifting further from it toward the bottom right of the page. The canvas is now explicitly stretched to the viewport, verified at retina density.

## [1.1.24] - 2026-07-11

### Added

- A magical cursor trail. Tiny chartreuse sparks with the occasional twinkling four point star follow the pointer and burn out about a second after it rests. Dark mode gets pale glowing dust, light mode a deeper green so it stays visible on cream. It runs on a single fixed canvas, spawn rate follows how far the pointer travels, and the animation loop stops the moment the last spark dies, so an idle page costs nothing. Touch devices never load it and reduced motion turns it off entirely.

## [1.1.23] - 2026-07-11

### Changed

- The film grain is finer and milder. Each grain dot is now half its previous size, one device pixel on typical phone screens, and the overall intensity is reduced by about a quarter in both themes. Finer grain dithers banding more efficiently per unit of opacity, so gradients stay smooth while the texture recedes to a whisper. README previews regenerated.

## [1.1.22] - 2026-07-11

### Fixed

- The theme toggle no longer glitches when tapped on phones. Touch browsers pin the hover state to the last-tapped control, so after a tap the toggle sat stuck mid-twist with its hover halo on, layered over the press spin. All decorative hover styling for buttons, the toggle, and the scroll-to-top control now only exists on devices that can actually hover; touch devices get the clean press feedback alone. Controls also opt out of the double-tap zoom gesture, so taps respond without hesitation.

## [1.1.21] - 2026-07-11

### Fixed

- The film grain now actually renders on iPhone and iPad. WebKit does not apply SVG filters when an SVG is rasterized as a CSS background image, so the turbulence-based tile painted a faint dark veil with no noise at all on iOS, leaving gradient banding fully visible there. The grain is now a small pre-rendered raster tile that every browser draws identically, and it renders pixel-crisp on high-density screens instead of being smoothed into blur when the display upscales it. Gradient banding is dithered away in both themes with no soft or low-quality look. README previews regenerated.

## [1.1.20] - 2026-07-11

### Fixed

- The key press finally travels. During a click the pointer is still hovering, and the hover lift rule outranked the press rule, so the cap held its raised position while the shadows switched to pressed geometry, which read as the base jumping up instead of the cap going down. The press is now declared after the hover lift at matching specificity and wins the cascade, so the cap visibly sinks 3px into its anchored base on every click.
- Dark mode's primary button no longer loses its 3D edge on hover. A leftover rule from before the key redesign replaced the whole hover shadow with a flat glow.
- In light mode the pressed shadow now outranks the hover shadow mid click, so the primary button's base geometry stays correct through the press.
- Tapping controls on phones no longer flashes the system's default gray tap rectangle over the design's own pressed states. Keyboard focus outlines are unaffected.

## [1.1.19] - 2026-07-11

### Changed

- The 3D key buttons are rebuilt on realistic press physics. The base and its ground shadow are now anchored in place through every state: at rest the cap sits proud on a 5px base, hovering lifts the cap 1px while the base bottom stays put, and pressing sinks the cap 3px into the base with 2px of it still showing beneath the sunken cap, its ground shadow never moving and the shading inside the cap deepening. Before, the whole assembly moved together and the press read as the base rising instead of the cap sinking. Under reduced motion the cap stays still and only the shading responds. README previews are regenerated with the new resting stance.

## [1.1.18] - 2026-07-10

### Changed

- Pressing a button now reads as the cap sinking into its socket. Before, the dark bottom edge collapsed as the button traveled down, which looked like the base rising to meet it. The edge now stays put beneath the sunken cap and a soft shadow falls across the cap's top, so the press feels like a real key going down.

## [1.1.17] - 2026-07-10

### Added

- A whisper of film grain now sits over the whole page in both themes. Large soft gradients band into visible steps on most displays; the static monochrome noise dithers those steps away and gives the surface a subtle print-like tooth. It is one tiled SVG turbulence texture with no blend mode and no animation, so it composites for free, stays out of pointer input, and is dropped entirely in print. README previews are regenerated with the new surface.

## [1.1.16] - 2026-07-10

### Fixed

- The theme toggle now turns and swells on hover on every page, the playful twist that until now only the WHMCS Emoji Compatibility Guide showed. All pages always shared the same hover rule, but a more specific button rule was overriding its transform with the standard key lift on the other tools. The toggle's hover and press rules now outrank the tactile key rules everywhere.
- Hovers and tooltips respond during the theme crossfade again. The crossfade overlay intercepts pointer input by default, which deadened the page, most noticeably the toggle's own hover twist and tooltip, for half a second after every theme switch. The live page underneath now stays interactive while the fade plays, matching how immediate the toggle felt before the fade shipped.

## [1.1.15] - 2026-07-10

### Fixed

- Tooltip arrows are visible again. The arrow is a bordered square whose colored wedge sat entirely behind the tooltip bubble, which paints later and shares the same ink color, so the bubble swallowed the arrow and nothing bridged the gap to the button. The arrow now sits with its tip in the gap, 4px off the button, and its base tucked one pixel under the bubble edge, painting above the bubble so the two read as a single speech-bubble shape. Both variants are fixed, the standard bubble above a button and the theme toggle's bubble below it.

## [1.1.14] - 2026-07-10

### Fixed

- The theme crossfade no longer stutters on phones. The browser's default crossfade blends the old and new page snapshots with a plus-lighter blend inside an isolated compositing group, which means two full-screen render passes every frame. Desktop GPUs absorb that, phone GPUs drop frames. The new page now sits fully opaque underneath while the old snapshot simply fades out above it, which reads identically on an opaque page and costs a single alpha layer. Decorative drift animations also pause for the half second the fade runs, freeing GPU headroom on mobile without any visible freeze.

## [1.1.13] - 2026-07-10

### Fixed

- Text no longer flashes and re-settles mid fade when switching between light and dark mode. Text color inherits, so during the old per-element fade every element kept re-easing its parent's already animating color, which made type lag behind the page and snap late. The switch now crossfades the whole page as a single composited snapshot through the View Transitions API, so text and background move together in one smooth pass. The theme toggle is excluded, so its sun and moon morph still plays live. Browsers without view transitions fall back to fading backgrounds, borders and shadows only, with text changing in one clean step.

## [1.1.12] - 2026-07-10

### Fixed

- The inline code chip inside alerts no longer renders as a dead gray block in light mode. Its 35% black wash was tuned for dark backgrounds; over the light pink alert it read as mud. In light mode the chip is now a crisp near-white card with a hairline red keyline, so the decoded payload stands out cleanly.

### Changed

- Switching themes now fades the whole page between night and day over half a second instead of snapping instantly, which could startle or dazzle, especially dark to light at night. The fade covers colors only (backgrounds, text, borders, shadows, SVG fills), and the theme toggle is excluded so its sun and moon morph keeps its own spring timing.

## [1.1.11] - 2026-07-10

### Fixed

- The theme toggle now shows the crescent moon on phones. The previous build morphed the mark by animating SVG geometry (the circle's radius and the mask position) from CSS, which desktop browsers support but iOS Safari does not apply, so dark mode on a phone showed a plain dot instead of a moon. The switch is rebuilt on opacity and transform only, the sun spins away as a true crescent path spins in, which every mobile browser animates. Same look on desktop, now correct everywhere.

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

- The menu's hover state no longer turns gray, and no longer sticks. Hovering used a gray panel tone that clashed with the brand language, and on phones a tap glued that gray pill to the last-tapped item because touch browsers keep a sticky hover. Hover styling now only applies on devices with a real pointer and uses a faint chartreuse brand tint, while the active item keeps the stronger chartreuse wash and always wins when it is both hovered and active.
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

[1.3.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.3.1
[1.3.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.3.0
[1.2.31]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.31
[1.2.30]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.30
[1.2.29]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.29
[1.2.28]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.28
[1.2.27]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.27
[1.2.26]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.26
[1.2.25]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.25
[1.2.24]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.24
[1.2.23]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.23
[1.2.22]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.22
[1.2.21]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.21
[1.2.20]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.20
[1.2.19]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.19
[1.2.18]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.18
[1.2.17]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.17
[1.2.16]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.16
[1.2.15]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.15
[1.2.14]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.14
[1.2.13]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.13
[1.2.12]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.12
[1.2.11]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.11
[1.2.10]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.10
[1.2.9]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.9
[1.2.8]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.8
[1.2.7]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.7
[1.2.6]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.6
[1.2.5]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.5
[1.2.4]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.4
[1.2.3]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.3
[1.2.2]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.2
[1.2.1]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.1
[1.2.0]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.2.0
[1.1.25]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.25
[1.1.24]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.24
[1.1.23]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.23
[1.1.22]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.22
[1.1.21]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.21
[1.1.20]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.20
[1.1.19]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.19
[1.1.18]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.18
[1.1.17]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.17
[1.1.16]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.16
[1.1.15]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.15
[1.1.14]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.14
[1.1.13]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.13
[1.1.12]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.12
[1.1.11]: https://github.com/JaydenYoonZK/wp-plugin-checkup/releases/tag/v1.1.11
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
