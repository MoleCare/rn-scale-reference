/**
 * With a detector: your ML model or OpenCV step finds the ellipse around the
 * reference, and this turns it into something ready to show.
 *
 * Nothing here is React Native specific; it runs anywhere, including on a
 * server or in a worker.
 */
import {
  REFERENCE_OBJECTS,
  explainRefusal,
  scaleFromEllipse,
  toMillimetres,
  toSquareMillimetres,
  type Ellipse,
  type ReferenceKey,
} from '@molecare/scale-reference';

/** What your detector returns; the names are yours. */
export interface Detection {
  reference: Ellipse;
  referenceKind: ReferenceKey;
  subjectLengthPx: number;
  subjectAreaPx: number;
}

export type Measurement =
  | {
      ok: true;
      lengthMm: number;
      areaMm2: number;
      tiltDegrees: number;
      roughScale: boolean;
    }
  | { ok: false; message: string };

export function measure(detection: Detection): Measurement {
  const reference = REFERENCE_OBJECTS[detection.referenceKind];
  // Stricter than the default 30°, because this app shows areas too.
  const scale = scaleFromEllipse(detection.reference, reference.diameterMm, {
    maxTiltDegrees: 20,
  });
  if (!scale.usable) {
    return { ok: false, message: explainRefusal(scale.reason) };
  }
  const lengthMm = toMillimetres(detection.subjectLengthPx, scale);
  const areaMm2 = toSquareMillimetres(detection.subjectAreaPx, scale);
  if (lengthMm === null || areaMm2 === null) {
    return { ok: false, message: 'The detector found no size to measure.' };
  }
  return {
    ok: true,
    lengthMm,
    areaMm2,
    tiltDegrees: scale.tiltDegrees,
    // Polygon coins (the 12-sided £1, the 20p) don't fit an ellipse exactly.
    roughScale: !reference.exact,
  };
}

// For example, a detector that found a 10 mm sticker 200 px wide:
export const example = measure({
  reference: { majorAxisPx: 200, minorAxisPx: 190 },
  referenceKind: 'STICKER_10MM',
  subjectLengthPx: 120,
  subjectAreaPx: 11000,
});
