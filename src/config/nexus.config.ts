import {
  FAMILY_IDS,
  FAMILY_SPECIAL_CATEGORIES,
  NUMERIC_VALUES,
  UNIVERSAL_SPECIAL_CATEGORIES,
  type CardInstance,
  type FamilySpecialCategory,
  type NumericValue,
  type UniversalSpecialCategory,
} from '../catalog/types';

export const BATCH_COMPLETION_TIMEOUT_MS = 1500 as const;

export interface NexusGameConfig {
  readonly deckQuantities: {
    readonly numericPerFamily: Readonly<Record<NumericValue, number>>;
    readonly familySpecialsPerFamily: Readonly<Record<FamilySpecialCategory, number>>;
    readonly universalSpecials: Readonly<Record<UniversalSpecialCategory, number>>;
  };
  readonly match: {
    readonly minPlayers: number;
    readonly maxPlayers: number;
    readonly initialHandSize: number;
    readonly firstDiscardMustBeNumeric: boolean;
    readonly turnTimeoutSecondsMulti: number;
    readonly reconnectGraceSeconds: number;
  };
  readonly rules: {
    readonly allowAttackStacking: boolean;
    readonly drawCountWhenUnplayable: number;
    readonly allowPlayDrawnCardImmediately: boolean;
    readonly allowVoluntaryDraw: boolean;
    readonly twoPlayerInversionActsAsSkip: boolean;
    readonly requireNexusDeclaration: boolean;
    readonly missedNexusPenalty: number;
  };
  readonly scoring: {
    readonly familySpecialPoints: 20;
    readonly universalSpecialPoints: 50;
  };
  readonly animation: {
    readonly batchCompletionTimeoutMs: number;
  };
}

export const NEXUS_DEFAULT_CONFIG: NexusGameConfig = Object.freeze({
  deckQuantities: Object.freeze({
    numericPerFamily: Object.freeze({
      0: 1,
      1: 2,
      2: 2,
      3: 2,
      4: 2,
      5: 2,
      6: 2,
      7: 2,
      8: 2,
      9: 2,
    }),
    familySpecialsPerFamily: Object.freeze({
      IMPULSION: 2,
      INVERSION: 2,
      BOUCLIER: 2,
    }),
    universalSpecials: Object.freeze({
      SURCHARGE: 4,
      PORTAIL: 4,
    }),
  }),
  match: Object.freeze({
    minPlayers: 2,
    maxPlayers: 6,
    initialHandSize: 7,
    firstDiscardMustBeNumeric: true,
    turnTimeoutSecondsMulti: 45,
    reconnectGraceSeconds: 60,
  }),
  rules: Object.freeze({
    allowAttackStacking: false,
    drawCountWhenUnplayable: 1,
    allowPlayDrawnCardImmediately: true,
    allowVoluntaryDraw: false,
    twoPlayerInversionActsAsSkip: true,
    requireNexusDeclaration: true,
    missedNexusPenalty: 2,
  }),
  scoring: Object.freeze({
    familySpecialPoints: 20,
    universalSpecialPoints: 50,
  }),
  animation: Object.freeze({
    batchCompletionTimeoutMs: BATCH_COMPLETION_TIMEOUT_MS,
  }),
});

export interface DeckValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly totalCards: number;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export function validateDeckConfig(config: NexusGameConfig): DeckValidationResult {
  const errors: string[] = [];
  const { numericPerFamily, familySpecialsPerFamily, universalSpecials } =
    config.deckQuantities;

  const numericKeys = Object.keys(numericPerFamily);
  const expectedNumericKeys = NUMERIC_VALUES.map((v) => String(v));

  for (const key of numericKeys) {
    if (!expectedNumericKeys.includes(key)) {
      errors.push(`Invalid numeric key in deckQuantities.numericPerFamily: "${key}"`);
    }
  }

  let numericPerFamilyCount = 0;
  for (const value of NUMERIC_VALUES) {
    const qty = (numericPerFamily as Record<number, unknown>)[value];
    if (qty === undefined) {
      errors.push(`Missing numeric key ${value} in deckQuantities.numericPerFamily`);
    } else if (!isNonNegativeInteger(qty)) {
      errors.push(
        `Invalid quantity for numeric value ${value}: ${String(qty)} (must be integer >= 0)`,
      );
    } else {
      numericPerFamilyCount += qty;
    }
  }

  let specialPerFamilyCount = 0;
  for (const category of FAMILY_SPECIAL_CATEGORIES) {
    const qty = (familySpecialsPerFamily as Record<string, unknown>)[category];
    if (qty === undefined) {
      errors.push(`Missing key ${category} in deckQuantities.familySpecialsPerFamily`);
    } else if (!isNonNegativeInteger(qty)) {
      errors.push(
        `Invalid quantity for family special ${category}: ${String(qty)} (must be integer >= 0)`,
      );
    } else {
      specialPerFamilyCount += qty;
    }
  }

  let universalCount = 0;
  for (const category of UNIVERSAL_SPECIAL_CATEGORIES) {
    const qty = (universalSpecials as Record<string, unknown>)[category];
    if (qty === undefined) {
      errors.push(`Missing key ${category} in deckQuantities.universalSpecials`);
    } else if (!isNonNegativeInteger(qty)) {
      errors.push(
        `Invalid quantity for universal special ${category}: ${String(qty)} (must be integer >= 0)`,
      );
    } else {
      universalCount += qty;
    }
  }

  const totalNumericCards = numericPerFamilyCount * FAMILY_IDS.length;
  const totalCards =
    totalNumericCards + specialPerFamilyCount * FAMILY_IDS.length + universalCount;

  const minRequiredForMaxPlayers =
    config.match.maxPlayers * config.match.initialHandSize + 1;
  if (errors.length === 0) {
    if (config.match.firstDiscardMustBeNumeric && totalNumericCards < 1) {
      errors.push('Deck must contain at least 1 numeric card for initial discard');
    }
    if (totalCards < minRequiredForMaxPlayers) {
      errors.push(
        `Deck size (${totalCards}) is insufficient for ${config.match.maxPlayers} players × ${config.match.initialHandSize} cards + 1 initial discard (${minRequiredForMaxPlayers})`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalCards: errors.length === 0 ? totalCards : 0,
  };
}

export function calculateDeckSize(config: NexusGameConfig): number {
  const validation = validateDeckConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid deck configuration: ${validation.errors.join('; ')}`);
  }
  return validation.totalCards;
}

export function buildDeck(config: NexusGameConfig): CardInstance[] {
  const validation = validateDeckConfig(config);
  if (!validation.valid) {
    throw new Error(`Cannot build deck with invalid configuration: ${validation.errors.join('; ')}`);
  }

  const instances: CardInstance[] = [];
  let seq = 1;

  for (const family of FAMILY_IDS) {
    for (const value of NUMERIC_VALUES) {
      const qty = config.deckQuantities.numericPerFamily[value];
      for (let copy = 0; copy < qty; copy += 1) {
        instances.push({
          instanceId: `card_${seq++}_${family}_${value}_${copy + 1}`,
          variantId: `${family}_${value}`,
        });
      }
    }

    for (const category of FAMILY_SPECIAL_CATEGORIES) {
      const qty = config.deckQuantities.familySpecialsPerFamily[category];
      for (let copy = 0; copy < qty; copy += 1) {
        instances.push({
          instanceId: `card_${seq++}_${family}_${category}_${copy + 1}`,
          variantId: `${family}_${category}`,
        });
      }
    }
  }

  for (const category of UNIVERSAL_SPECIAL_CATEGORIES) {
    const qty = config.deckQuantities.universalSpecials[category];
    for (let copy = 0; copy < qty; copy += 1) {
      instances.push({
        instanceId: `card_${seq++}_UNIVERSAL_${category}_${copy + 1}`,
        variantId: `UNIVERSAL_${category}`,
      });
    }
  }

  return instances;
}
