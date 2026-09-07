/**
 * Runtime configuration for @molecare/scale-reference.
 * REFERENCES catalog is injectable so apps can add/remove known objects.
 */

export const DEFAULT_REFERENCES = Object.freeze({
  STICKER_10MM: {
    label: '10mm calibration sticker',
    diameterMm: 10,
    exact: true,
  },
  GBP_1: {label: 'UK £1', diameterMm: 23.03, exact: true},
  GBP_2: {label: 'UK £2', diameterMm: 28.4, exact: true},
  GBP_20P: {label: 'UK 20p', diameterMm: 21.4, exact: true},
  EUR_1: {label: '€1', diameterMm: 23.25, exact: true},
  EUR_2: {label: '€2', diameterMm: 25.75, exact: true},
  USD_QUARTER: {label: 'US quarter', diameterMm: 24.26, exact: true},
  USD_PENNY: {label: 'US penny', diameterMm: 19.05, exact: true},
});

const DEFAULTS = Object.freeze({
  maxTiltDegrees: 30,
  minReferencePixels: 40,
  references: DEFAULT_REFERENCES,
});

let config = {
  maxTiltDegrees: DEFAULTS.maxTiltDegrees,
  minReferencePixels: DEFAULTS.minReferencePixels,
  references: {...DEFAULT_REFERENCES},
};

export function configure(partial = {}) {
  config = {
    maxTiltDegrees:
      partial.maxTiltDegrees !== undefined
        ? partial.maxTiltDegrees
        : config.maxTiltDegrees,
    minReferencePixels:
      partial.minReferencePixels !== undefined
        ? partial.minReferencePixels
        : config.minReferencePixels,
    references:
      partial.references !== undefined
        ? {...partial.references}
        : config.references,
  };
  return getConfig();
}

export function getConfig() {
  return {
    maxTiltDegrees: config.maxTiltDegrees,
    minReferencePixels: config.minReferencePixels,
    references: {...config.references},
  };
}

export function resetConfig() {
  config = {
    maxTiltDegrees: DEFAULTS.maxTiltDegrees,
    minReferencePixels: DEFAULTS.minReferencePixels,
    references: {...DEFAULT_REFERENCES},
  };
}
