# Contributing to @molecare/scale-reference

Thanks for being here. This package is a few hundred lines of pure JavaScript
with a fast test suite, so it is a good place for a first contribution.

## The one rule that is not negotiable

**This package estimates sizes. It never presents an estimate as a clinical
measurement.**

It turns pixels into millimetres using an object of known size in the same
photo. Those numbers carry real error (see "Limits" in the README). Any change
that hides that error, or presents a result as accurate enough for a medical
decision, will be declined, however good the code is.

| Fine | Not fine |
|---|---|
| A new reference object with its published size and a source | A size threshold that labels something as worrying |
| Better handling of tilt, or an uncertainty estimate | Rounding that suggests more precision than the photo holds |
| Clearer messages about why a photo can't be measured | Wording like "accurate" or "clinically validated" |

If you are unsure which side of the line a change sits on, open an issue and
ask before writing the code.

## Stateless by design

The package keeps no state and has no global settings. Every setting is an
argument, with its default in `src/defaults.js`, and module scope holds frozen
constants only (a test fails on a module-level `let` or `var`). Please don't
add a `configure()`, a cache or a singleton; add an option instead.

## Getting set up

```bash
git clone https://github.com/MoleCare/rn-scale-reference.git
cd rn-scale-reference
npm ci
npm test
```

You need Node 20 or newer. There is no React Native dependency at all.

## Adding a reference object

- Use the size published by the issuer (a mint, a manufacturer), and link the
  source in the pull request.
- Set `exact: true` only for a **round** object. Scale comes from fitting an
  ellipse, which a polygon (a 12-sided coin) does not match exactly.
- Keep keys upper case (`EUR_1`), as the tests check.

## Pull requests

- One change per pull request, with a test for the behaviour you changed.
- `npm test` passes; CI runs it on Node 20 and 22.
- Never attach a real photo of a person's skin to an issue or pull request.

## Releases

Maintainers publish to npm from a GitHub Release. The release workflow checks
that the tag matches `package.json`, runs the tests, and publishes with npm
provenance through GitHub's OIDC trusted publishing, so no npm token is stored
anywhere.

## Code of conduct

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
