import { PKUnits } from '../../types';

/**
 * Phase 4 — Centralized PK unit registry (spec §18).
 *
 * The engine distinguishes numeric calculation from unit presentation.
 * Units are NEVER silently converted — if the user selects incompatible
 * units, the engine returns the value in the user's chosen unit and the
 * UI displays it as-is.
 *
 * Spec §18: "If unit conversion exists, centralize it in a reusable utility."
 *
 * This module provides:
 *   - the canonical set of supported time / concentration / dose units
 *   - a label helper for display ("h" → "hours")
 *   - a derived-unit helper for AUC (concentration × time) and CL (volume / time)
 *
 * No unit conversion factors are defined here. If a future phase needs
 * actual conversion (e.g. mg/L → µg/mL), it should be added as an
 * explicit, tested function rather than a silent multiplier.
 */

export type UnitCategory = 'time' | 'concentration' | 'dose';

export interface UnitDefinition {
  symbol: string;
  displayName: string;
  category: UnitCategory;
}

export const TIME_UNITS: UnitDefinition[] = [
  { symbol: 'h', displayName: 'Hours', category: 'time' },
  { symbol: 'min', displayName: 'Minutes', category: 'time' },
  { symbol: 'day', displayName: 'Days', category: 'time' },
  { symbol: 's', displayName: 'Seconds', category: 'time' },
];

export const CONCENTRATION_UNITS: UnitDefinition[] = [
  { symbol: 'mg/L', displayName: 'Milligrams per liter', category: 'concentration' },
  { symbol: 'µg/mL', displayName: 'Micrograms per milliliter', category: 'concentration' },
  { symbol: 'ng/mL', displayName: 'Nanograms per milliliter', category: 'concentration' },
  { symbol: 'µg/L', displayName: 'Micrograms per liter', category: 'concentration' },
  { symbol: 'mg/dL', displayName: 'Milligrams per deciliter', category: 'concentration' },
];

export const DOSE_UNITS: UnitDefinition[] = [
  { symbol: 'mg', displayName: 'Milligrams', category: 'dose' },
  { symbol: 'g', displayName: 'Grams', category: 'dose' },
  { symbol: 'µg', displayName: 'Micrograms', category: 'dose' },
  { symbol: 'mg/kg', displayName: 'Milligrams per kilogram body weight', category: 'dose' },
];

/**
 * Returns the human-readable display name for a unit symbol, or the symbol
 * itself if the unit is not in the registry (defensive — user may have
 * typed a custom unit).
 */
export function unitDisplayName(symbol: string, category: UnitCategory): string {
  const registry =
    category === 'time'
      ? TIME_UNITS
      : category === 'concentration'
      ? CONCENTRATION_UNITS
      : DOSE_UNITS;
  const entry = registry.find((u) => u.symbol === symbol);
  return entry ? entry.displayName : symbol;
}

/**
 * Returns true if a unit symbol is recognized in the registry.
 * Used by validation to warn (not block) on unrecognized units.
 */
export function isKnownUnit(symbol: string, category: UnitCategory): boolean {
  const registry =
    category === 'time'
      ? TIME_UNITS
      : category === 'concentration'
      ? CONCENTRATION_UNITS
      : DOSE_UNITS;
  return registry.some((u) => u.symbol === symbol);
}

/**
 * Composes a derived-unit label string for display.
 * AUC units are concentration × time (e.g. "mg/L·h").
 * CL units are volume / time (e.g. "L/h"). Volume units are inferred
 * from the concentration unit's numerator (mg/L → L, µg/mL → mL, etc.)
 * — this is a presentation heuristic, not a conversion.
 */
export function deriveAUCUnitLabel(units: PKUnits): string {
  return `${units.concentration}·${units.time}`;
}

export function deriveClearanceUnitLabel(units: PKUnits): string {
  // Infer the volume unit from the concentration unit's denominator.
  // This is a display heuristic only — the engine never converts.
  const conc = units.concentration;
  let volumeUnit = 'L';
  if (conc.endsWith('/mL')) volumeUnit = 'mL';
  else if (conc.endsWith('/dL')) volumeUnit = 'dL';
  else if (conc.endsWith('/L')) volumeUnit = 'L';
  return `${volumeUnit}/${units.time}`;
}

export function deriveVdUnitLabel(units: PKUnits): string {
  const conc = units.concentration;
  if (conc.endsWith('/mL')) return 'mL';
  if (conc.endsWith('/dL')) return 'dL';
  return 'L';
}

/**
 * Default units used when the caller does not specify any.
 */
export const DEFAULT_PK_UNITS: PKUnits = {
  time: 'h',
  concentration: 'mg/L',
  dose: 'mg',
};
