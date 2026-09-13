/**
 * Constants only. Nothing in this package keeps state: settings are passed to
 * each call, and these are the values used when a caller passes none.
 *
 * `exact` means the object is round, so an ellipse fitted to it has the
 * published diameter as its major axis. A polygon (the 12-sided £1, the
 * seven-sided 20p) does not fit an ellipse exactly, so its scale is rougher.
 * Diameters are the issuers' published figures.
 */

const reference = (label, diameterMm, exact) =>
  Object.freeze({label, diameterMm, exact});

export const DEFAULT_REFERENCES = Object.freeze({
  STICKER_10MM: reference('10mm calibration sticker', 10, true),
  // Royal Mint: 12-sided, 23.43 mm.
  GBP_1: reference('UK £1', 23.43, false),
  GBP_2: reference('UK £2', 28.4, true),
  // Royal Mint: seven-sided equal-width curve, 21.4 mm.
  GBP_20P: reference('UK 20p', 21.4, false),
  EUR_1: reference('€1', 23.25, true),
  EUR_2: reference('€2', 25.75, true),
  USD_QUARTER: reference('US quarter', 24.26, true),
  USD_PENNY: reference('US penny', 19.05, true),
});

export const DEFAULT_OPTIONS = Object.freeze({
  maxTiltDegrees: 30,
  minReferencePixels: 40,
});
