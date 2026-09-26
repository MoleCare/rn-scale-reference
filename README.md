# @molecare/scale-reference

[![CI](https://github.com/MoleCare/rn-scale-reference/actions/workflows/ci.yml/badge.svg)](https://github.com/MoleCare/rn-scale-reference/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@molecare/scale-reference)](https://www.npmjs.com/package/@molecare/scale-reference)
![types included](https://img.shields.io/npm/types/@molecare/scale-reference)
[![licence](https://img.shields.io/badge/licence-Apache--2.0-blue)](LICENSE)

Estimate real-world sizes in a photo from an object of known size in the same
frame: a calibration sticker or a coin. Give it the ellipse your detector found
around the reference. It returns a scale, tells you when a photo can't be used,
and converts pixel lengths and areas to millimetres.

TypeScript, with types included. No native code, no network, no data
collected, no state. Detecting the reference in the image is up to you.

> **Not a medical device.** The millimetres are **estimates**, not
> measurements. They have not been validated for clinical use. Do not use
> them for diagnosis or treatment decisions.

Made by [MoleCare](https://www.molecare.co.uk).

## Install

Use your project's package manager. They all install from the npm registry.

```bash
npm install @molecare/scale-reference
yarn add @molecare/scale-reference
pnpm add @molecare/scale-reference
bun add @molecare/scale-reference
npx expo install @molecare/scale-reference
```

There is no native code, so there is nothing to link, no pods and no Expo
config plugin.

### Works with

|                     |                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| React Native / Expo | Metro, with or without package `exports` enabled                                    |
| Package managers    | npm, Yarn 1, Yarn 4 (Plug'n'Play and `node_modules`), pnpm, Bun, each checked in CI |
| Node                | `require` and `import`, Node 18 and newer                                           |
| Jest                | default settings; no `transformIgnorePatterns` change needed                        |
| TypeScript          | `moduleResolution` `bundler`, `node16` and `nodenext`                               |

## Use

```ts
import {
  REFERENCE_OBJECTS,
  explainRefusal,
  scaleFromEllipse,
  scalesAreComparable,
  toMillimetres,
  toSquareMillimetres,
} from '@molecare/scale-reference';

// The ellipse your detector found around a 10 mm sticker.
const scale = scaleFromEllipse(
  { majorAxisPx: 200, minorAxisPx: 190 },
  REFERENCE_OBJECTS.STICKER_10MM.diameterMm
);

if (!scale.usable) {
  showMessage(explainRefusal(scale.reason)); // e.g. "too tilted"
} else {
  const lengthMm = toMillimetres(120, scale); // number | null
  const areaMm2 = toSquareMillimetres(4000, scale);
}

// Before comparing sizes across two photos:
scalesAreComparable(scaleA, scaleB); // false if taken at very different distances
```

Scale comes from the ellipse's **major axis**. A round object photographed at
an angle looks oval, but its long axis still spans the true diameter; the
short axis does not.

### Complete examples

[`examples/`](examples/) has copy-paste starting points, typechecked and run in
CI so they stay in step with the API:

- [`TapToMeasure.tsx`](examples/TapToMeasure.tsx): a React Native screen that
  measures with four taps, no detector needed.
- [`fromDetector.ts`](examples/fromDetector.ts): your detector's ellipse to
  lengths and areas, with a stricter tilt limit.
- [`compareTwoPhotos.ts`](examples/compareTwoPhotos.ts): check two photos were
  taken at a similar distance before showing both sizes.

## API

| Function                                          | Returns                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scaleFromEllipse(ellipse, diameterMm, options?)` | A frozen `Scale`. `usable: true` with `mmPerPixel` and `tiltDegrees`, or `usable: false` with a `reason`: `'reference_too_small'`, `'reference_too_tilted'` or `'invalid_input'` (not a positive number, including `NaN` and numeric strings). |
| `toMillimetres(pixels, scale)`                    | Millimetres rounded to 0.1, or `null` when the scale is not usable or `pixels` is not a positive number                                                                                                                                        |
| `toSquareMillimetres(pixelArea, scale)`           | Square millimetres rounded to 0.1, or `null`                                                                                                                                                                                                   |
| `scalesAreComparable(a, b, {tolerance?})`         | `true` when the two scales differ by at most `tolerance` (default `0.25`). An unusable or missing scale is never comparable.                                                                                                                   |
| `explainRefusal(reason, messages?)`               | A plain-English explanation, or your own text                                                                                                                                                                                                  |
| `DEFAULT_OPTIONS`                                 | `{maxTiltDegrees: 30, minReferencePixels: 40}` (frozen)                                                                                                                                                                                        |
| `REFERENCE_OBJECTS`                               | The table below (frozen)                                                                                                                                                                                                                       |

Types: `Ellipse`, `Scale`, `ScaleOptions`, `RefusalReason`, `ComparableOptions`,
`Messages`, `ReferenceObject`, `ReferenceKey`.

With TypeScript, `scale.mmPerPixel` is a `number` only after you check
`scale.usable`, so an unusable scale can't be used by mistake.

## No state, no global settings

Every function is pure. The package keeps nothing between calls and has no
global configuration, so two parts of an app (or two libraries) can use
different settings without affecting each other. Pass settings with the call:

```ts
const scale = scaleFromEllipse(ellipse, diameterMm, { maxTiltDegrees: 20 });
```

An unknown option, or one that is not a positive number, throws a `TypeError`
rather than being ignored. That is the only thing that throws; a photo that
can't be measured is a result, not an error.

Explanations are plain English. To use your own wording or a translation, pass
it in, keyed by reason, with `default` for anything else:

```ts
explainRefusal(scale.reason, {
  reference_too_small: t('scale.tooSmall'),
  reference_too_tilted: t('scale.tooTilted'),
  default: t('scale.cannotMeasure'),
});
```

## Limits

Treat every result as an estimate with an error of its own. The main sources:

- **Height difference.** The reference must lie flat at the same distance from
  the camera as the thing measured. A coin resting on a curved surface, or
  held above it, changes the scale.
- **Tilt.** The major-axis rule corrects for tilting the reference, but not for
  the subject being at a different angle from it.
- **Lens distortion.** Phone lenses stretch the edges of the frame; keep the
  reference and the subject near the centre.
- **Detection.** The result is only as good as the ellipse your detector finds.
- **Shape.** Only round references (`exact: true`) fit an ellipse exactly.

The 0.1 mm rounding is for display, not a statement of accuracy.

## Reference objects

| Key            | Object                    | Diameter | `exact` |
| -------------- | ------------------------- | -------- | ------- |
| `STICKER_10MM` | 10 mm calibration sticker | 10 mm    | yes     |
| `GBP_1`        | UK £1 (12-sided)          | 23.43 mm | no      |
| `GBP_2`        | UK £2                     | 28.4 mm  | yes     |
| `GBP_20P`      | UK 20p (seven-sided)      | 21.4 mm  | no      |
| `EUR_1`        | €1                        | 23.25 mm | yes     |
| `EUR_2`        | €2                        | 25.75 mm | yes     |
| `USD_QUARTER`  | US quarter                | 24.26 mm | yes     |
| `USD_PENNY`    | US penny                  | 19.05 mm | yes     |

The table is a convenience; nothing in the package reads it for you.
`scaleFromEllipse` takes any diameter, so keep your own references in your app:

```ts
import {
  REFERENCE_OBJECTS,
  type ReferenceObject,
} from '@molecare/scale-reference';

const MY_REFERENCES: Record<string, ReferenceObject> = {
  ...REFERENCE_OBJECTS,
  CUSTOM_DOT_8MM: { label: '8 mm dot', diameterMm: 8, exact: true },
};
```

## Upgrading from 0.x

See [CHANGELOG.md](CHANGELOG.md). In short: `ScaleReference.fromEllipse` is now
`scaleFromEllipse`, `ScaleReference.explain` is `explainRefusal`,
`ScaleReference.REFERENCES` is `REFERENCE_OBJECTS`, and unreadable input is a
`Scale` with `reason: 'invalid_input'` instead of `null`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security problems:
[SECURITY.md](SECURITY.md).

## License

Apache-2.0 © MoleCare LTD
