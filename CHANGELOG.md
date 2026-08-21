# Changelog

## [0.2.1](https://github.com/CH4ACKO3/bites-the-dsh/compare/v0.2.0...v0.2.1) (2026-08-21)


### Performance Improvements

* harden playback navigation ([b605376](https://github.com/CH4ACKO3/bites-the-dsh/commit/b605376b2e93ecffc7e4a98fa608153c497ce3c4))

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
