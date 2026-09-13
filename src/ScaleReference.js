import {DEFAULT_OPTIONS, DEFAULT_REFERENCES} from './defaults';

/**
 * Turning pixels into millimetres, given something of known size in the frame.
 *
 * Scale comes from the major axis alone: a circle photographed off-perpendicular
 * projects to an ellipse whose major axis keeps the true diameter.
 *
 * Stateless: every method is a pure function of its arguments. Settings are
 * passed per call; there is no global configuration to change.
 */
export default class ScaleReference {
  /** Known reference objects (frozen). Pass any diameter you like instead. */
  static REFERENCES = DEFAULT_REFERENCES;

  static MAX_TILT_DEGREES = DEFAULT_OPTIONS.maxTiltDegrees;

  static MIN_REFERENCE_PIXELS = DEFAULT_OPTIONS.minReferencePixels;

  /**
   * Scale from a detected reference.
   *
   * @param {{majorAxisPx: number, minorAxisPx: number}} ellipse
   * @param {number} diameterMm
   * @param {{maxTiltDegrees?: number, minReferencePixels?: number}} [options]
   *   defaults in DEFAULT_OPTIONS
   * @returns {{mmPerPixel: number, tiltDegrees: number, usable: boolean, reason: string|null}|null}
   * @throws {TypeError} for an unknown option or one that is not a positive number
   */
  static fromEllipse(ellipse, diameterMm, options) {
    const {maxTiltDegrees, minReferencePixels} = ScaleReference._options(options);
    const major = ScaleReference._positive(ellipse && ellipse.majorAxisPx);
    const minor = ScaleReference._positive(ellipse && ellipse.minorAxisPx);
    const mm = ScaleReference._positive(diameterMm);

    if (!major || !minor || !mm) {
      return null;
    }

    const longAxis = Math.max(major, minor);
    const shortAxis = Math.min(major, minor);

    const mmPerPixel = mm / longAxis;
    const tiltDegrees =
      (Math.acos(Math.min(1, shortAxis / longAxis)) * 180) / Math.PI;

    let reason = null;
    if (longAxis < minReferencePixels) {
      reason = 'reference_too_small';
    } else if (tiltDegrees > maxTiltDegrees) {
      reason = 'reference_too_tilted';
    }

    return {
      mmPerPixel,
      tiltDegrees,
      usable: reason === null,
      reason,
    };
  }

  /**
   * An estimate, not a measurement. The 0.1 mm rounding is for display; the
   * real error is larger (tilt, reference not level with the subject, lens
   * distortion, detection), see "Limits" in the README.
   *
   * @param {number} pixels
   * @param {Object} scale - a result from fromEllipse
   * @returns {number|null} millimetres, rounded to 0.1mm
   */
  static toMillimetres(pixels, scale) {
    const px = ScaleReference._positive(pixels);
    if (!px || !scale || !scale.usable || !scale.mmPerPixel) {
      return null;
    }
    return Math.round(px * scale.mmPerPixel * 10) / 10;
  }

  /**
   * Convert a pixel area to square millimetres (scale factor squared).
   */
  static toSquareMillimetres(pixelArea, scale) {
    const area = ScaleReference._positive(pixelArea);
    if (!area || !scale || !scale.usable || !scale.mmPerPixel) {
      return null;
    }
    return Math.round(area * scale.mmPerPixel * scale.mmPerPixel * 10) / 10;
  }

  /**
   * Whether two measurements were taken at close enough scales to compare.
   */
  static scalesAreComparable(a, b, tolerance = 0.25) {
    if (!a || !b || !a.usable || !b.usable) {
      return false;
    }
    const larger = Math.max(a.mmPerPixel, b.mmPerPixel);
    const smaller = Math.min(a.mmPerPixel, b.mmPerPixel);
    if (!larger) {
      return false;
    }
    return (larger - smaller) / larger <= tolerance;
  }

  /**
   * A plain English explanation of a refusal.
   *
   * @param {string} reason - `reason` from fromEllipse
   * @param {Object<string, string>} [messages] - your own text (for example a
   *   translation) keyed by reason; `default` covers any other reason
   */
  static explain(reason, messages) {
    if (messages && typeof messages[reason] === 'string') {
      return messages[reason];
    }
    if (messages && typeof messages.default === 'string') {
      return messages.default;
    }
    switch (reason) {
      case 'reference_too_small':
        return 'The reference object is too small in the photo to measure from. Move closer, or place it nearer the subject.';
      case 'reference_too_tilted':
        return 'The reference object is at too much of an angle. Hold the camera square to the subject so the object looks round rather than oval.';
      default:
        return 'This photo cannot be measured. Place a reference object flat beside the subject and take it square on.';
    }
  }

  static _options(options) {
    if (options === undefined || options === null) {
      return DEFAULT_OPTIONS;
    }
    for (const key of Object.keys(options)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key)) {
        throw new TypeError(`Unknown ScaleReference option "${key}"`);
      }
      const value = options[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new TypeError(`ScaleReference option "${key}" must be a positive number`);
      }
    }
    return {...DEFAULT_OPTIONS, ...options};
  }

  static _positive(value) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
}
