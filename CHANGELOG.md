# Changelog

All notable changes to this package are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- `examples/`: a tap-to-measure React Native screen, a detector-to-millimetres
  helper, and a two-photo comparison that declines different distances. CI
  typechecks and runs them. Not part of the published package.

## 1.0.0

First public release. Breaking changes from 0.x, which was never published.

### Changed

- Written in TypeScript and published as built code: CommonJS and ES modules,
  each with its own type declarations, behind an `exports` map. The package
  loads from Metro, Node (`require` and `import`), Jest with its default
  settings, and TypeScript in `node16` and `bundler` resolution.
- Named functions replace the `ScaleReference` class:
  `scaleFromEllipse`, `toMillimetres`, `toSquareMillimetres`,
  `scalesAreComparable` and `explainRefusal`. Constants are
  `DEFAULT_OPTIONS` and `REFERENCE_OBJECTS`.
- `scaleFromEllipse` always returns a frozen `Scale`. Unreadable input is
  `{usable: false, reason: 'invalid_input'}` instead of `null`, and numeric
  strings are no longer accepted as numbers.
- `scalesAreComparable` takes `{tolerance}` as an options object and rejects
  an unknown option or a tolerance outside 0 to 1.

### Removed

- The default export and the `ScaleReference` class.
- `configure`, `getConfig` and `resetConfig` (already gone in 0.2.0).
