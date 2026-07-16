# Contributing

Useful contributions: input formats the slug parser misses, and refinements to the health thresholds.

## Report a parsing gap

If you have a plugin-list format the parser does not recognize (an export from a specific plugin manager, a hosting panel, and so on), open an [issue](https://github.com/JaydenYoonZK/wp-plugin-checkup/issues/new/choose) with a sample. Redact anything private.

## Development

No build step, no dependencies. The engine is a pure ES module (docs/checkup.js); the network calls live in docs/app.js so the engine stays testable.

```bash
npm test         # run the suite
npm run serve    # local server on :8421
```

Parsing or verdict changes need a test in test/checkup.test.mjs with fixed dates so results stay deterministic.

## Thresholds

The abandoned and stale thresholds are constants at the top of checkup.js. If you think one is miscalibrated, open an issue with reasoning rather than changing it silently; these numbers shape every verdict. Install count is deliberately not a verdict input: a small, well-maintained plugin is not less healthy for being niche.

## Pull requests

Small and focused merges fastest. For anything structural, open an issue first.
