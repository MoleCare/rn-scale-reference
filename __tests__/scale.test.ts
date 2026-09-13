import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DEFAULT_OPTIONS,
  REFERENCE_OBJECTS,
  explainRefusal,
  scaleFromEllipse,
  scalesAreComparable,
  toMillimetres,
  toSquareMillimetres,
  type Ellipse,
  type Scale,
} from '../src';

const STICKER = REFERENCE_OBJECTS.STICKER_10MM.diameterMm; // 10 mm

/** A reference photographed square on: both axes equal. */
const flat = (px: number): Ellipse => ({ majorAxisPx: px, minorAxisPx: px });

/** A reference tilted by `deg`: the minor axis shortens by cos(deg). */
const tilted = (px: number, deg: number): Ellipse => ({
  majorAxisPx: px,
  minorAxisPx: px * Math.cos((deg * Math.PI) / 180),
});

/** The numbers of a scale the test expects to be usable. */
function usable(scale: Scale) {
  if (!scale.usable) {
    throw new Error(`expected a usable scale, got ${scale.reason}`);
  }
  return scale;
}

describe('scale from a reference', () => {
  it('derives millimetres per pixel from a flat reference', () => {
    // A 10 mm sticker spanning 200 px is 0.05 mm per pixel.
    const scale = usable(scaleFromEllipse(flat(200), STICKER));

    expect(scale.mmPerPixel).toBeCloseTo(0.05, 6);
    expect(scale.tiltDegrees).toBeCloseTo(0, 4);
    expect(scale.reason).toBeNull();
  });

  it('takes scale from the major axis, which tilt does not foreshorten', () => {
    // A circle seen at an angle projects to an ellipse whose major axis still
    // spans the true diameter; the minor axis is shortened by cos(tilt). Using
    // the minor axis, or the average, under-reads the reference and so
    // over-reads everything measured against it.
    const square = usable(scaleFromEllipse(flat(200), STICKER));
    const angled = usable(scaleFromEllipse(tilted(200, 25), STICKER));

    expect(angled.mmPerPixel).toBeCloseTo(square.mmPerPixel, 6);
  });

  it('would over-report a size if it averaged the axes', () => {
    const scale = scaleFromEllipse(tilted(200, 30), STICKER);
    const lengthPx = 120; // 6.0 mm at the correct scale

    const correct = toMillimetres(lengthPx, scale);
    const ifAveraged =
      (lengthPx * STICKER) / ((200 + 200 * Math.cos(Math.PI / 6)) / 2);

    expect(correct).toBeCloseTo(6.0, 1);
    expect(ifAveraged).toBeGreaterThan(6.4);
  });

  it('recovers the tilt angle', () => {
    expect(scaleFromEllipse(tilted(200, 20), STICKER).tiltDegrees).toBeCloseTo(
      20,
      1
    );
    expect(scaleFromEllipse(tilted(200, 45), STICKER).tiltDegrees).toBeCloseTo(
      45,
      1
    );
  });

  it('does not care which axis the detector reports first', () => {
    // 200 × 180 is a 25.8° tilt, inside the default 30° limit.
    const a = usable(
      scaleFromEllipse({ majorAxisPx: 200, minorAxisPx: 180 }, STICKER)
    );
    const b = usable(
      scaleFromEllipse({ majorAxisPx: 180, minorAxisPx: 200 }, STICKER)
    );

    expect(a.mmPerPixel).toBeCloseTo(b.mmPerPixel, 8);
    expect(a.tiltDegrees).toBeCloseTo(b.tiltDegrees, 6);
  });

  it('works from any known reference, not just the sticker', () => {
    const coin = REFERENCE_OBJECTS.GBP_2.diameterMm; // 28.4 mm
    expect(usable(scaleFromEllipse(flat(284), coin)).mmPerPixel).toBeCloseTo(
      0.1,
      6
    );
  });

  it('returns a frozen result', () => {
    const scale = scaleFromEllipse(flat(200), STICKER);
    expect(Object.isFrozen(scale)).toBe(true);
  });
});

describe('refusing to measure', () => {
  it('refuses a reference too tilted to describe with one scale', () => {
    expect(scaleFromEllipse(tilted(200, 45), STICKER)).toMatchObject({
      usable: false,
      reason: 'reference_too_tilted',
    });
  });

  it('refuses a reference too small for the pixels to mean anything', () => {
    expect(scaleFromEllipse(flat(20), STICKER)).toMatchObject({
      usable: false,
      reason: 'reference_too_small',
    });
  });

  it('gives no length or area from an unusable scale', () => {
    // A measurement from a bad reference is worse than none, because it looks
    // like a measurement.
    const bad = scaleFromEllipse(tilted(200, 60), STICKER);

    expect(toMillimetres(120, bad)).toBeNull();
    expect(toSquareMillimetres(4000, bad)).toBeNull();
  });

  it('names unreadable input instead of returning null or NaN', () => {
    const invalid = {
      usable: false,
      reason: 'invalid_input',
      mmPerPixel: null,
      tiltDegrees: null,
    };
    expect(scaleFromEllipse(null, STICKER)).toEqual(invalid);
    expect(toMillimetres(120, null)).toBeNull();
    expect(scaleFromEllipse(flat(200), 0)).toEqual(invalid);
    expect(
      scaleFromEllipse({ majorAxisPx: -5, minorAxisPx: 5 }, STICKER)
    ).toEqual(invalid);
    expect(scaleFromEllipse(flat(Number.NaN), STICKER)).toEqual(invalid);
    // Strings are not numbers, even numeric ones.
    expect(scaleFromEllipse(flat('200' as unknown as number), STICKER)).toEqual(
      invalid
    );
  });

  it('gives no length for a nonsense length', () => {
    const scale = scaleFromEllipse(flat(200), STICKER);
    expect(toMillimetres(Number.NaN, scale)).toBeNull();
    expect(toMillimetres(-3, scale)).toBeNull();
    expect(toSquareMillimetres(0, scale)).toBeNull();
  });
});

describe('area', () => {
  it('squares the scale factor', () => {
    // Applying mmPerPixel once would under-report area by that factor again.
    const scale = scaleFromEllipse(flat(200), STICKER); // 0.05 mm/px

    // 400 px² at 0.05 mm/px is 400 * 0.0025 = 1.0 mm²
    expect(toSquareMillimetres(400, scale)).toBeCloseTo(1.0, 1);
  });
});

describe('comparing two measured photos', () => {
  it('accepts photos taken at similar distances', () => {
    expect(
      scalesAreComparable(
        scaleFromEllipse(flat(200), STICKER),
        scaleFromEllipse(flat(210), STICKER)
      )
    ).toBe(true);
  });

  it('refuses photos whose pixel resolution differs too much', () => {
    const near = scaleFromEllipse(flat(300), STICKER);
    const far = scaleFromEllipse(flat(120), STICKER);

    expect(scalesAreComparable(near, far)).toBe(false);
    expect(scalesAreComparable(near, far, { tolerance: 0.7 })).toBe(true);
  });

  it('treats an unusable or missing scale as not comparable, never as a match', () => {
    const good = scaleFromEllipse(flat(200), STICKER);
    const bad = scaleFromEllipse(tilted(200, 60), STICKER);

    expect(scalesAreComparable(good, bad)).toBe(false);
    expect(scalesAreComparable(good, null)).toBe(false);
    expect(scalesAreComparable(undefined, good)).toBe(false);
  });

  it('refuses a meaningless tolerance', () => {
    const s = scaleFromEllipse(flat(200), STICKER);
    expect(() => scalesAreComparable(s, s, { tolerance: 1 })).toThrow(
      TypeError
    );
    expect(() => scalesAreComparable(s, s, { tolerance: -0.1 })).toThrow(
      TypeError
    );
    expect(() =>
      scalesAreComparable(s, s, { tolernce: 0.1 } as { tolerance?: number })
    ).toThrow(/tolernce/);
  });
});

describe('what the user is told', () => {
  it('explains each refusal with something to change', () => {
    expect(explainRefusal('reference_too_tilted')).toMatch(/angle|square/i);
    expect(explainRefusal('reference_too_small')).toMatch(/closer|small/i);
    expect(explainRefusal('invalid_input')).toMatch(/cannot be measured/);
  });

  it('never reports a measurement in a refusal', () => {
    const forbidden = /\b\d+(\.\d+)?\s?mm\b/i;
    for (const reason of [
      'reference_too_tilted',
      'reference_too_small',
      'invalid_input',
      null,
    ] as const) {
      expect(explainRefusal(reason)).not.toMatch(forbidden);
    }
  });

  it('uses the text the caller gives, with a default', () => {
    const messages = {
      reference_too_small: 'Trop petit.',
      default: 'Impossible.',
    };

    expect(explainRefusal('reference_too_small', messages)).toBe('Trop petit.');
    expect(explainRefusal('reference_too_tilted', messages)).toBe(
      'Impossible.'
    );
    expect(explainRefusal('reference_too_small')).toMatch(/too small/);
  });

  it('falls back to the general English text for a reason it does not know', () => {
    // Only reachable from JavaScript, or from a newer caller on an older package.
    expect(explainRefusal('not_a_reason' as never)).toBe(explainRefusal(null));
  });
});

describe('the reference table', () => {
  it('carries a real diameter for every entry', () => {
    for (const [key, ref] of Object.entries(REFERENCE_OBJECTS)) {
      expect(ref.diameterMm).toBeGreaterThan(5);
      expect(ref.diameterMm).toBeLessThan(50);
      expect(ref.label.length).toBeGreaterThan(0);
      expect(key).toBe(key.toUpperCase());
    }
  });

  it('uses the Royal Mint sizes, and calls only round objects exact', () => {
    expect(REFERENCE_OBJECTS.GBP_1).toMatchObject({
      diameterMm: 23.43,
      exact: false,
    });
    expect(REFERENCE_OBJECTS.GBP_20P).toMatchObject({
      diameterMm: 21.4,
      exact: false,
    });
    for (const key of [
      'STICKER_10MM',
      'GBP_2',
      'EUR_1',
      'EUR_2',
      'USD_QUARTER',
      'USD_PENNY',
    ] as const) {
      expect(REFERENCE_OBJECTS[key].exact).toBe(true);
    }
  });
});

describe('no state: settings go with each call', () => {
  it('uses the options of one call without changing the next', () => {
    // A 30 px sticker is refused by default (40 px minimum).
    expect(
      scaleFromEllipse(flat(30), STICKER, { minReferencePixels: 20 }).usable
    ).toBe(true);
    expect(scaleFromEllipse(flat(30), STICKER).reason).toBe(
      'reference_too_small'
    );
  });

  it('lets a caller choose its own tilt limit', () => {
    expect(
      scaleFromEllipse(tilted(200, 25), STICKER, { maxTiltDegrees: 20 }).reason
    ).toBe('reference_too_tilted');
    expect(scaleFromEllipse(tilted(200, 25), STICKER).usable).toBe(true);
  });

  it('refuses a mistyped or meaningless option instead of ignoring it', () => {
    expect(() =>
      scaleFromEllipse(flat(200), STICKER, { maxTilt: 10 } as never)
    ).toThrow(/maxTilt/);
    expect(() =>
      scaleFromEllipse(flat(200), STICKER, { minReferencePixels: 0 })
    ).toThrow(TypeError);
    expect(() =>
      scaleFromEllipse(flat(200), STICKER, {
        maxTiltDegrees: '30' as unknown as number,
      })
    ).toThrow(TypeError);
    for (const notAnObject of [null, 30, 'strict']) {
      expect(() =>
        scaleFromEllipse(flat(200), STICKER, notAnObject as never)
      ).toThrow(/must be an object/);
    }
  });

  it('freezes every shared constant', () => {
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
    expect(Object.isFrozen(REFERENCE_OBJECTS)).toBe(true);
    for (const ref of Object.values(REFERENCE_OBJECTS)) {
      expect(Object.isFrozen(ref)).toBe(true);
    }
  });

  it('has no module-level variables in its source', () => {
    const srcDir = path.join(__dirname, '..', 'src');
    for (const file of fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith('.ts'))) {
      const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
      expect([file, /^(export\s+)?(let|var)\s/m.test(source)]).toEqual([
        file,
        false,
      ]);
    }
  });
});
