/**
 * Turning pixels into millimetres, given something of known size in the frame.
 *
 * Scale comes from the major axis alone: a circle photographed off-perpendicular
 * projects to an ellipse whose major axis keeps the true diameter.
 *
 * Every function here is pure. Settings are passed per call; the package keeps
 * no state and has no global configuration.
 */

/** An ellipse fitted around the reference object by your detector. */
export interface Ellipse {
  majorAxisPx: number;
  minorAxisPx: number;
}

export interface ScaleOptions {
  /** Refuse a reference tilted more than this many degrees. Default 30. */
  maxTiltDegrees?: number;
  /** Refuse a reference whose long axis is shorter than this many pixels. Default 40. */
  minReferencePixels?: number;
}

export const DEFAULT_OPTIONS: Readonly<Required<ScaleOptions>> = Object.freeze({
  maxTiltDegrees: 30,
  minReferencePixels: 40,
});

/** Why a scale cannot be used. */
export type RefusalReason =
  'invalid_input' | 'reference_too_small' | 'reference_too_tilted';

/**
 * The result of scaleFromEllipse. Check `usable` before using the numbers:
 * TypeScript narrows `mmPerPixel` to a number only when it is true.
 */
export type Scale =
  | {
      readonly usable: true;
      readonly reason: null;
      readonly mmPerPixel: number;
      readonly tiltDegrees: number;
    }
  | {
      readonly usable: false;
      readonly reason: RefusalReason;
      /** null when the input could not be read at all */
      readonly mmPerPixel: number | null;
      readonly tiltDegrees: number | null;
    };

export interface ComparableOptions {
  /** Largest relative difference in mm per pixel still comparable. Default 0.25. */
  tolerance?: number;
}

/** Your own text (for example a translation) keyed by reason; `default` covers any other. */
export type Messages = Partial<Record<RefusalReason | 'default', string>>;

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;

function resolveOptions(
  options: ScaleOptions | undefined
): Required<ScaleOptions> {
  if (options === undefined) {
    return DEFAULT_OPTIONS;
  }
  // The types rule this out, but JavaScript callers are not type-checked.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (options === null || typeof options !== 'object') {
    throw new TypeError('scale-reference options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key)) {
      throw new TypeError(`Unknown scale-reference option "${key}"`);
    }
    if (positive((options as Record<string, unknown>)[key]) === null) {
      throw new TypeError(
        `scale-reference option "${key}" must be a positive number`
      );
    }
  }
  return { ...DEFAULT_OPTIONS, ...options };
}

/**
 * Scale from a detected reference.
 *
 * Never throws for the measurement itself: unreadable input, including no
 * ellipse at all (nothing detected), comes back as
 * `{usable: false, reason: 'invalid_input'}`. It throws a TypeError only for
 * an unknown or invalid option, which is a programming error.
 */
export function scaleFromEllipse(
  ellipse: Ellipse | null | undefined,
  diameterMm: number,
  options?: ScaleOptions
): Scale {
  const { maxTiltDegrees, minReferencePixels } = resolveOptions(options);
  const major = positive(ellipse?.majorAxisPx);
  const minor = positive(ellipse?.minorAxisPx);
  const mm = positive(diameterMm);

  if (major === null || minor === null || mm === null) {
    return Object.freeze({
      usable: false,
      reason: 'invalid_input',
      mmPerPixel: null,
      tiltDegrees: null,
    });
  }

  const longAxis = Math.max(major, minor);
  const shortAxis = Math.min(major, minor);
  const mmPerPixel = mm / longAxis;
  const tiltDegrees =
    (Math.acos(Math.min(1, shortAxis / longAxis)) * 180) / Math.PI;

  if (longAxis < minReferencePixels) {
    return Object.freeze({
      usable: false,
      reason: 'reference_too_small',
      mmPerPixel,
      tiltDegrees,
    });
  }
  if (tiltDegrees > maxTiltDegrees) {
    return Object.freeze({
      usable: false,
      reason: 'reference_too_tilted',
      mmPerPixel,
      tiltDegrees,
    });
  }
  return Object.freeze({ usable: true, reason: null, mmPerPixel, tiltDegrees });
}

/**
 * An estimate, not a measurement. Rounded to 0.1 mm for display; the real
 * error is larger (tilt, reference not level with the subject, lens distortion,
 * detection). Returns null when the scale is not usable or the length is not a
 * positive number.
 */
export function toMillimetres(
  pixels: number,
  scale: Scale | null | undefined
): number | null {
  const px = positive(pixels);
  if (px === null || !scale?.usable) {
    return null;
  }
  return Math.round(px * scale.mmPerPixel * 10) / 10;
}

/** A pixel area in square millimetres (the scale factor squared), rounded to 0.1. */
export function toSquareMillimetres(
  pixelArea: number,
  scale: Scale | null | undefined
): number | null {
  const area = positive(pixelArea);
  if (area === null || !scale?.usable) {
    return null;
  }
  return Math.round(area * scale.mmPerPixel * scale.mmPerPixel * 10) / 10;
}

/**
 * Whether two photos were taken at close enough scales to compare sizes.
 * An unusable or missing scale is never comparable.
 */
export function scalesAreComparable(
  a: Scale | null | undefined,
  b: Scale | null | undefined,
  options: ComparableOptions = {}
): boolean {
  const { tolerance = 0.25, ...unknown } = options;
  const [extra] = Object.keys(unknown);
  if (extra !== undefined) {
    throw new TypeError(`Unknown scale-reference option "${extra}"`);
  }
  if (
    typeof tolerance !== 'number' ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    tolerance >= 1
  ) {
    throw new TypeError(
      'scale-reference option "tolerance" must be a number from 0 up to 1'
    );
  }
  if (!a?.usable || !b?.usable) {
    return false;
  }
  const larger = Math.max(a.mmPerPixel, b.mmPerPixel);
  const smaller = Math.min(a.mmPerPixel, b.mmPerPixel);
  return (larger - smaller) / larger <= tolerance;
}

const ENGLISH: Readonly<Record<RefusalReason | 'default', string>> =
  Object.freeze({
    reference_too_small:
      'The reference object is too small in the photo to measure from. Move closer, or place it nearer the subject.',
    reference_too_tilted:
      'The reference object is at too much of an angle. Hold the camera square to the subject so the object looks round rather than oval.',
    invalid_input:
      'This photo cannot be measured. Place a reference object flat beside the subject and take it square on.',
    default:
      'This photo cannot be measured. Place a reference object flat beside the subject and take it square on.',
  });

/** A plain explanation of a refusal, in English or in the text you pass. */
export function explainRefusal(
  reason: RefusalReason | null | undefined,
  messages?: Messages
): string {
  const key = reason ?? 'default';
  return (
    messages?.[key] ??
    messages?.default ??
    (Object.prototype.hasOwnProperty.call(ENGLISH, key)
      ? ENGLISH[key]
      : ENGLISH.default)
  );
}
