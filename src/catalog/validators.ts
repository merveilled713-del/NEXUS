import { CARD_CATALOG } from './cards';
import { FAMILIES } from './families';
import {
  FAMILY_IDS,
  FAMILY_SPECIAL_CATEGORIES,
  NUMERIC_VALUES,
  UNIVERSAL_SPECIAL_CATEGORIES,
  type CardModel,
  type FamilyDefinition,
  type FamilyId,
  type NumericValue,
} from './types';

export interface CatalogValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function isValidFamilyId(value: unknown): value is FamilyId {
  return typeof value === 'string' && (FAMILY_IDS as readonly string[]).includes(value);
}

export function isValidNumericValue(value: unknown): value is NumericValue {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9
  );
}

export function validateCatalog(
  catalog: readonly CardModel[] = CARD_CATALOG,
  families: readonly FamilyDefinition[] = FAMILIES,
): CatalogValidationResult {
  const errors: string[] = [];

  if (families.length !== 6) {
    errors.push(`Expected 6 families, found ${families.length}`);
  }
  const familyIdsSeen = families.map((f) => f.id);
  if (new Set(familyIdsSeen).size !== families.length) {
    errors.push('Duplicate family IDs detected');
  }
  for (const expectedId of FAMILY_IDS) {
    if (!familyIdsSeen.includes(expectedId)) {
      errors.push(`Missing official family ${expectedId}`);
    }
  }

  if (catalog.length !== 80) {
    errors.push(`Expected 80 catalog variants, found ${catalog.length}`);
  }

  const seenVariantIds = new Set<string>();
  const numericModels = catalog.filter((m) => m.kind === 'NUMERIC');
  const familySpecialModels = catalog.filter((m) => m.kind === 'FAMILY_SPECIAL');
  const universalSpecialModels = catalog.filter((m) => m.kind === 'UNIVERSAL_SPECIAL');

  if (numericModels.length !== 60) {
    errors.push(`Expected 60 numeric models, found ${numericModels.length}`);
  }
  if (familySpecialModels.length !== 18) {
    errors.push(`Expected 18 family special models, found ${familySpecialModels.length}`);
  }
  if (universalSpecialModels.length !== 2) {
    errors.push(`Expected 2 universal special models, found ${universalSpecialModels.length}`);
  }

  for (const model of catalog) {
    if (seenVariantIds.has(model.variantId)) {
      errors.push(`Duplicate variantId: ${model.variantId}`);
    }
    seenVariantIds.add(model.variantId);

    const expectedVariantId =
      model.kind === 'NUMERIC'
        ? `${model.family}_${model.value}`
        : model.kind === 'FAMILY_SPECIAL'
          ? `${model.family}_${model.specialCategory}`
          : `UNIVERSAL_${model.specialCategory}`;

    if (model.variantId !== expectedVariantId) {
      errors.push(
        `VariantId mismatch on ${model.variantId}: expected ${expectedVariantId}`,
      );
    }

    const orientationDeg: number = model.cornerBadge.orientationDeg;
    if (orientationDeg !== 0) {
      errors.push(`Invalid orientationDeg on ${model.variantId}: ${orientationDeg}`);
    }

    if (model.kind === 'NUMERIC') {
      if (!isValidFamilyId(model.family)) {
        errors.push(`Invalid family on numeric card ${model.variantId}`);
      }
      if (!isValidNumericValue(model.value)) {
        errors.push(`Out-of-range numeric value on ${model.variantId}: ${String(model.value)}`);
      }
      if (model.cornerBadge.kind !== 'NUMERIC' || model.cornerBadge.value !== model.value) {
        errors.push(`Corner badge mismatch on ${model.variantId}`);
      }
      if (
        model.topRightMedallion.kind !== 'FAMILY_EMBLEM' ||
        model.topRightMedallion.family !== model.family
      ) {
        errors.push(`Invalid topRightMedallion on numeric card ${model.variantId}`);
      }
      if (
        model.bottomRightMedallion.kind !== 'FAMILY_MARKER' ||
        model.bottomRightMedallion.family !== model.family
      ) {
        errors.push(`Invalid bottomRightMedallion on numeric card ${model.variantId}`);
      }
      if ((model.bottomRightMedallion.kind as string) === 'LOOP') {
        errors.push(`Numeric card ${model.variantId} must never carry LOOP icon`);
      }
      if (model.pointValue !== model.value) {
        errors.push(`Invalid pointValue on numeric card ${model.variantId}`);
      }
    } else if (model.kind === 'FAMILY_SPECIAL') {
      if (!isValidFamilyId(model.family)) {
        errors.push(`Invalid family on family special ${model.variantId}`);
      }
      if ((model.cornerBadge.kind as string) === 'NUMERIC') {
        errors.push(`Special card ${model.variantId} must not carry numeric corner badge`);
      }
      if (
        model.topRightMedallion.kind !== 'FAMILY_EMBLEM' ||
        model.topRightMedallion.family !== model.family
      ) {
        errors.push(`Invalid topRightMedallion on family special ${model.variantId}`);
      }
      const familyPoints: number = model.pointValue;
      if (familyPoints !== 20) {
        errors.push(`Expected 20 points on family special ${model.variantId}`);
      }
      if (
        model.specialCategory === 'IMPULSION' &&
        (model.cornerBadge.symbol !== '+2' || model.bottomRightMedallion.kind !== 'IMPULSION_ICON')
      ) {
        errors.push(`Invalid badge/medallion mapping on IMPULSION ${model.variantId}`);
      }
      if (
        model.specialCategory === 'INVERSION' &&
        (model.cornerBadge.symbol !== 'LOOP' || model.bottomRightMedallion.kind !== 'LOOP')
      ) {
        errors.push(`Invalid badge/medallion mapping on INVERSION ${model.variantId}`);
      }
      if (
        model.specialCategory === 'BOUCLIER' &&
        (model.cornerBadge.symbol !== 'LOCK' || model.bottomRightMedallion.kind !== 'LOCK_ICON')
      ) {
        errors.push(`Invalid badge/medallion mapping on BOUCLIER ${model.variantId}`);
      }
    } else if (model.kind === 'UNIVERSAL_SPECIAL') {
      const universalFamily: unknown = model.family;
      if (universalFamily !== null) {
        errors.push(`Universal special ${model.variantId} must have family === null`);
      }
      if ((model.cornerBadge.kind as string) === 'NUMERIC') {
        errors.push(`Universal card ${model.variantId} must not carry numeric corner badge`);
      }
      if (model.topRightMedallion.kind !== 'NEXUS_STAR') {
        errors.push(`Universal card ${model.variantId} must carry NEXUS_STAR topRightMedallion`);
      }
      const universalPoints: number = model.pointValue;
      if (universalPoints !== 50) {
        errors.push(`Expected 50 points on universal special ${model.variantId}`);
      }
      if (
        model.specialCategory === 'SURCHARGE' &&
        (model.cornerBadge.symbol !== '+4' ||
          model.bottomRightMedallion.kind !== 'SURCHARGE_PICKER_ICON')
      ) {
        errors.push(`Invalid badge/medallion mapping on SURCHARGE ${model.variantId}`);
      }
      if (
        model.specialCategory === 'PORTAIL' &&
        (model.cornerBadge.symbol !== 'INFINITY' ||
          model.bottomRightMedallion.kind !== 'PORTAL_RING_ICON')
      ) {
        errors.push(`Invalid badge/medallion mapping on PORTAIL ${model.variantId}`);
      }
    }
  }

  for (const family of FAMILY_IDS) {
    for (const value of NUMERIC_VALUES) {
      const id = `${family}_${value}`;
      if (!seenVariantIds.has(id)) {
        errors.push(`Missing numeric variant ${id}`);
      }
    }
    for (const special of FAMILY_SPECIAL_CATEGORIES) {
      const id = `${family}_${special}`;
      if (!seenVariantIds.has(id)) {
        errors.push(`Missing family special variant ${id}`);
      }
    }
  }
  for (const universal of UNIVERSAL_SPECIAL_CATEGORIES) {
    const id = `UNIVERSAL_${universal}`;
    if (!seenVariantIds.has(id)) {
      errors.push(`Missing universal special variant ${id}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
