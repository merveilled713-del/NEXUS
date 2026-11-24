/**
 * NEXUS — Official Catalog Types (Étape 1)
 * Strictly enforces 6 ASCII families, numeric values 0-9, 5 special categories,
 * Option A single-function cards, Option 2 medallions, and 0-degree symmetric corners.
 */

export const FAMILY_IDS = [
  'AUBE',
  'BRAISE',
  'ONDE',
  'OMBRE',
  'ECLAIR',
  'CRISTAL',
] as const;

export type FamilyId = (typeof FAMILY_IDS)[number];

export const NUMERIC_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type NumericValue = (typeof NUMERIC_VALUES)[number];

export const FAMILY_SPECIAL_CATEGORIES = [
  'IMPULSION',
  'INVERSION',
  'BOUCLIER',
] as const;
export type FamilySpecialCategory = (typeof FAMILY_SPECIAL_CATEGORIES)[number];

export const UNIVERSAL_SPECIAL_CATEGORIES = [
  'SURCHARGE',
  'PORTAIL',
] as const;
export type UniversalSpecialCategory = (typeof UNIVERSAL_SPECIAL_CATEGORIES)[number];

export type SpecialCategory = FamilySpecialCategory | UniversalSpecialCategory;

export type SpecialCornerSymbol = '+2' | '+4' | 'LOOP' | 'LOCK' | 'INFINITY';

export type CornerBadge =
  | {
      readonly kind: 'NUMERIC';
      readonly value: NumericValue;
      readonly orientationDeg: 0;
    }
  | {
      readonly kind: 'SPECIAL';
      readonly symbol: SpecialCornerSymbol;
      readonly orientationDeg: 0;
    };

export type TopRightMedallion =
  | { readonly kind: 'FAMILY_EMBLEM'; readonly family: FamilyId }
  | { readonly kind: 'NEXUS_STAR' };

export type BottomRightMedallion =
  | { readonly kind: 'FAMILY_MARKER'; readonly family: FamilyId }
  | { readonly kind: 'IMPULSION_ICON' }
  | { readonly kind: 'LOOP' }
  | { readonly kind: 'LOCK_ICON' }
  | { readonly kind: 'SURCHARGE_PICKER_ICON' }
  | { readonly kind: 'PORTAL_RING_ICON' };

export type NumericVariantId = `${FamilyId}_${NumericValue}`;
export type FamilySpecialVariantId = `${FamilyId}_${FamilySpecialCategory}`;
export type UniversalSpecialVariantId = `UNIVERSAL_${UniversalSpecialCategory}`;
export type CardVariantId =
  | NumericVariantId
  | FamilySpecialVariantId
  | UniversalSpecialVariantId;

export interface NumericCardModel {
  readonly variantId: NumericVariantId;
  readonly kind: 'NUMERIC';
  readonly family: FamilyId;
  readonly value: NumericValue;
  readonly cornerBadge: {
    readonly kind: 'NUMERIC';
    readonly value: NumericValue;
    readonly orientationDeg: 0;
  };
  readonly topRightMedallion: {
    readonly kind: 'FAMILY_EMBLEM';
    readonly family: FamilyId;
  };
  readonly bottomRightMedallion: {
    readonly kind: 'FAMILY_MARKER';
    readonly family: FamilyId;
  };
  readonly pointValue: NumericValue;
  readonly headerLabel: 'NEXUS';
  readonly artworkKey: `FAMILY_${FamilyId}`;
}

export interface FamilySpecialCardModel {
  readonly variantId: FamilySpecialVariantId;
  readonly kind: 'FAMILY_SPECIAL';
  readonly family: FamilyId;
  readonly specialCategory: FamilySpecialCategory;
  readonly cornerBadge: {
    readonly kind: 'SPECIAL';
    readonly symbol: '+2' | 'LOOP' | 'LOCK';
    readonly orientationDeg: 0;
  };
  readonly topRightMedallion: {
    readonly kind: 'FAMILY_EMBLEM';
    readonly family: FamilyId;
  };
  readonly bottomRightMedallion:
    | { readonly kind: 'IMPULSION_ICON' }
    | { readonly kind: 'LOOP' }
    | { readonly kind: 'LOCK_ICON' };
  readonly pointValue: 20;
  readonly headerLabel: FamilySpecialCategory;
  readonly artworkKey: `POWER_${FamilySpecialCategory}`;
}

export interface UniversalSpecialCardModel {
  readonly variantId: UniversalSpecialVariantId;
  readonly kind: 'UNIVERSAL_SPECIAL';
  readonly family: null;
  readonly specialCategory: UniversalSpecialCategory;
  readonly cornerBadge: {
    readonly kind: 'SPECIAL';
    readonly symbol: '+4' | 'INFINITY';
    readonly orientationDeg: 0;
  };
  readonly topRightMedallion: {
    readonly kind: 'NEXUS_STAR';
  };
  readonly bottomRightMedallion:
    | { readonly kind: 'SURCHARGE_PICKER_ICON' }
    | { readonly kind: 'PORTAL_RING_ICON' };
  readonly pointValue: 50;
  readonly headerLabel: UniversalSpecialCategory;
  readonly artworkKey: `POWER_${UniversalSpecialCategory}`;
}

export type CardModel =
  | NumericCardModel
  | FamilySpecialCardModel
  | UniversalSpecialCardModel;

export interface CardInstance {
  readonly instanceId: string;
  readonly variantId: CardVariantId;
}

export interface FamilyDefinition {
  readonly id: FamilyId;
  readonly displayName: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly chassisAlloy: string;
  readonly emblemName: string;
  readonly masterArtworkKey: `FAMILY_${FamilyId}`;
}
