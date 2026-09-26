/**
 * Before putting two sizes side by side, check that the photos were taken at
 * a similar distance. If not, say so, and don't show a difference at all.
 *
 * This reports numbers only. It never says whether a change matters; that is
 * for the person, and anyone they choose to show.
 */
import {
  REFERENCE_OBJECTS,
  scaleFromEllipse,
  scalesAreComparable,
  toMillimetres,
  type Ellipse,
} from '@molecare/scale-reference';

export interface Photo {
  takenAt: string;
  reference: Ellipse;
  subjectLengthPx: number;
}

export type Comparison =
  | { kind: 'comparable'; earlierMm: number; laterMm: number }
  | { kind: 'different_distance' }
  | { kind: 'not_measurable' };

export function compare(earlier: Photo, later: Photo): Comparison {
  const diameterMm = REFERENCE_OBJECTS.STICKER_10MM.diameterMm;
  const a = scaleFromEllipse(earlier.reference, diameterMm);
  const b = scaleFromEllipse(later.reference, diameterMm);
  const earlierMm = toMillimetres(earlier.subjectLengthPx, a);
  const laterMm = toMillimetres(later.subjectLengthPx, b);
  if (earlierMm === null || laterMm === null) return { kind: 'not_measurable' };
  // Scales more than 25% apart mean very different distances, where lens
  // distortion alone can change the numbers.
  if (!scalesAreComparable(a, b)) return { kind: 'different_distance' };
  return { kind: 'comparable', earlierMm, laterMm };
}

/** Plain words for each result. Replace with your own or your translations. */
export function describe(result: Comparison): string {
  switch (result.kind) {
    case 'comparable':
      return `Estimates: ${result.earlierMm.toFixed(1)} mm then ${result.laterMm.toFixed(1)} mm.`;
    case 'different_distance':
      return 'These photos were taken at different distances, so their sizes are not compared.';
    case 'not_measurable':
      return 'One of these photos cannot be measured.';
  }
}
