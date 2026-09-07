# @molecare/scale-reference

Pixel ↔ millimetre conversion from known-diameter reference objects in frame.

**Status:** private package under the [MoleCare](https://github.com/MoleCare) org. Not published to npm yet.

Pure arithmetic — no React Native peer dependency. Detection of the reference
ellipse in an image is out of scope.

## Install

```bash
npm install @molecare/scale-reference
```

## Configure

```js
import {
  configure,
  ScaleReference,
  DEFAULT_REFERENCES,
} from '@molecare/scale-reference';

configure({
  maxTiltDegrees: 30,
  minReferencePixels: 40,
  references: {
    ...DEFAULT_REFERENCES,
    STICKER_10MM: {
      label: '10mm calibration sticker',
      diameterMm: 10,
      exact: true,
    },
  },
});

const scale = ScaleReference.fromEllipse(
  { majorAxisPx: 200, minorAxisPx: 200 },
  ScaleReference.REFERENCES.STICKER_10MM.diameterMm,
);
const mm = ScaleReference.toMillimetres(120, scale);
```

## License

Apache-2.0 © MoleCare LTD
