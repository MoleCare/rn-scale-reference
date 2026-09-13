import {getConfig} from './config';

/**
 * Turning pixels into millimetres, given something of known size in the frame.
 *
 * Scale comes from the major axis alone: a circle photographed off-perpendicular
 * projects to an ellipse whose major axis keeps the true diameter.
 */
export default class ScaleReference {
  /**
   * Diameters in millimetres of known reference objects.
   * Override the whole catalog via configure({ references }).
   */
  static get REFERENCES() {
    return getConfig().references;
  }

  static get MAX_TILT_DEGREES() {
    return getConfig().maxTiltDegrees;
  }

  static get MIN_REFERENCE_PIXELS() {
    return getConfig().minReferencePixels;
  }

  /**
   * Scale from a detected reference.
   *
   * @param {{majorAxisPx: number, minorAxisPx: number}} ellipse
   * @param {number} diameterMm
   * @returns {{mmPerPixel: number, tiltDegrees: number, usable: boolean, reason: string|null}|null}
   */
  static fromEllipse(ellipse, diameterMm) {
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
    if (longAxis < ScaleReference.MIN_REFERENCE_PIXELS) {
      reason = 'reference_too_small';
    } else if (tiltDegrees > ScaleReference.MAX_TILT_DEGREES) {
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

  static explain(reason) {
    switch (reason) {
      case 'reference_too_small':
        return 'The reference object is too small in the photo to measure from. Move closer, or place it nearer the subject.';
      case 'reference_too_tilted':
        return 'The reference object is at too much of an angle. Hold the camera square to the subject so the object looks round rather than oval.';
      default:
        return 'This photo cannot be measured. Place a reference object flat beside the subject and take it square on.';
    }
  }

  static _positive(value) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
}
