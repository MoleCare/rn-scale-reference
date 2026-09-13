# Contributing to @molecare/scale-reference

Thanks for being here. This package is a few hundred lines of TypeScript with a
fast test suite, so it is a good place for a first contribution.

## The one rule that is not negotiable

**This package estimates sizes. It never presents an estimate as a clinical
measurement.**

It turns pixels into millimetres using an object of known size in the same
photo. Those numbers carry real error (see "Limits" in the README). Any change
that hides that error, or presents a result as accurate enough for a medical
decision, will be declined, however good the code is.

| Fine                                                        | Not fine                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| A new reference object with its published size and a source | A size threshold that labels something as worrying         |
| Better handling of tilt, or an uncertainty estimate         | Rounding that suggests more precision than the photo holds |
| Clearer messages about why a photo can't be measured        | Wording like "accurate" or "clinically validated"          |

If you are unsure which side of the line a change sits on, open an issue and
ask before writing the code.

## Design rules

- **Stateless.** Pure functions only: no module-level `let` or `var` (a test
  checks), no caches, no singletons, no `configure()`. A new setting is an
  option with its default in `DEFAULT_OPTIONS`.
- **Frozen outputs and constants.** Results and tables are `Object.freeze`d.
- **A photo that can't be measured is a result, not an error.** Only programming
  errors (an unknown or invalid option) throw.
- **Types are part of the API.** A change to an exported type is a change to the
  API, and a breaking one needs a major version.

## Getting set up

```bash
git clone https://github.com/MoleCare/rn-scale-reference.git
cd rn-scale-reference
npm ci
```

You need Node 20.19 or newer to work on it (the tooling needs it; the published
package itself runs on Node 18). There is no React Native dependency at all.

| Command                           | What it does                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                        | Jest tests (TypeScript, via Babel)                                                                                                                                                                                             |
| `npm run typecheck`               | `tsc` in strict mode                                                                                                                                                                                                           |
| `npm run lint` / `npm run format` | ESLint (typescript-eslint, strict) and Prettier                                                                                                                                                                                |
| `npm run build`                   | Builds `lib/` with react-native-builder-bob: CommonJS, ES modules and types                                                                                                                                                    |
| `npm run check:package`           | publint and arethetypeswrong on the packed package                                                                                                                                                                             |
| `npm run check:consumer -- pnpm`  | Packs the package, installs it in a fresh project with that package manager (`npm`, `yarn1`, `yarn4-pnp`, `yarn4-node-modules`, `pnpm`, `bun`) and loads it. With `npm` it also checks Jest's default settings and TypeScript. |

CI runs all of these on every pull request.

## Adding a reference object

- Use the size published by the issuer (a mint, a manufacturer), and link the
  source in the pull request.
- Set `exact: true` only for a **round** object. Scale comes from fitting an
  ellipse, which a polygon (a 12-sided coin) does not match exactly.
- Keep keys upper case (`EUR_1`), as the tests check.

## Pull requests

- One change per pull request, with a test for the behaviour you changed.
- Add a line to the top section of `CHANGELOG.md` for anything a user would notice.
- Never attach a real photo of a person's skin to an issue or pull request.

## Releases

Maintainers bump the version in `package.json`, add its `CHANGELOG.md`
section, and publish a GitHub Release tagged `v<version>`. The release workflow
checks the tag and the changelog, runs every check, builds once, and publishes
to npm with provenance through GitHub's OIDC trusted publishing, so no npm
token is stored anywhere.

## Code of conduct

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
