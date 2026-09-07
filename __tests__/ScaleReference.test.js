/* eslint-env jest, node */
import ScaleReference from '../src/ScaleReference';

const STICKER = ScaleReference.REFERENCES.STICKER_10MM.diameterMm; // 10mm

/** A reference photographed square on: both axes equal. */
const flat = px => ({majorAxisPx: px, minorAxisPx: px});

/** A reference tilted by `deg`: the minor axis shortens by cos(deg). */
const tilted = (px, deg) => ({
  majorAxisPx: px,
  minorAxisPx: px * Math.cos((deg * Math.PI) / 180),
});

describe('scale from a reference', () => {
  it('derives millimetres per pixel from a flat reference', () => {
    // A 10mm sticker spanning 200px is 0.05 mm per pixel.
    const scale = ScaleReference.fromEllipse(flat(200), STICKER);

    expect(scale.mmPerPixel).toBeCloseTo(0.05, 6);
    expect(scale.tiltDegrees).toBeCloseTo(0, 4);
    expect(scale.usable).toBe(true);
  });

  it('takes scale from the major axis, which tilt does not foreshorten', () => {
    // The whole correctness of this module. A circle seen at an angle projects
    // to an ellipse whose major axis still spans the true diameter; the minor
    // is shortened by cos(tilt). Using the minor, or the average, under-reads
    // the reference and so over-reads every lesion measured against it.
    const square = ScaleReference.fromEllipse(flat(200), STICKER);
    const angled = ScaleReference.fromEllipse(tilted(200, 25), STICKER);

    expect(angled.mmPerPixel).toBeCloseTo(square.mmPerPixel, 6);
  });

  it('would over-report a lesion if it averaged the axes', () => {
    // Guards the specific error, with the size that matters: 6mm is a
    // clinically used threshold, and averaging at 30° pushes a 6mm lesion past
    // it.
    const scale = ScaleReference.fromEllipse(tilted(200, 30), STICKER);
    const lesionPx = 120; // 6.0mm at the correct scale

    const correct = ScaleReference.toMillimetres(lesionPx, scale);
    const ifAveraged =
      (lesionPx * STICKER) / ((200 + 200 * Math.cos(Math.PI / 6)) / 2);

    expect(correct).toBeCloseTo(6.0, 1);
    expect(ifAveraged).toBeGreaterThan(6.4);
  });

  it('recovers the tilt angle', () => {
    expect(
      ScaleReference.fromEllipse(tilted(200, 20), STICKER).tiltDegrees,
    ).toBeCloseTo(20, 1);
    expect(
      ScaleReference.fromEllipse(tilted(200, 45), STICKER).tiltDegrees,
    ).toBeCloseTo(45, 1);
  });

  it('does not care which axis the detector reports first', () => {
    const a = ScaleReference.fromEllipse(
      {majorAxisPx: 200, minorAxisPx: 170},
      STICKER,
    );
    const b = ScaleReference.fromEllipse(
      {majorAxisPx: 170, minorAxisPx: 200},
      STICKER,
    );

    expect(a.mmPerPixel).toBeCloseTo(b.mmPerPixel, 8);
    expect(a.tiltDegrees).toBeCloseTo(b.tiltDegrees, 6);
  });

  it('works from any known reference, not just the sticker', () => {
    const coin = ScaleReference.REFERENCES.GBP_2.diameterMm; // 28.4mm
    const scale = ScaleReference.fromEllipse(flat(284), coin);

    expect(scale.mmPerPixel).toBeCloseTo(0.1, 6);
  });
});

describe('refusing to measure', () => {
  it('rejects a reference too tilted to describe with one scale', () => {
    const scale = ScaleReference.fromEllipse(tilted(200, 45), STICKER);

    expect(scale.usable).toBe(false);
    expect(scale.reason).toBe('reference_too_tilted');
  });

  it('rejects a reference too small for the pixels to mean anything', () => {
    const scale = ScaleReference.fromEllipse(flat(20), STICKER);

    expect(scale.usable).toBe(false);
    expect(scale.reason).toBe('reference_too_small');
  });

  it('returns null rather than a number when the scale is unusable', () => {
    // A measurement from a bad reference is worse than none, because it looks
    // like a measurement.
    const bad = ScaleReference.fromEllipse(tilted(200, 60), STICKER);

    expect(ScaleReference.toMillimetres(120, bad)).toBeNull();
    expect(ScaleReference.toSquareMillimetres(4000, bad)).toBeNull();
  });

  it('returns null for nonsense input rather than NaN', () => {
    expect(ScaleReference.fromEllipse(null, STICKER)).toBeNull();
    expect(ScaleReference.fromEllipse(flat(200), 0)).toBeNull();
    expect(
      ScaleReference.fromEllipse({majorAxisPx: -5, minorAxisPx: 5}, STICKER),
    ).toBeNull();
    expect(
      ScaleReference.toMillimetres(NaN, {usable: true, mmPerPixel: 0.05}),
    ).toBeNull();
  });
});

describe('area', () => {
  it('squares the scale factor', () => {
    // The mistake to avoid: applying mmPerPixel once under-reports area by that
    // factor again.
    const scale = ScaleReference.fromEllipse(flat(200), STICKER); // 0.05 mm/px

    // 400 px² at 0.05 mm/px is 400 * 0.0025 = 1.0 mm²
    expect(ScaleReference.toSquareMillimetres(400, scale)).toBeCloseTo(1.0, 1);
  });
});

describe('comparing two measured photos', () => {
  it('accepts photos taken at similar distances', () => {
    const a = ScaleReference.fromEllipse(flat(200), STICKER);
    const b = ScaleReference.fromEllipse(flat(210), STICKER);

    expect(ScaleReference.scalesAreComparable(a, b)).toBe(true);
  });

  it('rejects photos whose pixel resolution differs too much', () => {
    // Both are valid scales. Change reported between them would carry the
    // resolution difference in it.
    const near = ScaleReference.fromEllipse(flat(300), STICKER);
    const far = ScaleReference.fromEllipse(flat(120), STICKER);

    expect(ScaleReference.scalesAreComparable(near, far)).toBe(false);
  });

  it('treats an unusable scale as not comparable, never as a match', () => {
    const good = ScaleReference.fromEllipse(flat(200), STICKER);
    const bad = ScaleReference.fromEllipse(tilted(200, 60), STICKER);

    expect(ScaleReference.scalesAreComparable(good, bad)).toBe(false);
    expect(ScaleReference.scalesAreComparable(good, null)).toBe(false);
  });
});

describe('what the user is told', () => {
  it('explains each refusal with something to change', () => {
    expect(ScaleReference.explain('reference_too_tilted')).toMatch(
      /angle|square/i,
    );
    expect(ScaleReference.explain('reference_too_small')).toMatch(
      /closer|small/i,
    );
  });

  it('never reports a measurement in a refusal', () => {
    const forbidden = /\b\d+(\.\d+)?\s?mm\b/i;

    for (const reason of [
      'reference_too_tilted',
      'reference_too_small',
      'other',
    ]) {
      expect(ScaleReference.explain(reason)).not.toMatch(forbidden);
    }
  });
});

describe('the reference table', () => {
  it('carries a real diameter for every entry', () => {
    for (const [key, ref] of Object.entries(ScaleReference.REFERENCES)) {
      expect(typeof ref.diameterMm).toBe('number');
      expect(ref.diameterMm).toBeGreaterThan(5);
      expect(ref.diameterMm).toBeLessThan(50);
      expect(ref.label.length).toBeGreaterThan(0);
      expect(key).toBe(key.toUpperCase());
    }
  });
});
