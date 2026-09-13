# @molecare/scale-reference

Estimate real-world sizes in a photo from an object of known size in the same
frame: a calibration sticker or a coin. Give it the ellipse your detector found
around the reference, and it returns a scale, tells you when a photo can't be
used, and converts pixel lengths and areas to millimetres.

Pure JavaScript. No React Native or native dependency, no network, no data
collected. Detecting the reference in the image is up to you.

> **Not a medical device.** The millimetres are **estimates**, not
> measurements. They have not been validated for clinical use. Do not use
> them for diagnosis or treatment decisions.

Made by [MoleCare](https://www.molecare.co.uk).

## Install

```bash
npm install @molecare/scale-reference
```

## Use

```js
import {ScaleReference} from '@molecare/scale-reference';

// The ellipse your detector found around a 10 mm sticker.
const scale = ScaleReference.fromEllipse(
  {majorAxisPx: 200, minorAxisPx: 190},
  ScaleReference.REFERENCES.STICKER_10MM.diameterMm,
);

if (!scale.usable) {
  showMessage(ScaleReference.explain(scale.reason)); // e.g. "too tilted"
} else {
  const lengthMm = ScaleReference.toMillimetres(120, scale);
  const areaMm2 = ScaleReference.toSquareMillimetres(4000, scale);
}

// Before comparing sizes across two photos:
ScaleReference.scalesAreComparable(scaleA, scaleB); // false if taken at very different distances
```

Scale comes from the ellipse's **major axis**. A round object photographed at
an angle looks oval, but its long axis still spans the true diameter; the
short axis does not. Photos tilted more than `maxTiltDegrees` (30° by default),
or where the reference is smaller than `minReferencePixels` (40 px), are
refused rather than measured.

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

The 0.1 mm rounding in `toMillimetres` is for display, not a statement of
accuracy.

## Reference objects

| Key | Object | Diameter | `exact` |
|---|---|---|---|
| `STICKER_10MM` | 10 mm calibration sticker | 10 mm | yes |
| `GBP_1` | UK £1 (12-sided) | 23.43 mm | no |
| `GBP_2` | UK £2 | 28.4 mm | yes |
| `GBP_20P` | UK 20p (seven-sided) | 21.4 mm | no |
| `EUR_1` | €1 | 23.25 mm | yes |
| `EUR_2` | €2 | 25.75 mm | yes |
| `USD_QUARTER` | US quarter | 24.26 mm | yes |
| `USD_PENNY` | US penny | 19.05 mm | yes |

Add or replace references:

```js
import {configure, DEFAULT_REFERENCES} from '@molecare/scale-reference';

configure({
  references: {
    ...DEFAULT_REFERENCES,
    CUSTOM_DOT_8MM: {label: '8 mm dot', diameterMm: 8, exact: true},
  },
});
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security problems:
[SECURITY.md](SECURITY.md).

## License

Apache-2.0 © MoleCare LTD
