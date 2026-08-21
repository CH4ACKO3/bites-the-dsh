# Changelog

## 0.2.1 — 2026-08-21

- Make time seeking logarithmic and extend the built-client smoke test across raw events, slider boundaries, reverse playback, and replay exit.
- Add complete English and Simplified Chinese repository documentation.
- Format replay timestamps with the active DSH locale and cover live language switching.
- Publish GitHub Releases and npm packages automatically from version tags.

## 0.2.0 — 2026-08-21

- Add optional simulated typing in the native read-only composer.
- Make time seeking continuous and correct event stepping at both boundaries.
- Add visible loading, failure, and retry states for older history.
- Keep historical Turn Fold clocks static at the replay cursor.
- Reuse historical projections between events and while future live events arrive.
- Improve touch targets, playback accessibility, and narrow-header behavior.
- Add built-client integration coverage for plugin wiring and historical projection.

## 0.1.1 — 2026-08-20

- Publish through npm Trusted Publishing with provenance.

## 0.1.0 — 2026-08-20

- Initial read-only session playback release.
