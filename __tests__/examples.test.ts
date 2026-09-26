// The examples in examples/ are documentation; this runs the plain ones so a
// change that breaks their numbers fails here, not in someone's app.
import {
  compare,
  describe as describeResult,
} from '../examples/compareTwoPhotos';
import { example, measure } from '../examples/fromDetector';

describe('examples/fromDetector', () => {
  it('turns a 200 px sticker into millimetres', () => {
    expect(example).toMatchObject({
      ok: true,
      lengthMm: 6,
      areaMm2: 27.5,
      roughScale: false,
    });
    // 200 x 190 px is a slight tilt, well inside the 20° limit.
    expect(example.ok && example.tiltDegrees).toBeGreaterThan(0);
    expect(example.ok && example.tiltDegrees).toBeLessThan(20);
  });

  it('explains a refusal instead of measuring', () => {
    const result = measure({
      reference: { majorAxisPx: 200, minorAxisPx: 100 }, // 60° tilt
      referenceKind: 'STICKER_10MM',
      subjectLengthPx: 120,
      subjectAreaPx: 11000,
    });
    expect(result.ok).toBe(false);
  });

  it('flags polygon coins as a rough scale', () => {
    const result = measure({
      reference: { majorAxisPx: 400, minorAxisPx: 395 },
      referenceKind: 'GBP_1',
      subjectLengthPx: 100,
      subjectAreaPx: 5000,
    });
    expect(result).toMatchObject({ ok: true, roughScale: true });
  });

  it('reports a missing size', () => {
    const result = measure({
      reference: { majorAxisPx: 200, minorAxisPx: 200 },
      referenceKind: 'STICKER_10MM',
      subjectLengthPx: 0,
      subjectAreaPx: 0,
    });
    expect(result).toEqual({
      ok: false,
      message: 'The detector found no size to measure.',
    });
  });
});

describe('examples/compareTwoPhotos', () => {
  const photo = (majorAxisPx: number, subjectLengthPx: number) => ({
    takenAt: '2026-03-01',
    reference: { majorAxisPx, minorAxisPx: majorAxisPx },
    subjectLengthPx,
  });

  it('shows both estimates when the distances are similar', () => {
    const result = compare(photo(200, 120), photo(210, 130));
    expect(result).toEqual({ kind: 'comparable', earlierMm: 6, laterMm: 6.2 });
    expect(describeResult(result)).toBe('Estimates: 6.0 mm then 6.2 mm.');
  });

  it('declines to compare photos taken at very different distances', () => {
    const result = compare(photo(100, 60), photo(300, 180));
    expect(result).toEqual({ kind: 'different_distance' });
    expect(describeResult(result)).toMatch(/different distances/);
  });

  it('says when a photo cannot be measured', () => {
    const result = compare(photo(10, 60), photo(200, 120));
    expect(result).toEqual({ kind: 'not_measurable' });
    expect(describeResult(result)).toMatch(/cannot be measured/);
  });

  it('never judges a change', () => {
    const texts = [
      describeResult({ kind: 'comparable', earlierMm: 4, laterMm: 9 }),
      describeResult({ kind: 'different_distance' }),
      describeResult({ kind: 'not_measurable' }),
    ];
    texts.forEach((text) => {
      expect(text).not.toMatch(
        /grow|grown|bigger|worse|concern|risk|see a doctor/i
      );
    });
  });
});
