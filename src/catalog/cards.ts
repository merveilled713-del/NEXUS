import {
  FAMILY_IDS,
  FAMILY_SPECIAL_CATEGORIES,
  NUMERIC_VALUES,
  type CardModel,
  type CardVariantId,
  type FamilySpecialCardModel,
  type FamilySpecialCategory,
  type NumericCardModel,
  type UniversalSpecialCardModel,
} from './types';

function createFamilySpecialModel(
  family: (typeof FAMILY_IDS)[number],
  category: FamilySpecialCategory,
): FamilySpecialCardModel {
  switch (category) {
    case 'IMPULSION':
      return Object.freeze({
        variantId: `${family}_IMPULSION`,
        kind: 'FAMILY_SPECIAL',
        family,
        specialCategory: 'IMPULSION',
        cornerBadge: Object.freeze({
          kind: 'SPECIAL',
          symbol: '+2',
          orientationDeg: 0,
        }),
        topRightMedallion: Object.freeze({
          kind: 'FAMILY_EMBLEM',
          family,
        }),
        bottomRightMedallion: Object.freeze({
          kind: 'IMPULSION_ICON',
        }),
        pointValue: 20,
        headerLabel: 'IMPULSION',
        artworkKey: 'POWER_IMPULSION',
      });
    case 'INVERSION':
      return Object.freeze({
        variantId: `${family}_INVERSION`,
        kind: 'FAMILY_SPECIAL',
        family,
        specialCategory: 'INVERSION',
        cornerBadge: Object.freeze({
          kind: 'SPECIAL',
          symbol: 'LOOP',
          orientationDeg: 0,
        }),
        topRightMedallion: Object.freeze({
          kind: 'FAMILY_EMBLEM',
          family,
        }),
        bottomRightMedallion: Object.freeze({
          kind: 'LOOP',
        }),
        pointValue: 20,
        headerLabel: 'INVERSION',
        artworkKey: 'POWER_INVERSION',
      });
    case 'BOUCLIER':
      return Object.freeze({
        variantId: `${family}_BOUCLIER`,
        kind: 'FAMILY_SPECIAL',
        family,
        specialCategory: 'BOUCLIER',
        cornerBadge: Object.freeze({
          kind: 'SPECIAL',
          symbol: 'LOCK',
          orientationDeg: 0,
        }),
        topRightMedallion: Object.freeze({
          kind: 'FAMILY_EMBLEM',
          family,
        }),
        bottomRightMedallion: Object.freeze({
          kind: 'LOCK_ICON',
        }),
        pointValue: 20,
        headerLabel: 'BOUCLIER',
        artworkKey: 'POWER_BOUCLIER',
      });
  }
}

export const NUMERIC_CARD_MODELS: readonly NumericCardModel[] = Object.freeze(
  FAMILY_IDS.flatMap((family) =>
    NUMERIC_VALUES.map((value) =>
      Object.freeze({
        variantId: `${family}_${value}`,
        kind: 'NUMERIC',
        family,
        value,
        cornerBadge: Object.freeze({
          kind: 'NUMERIC',
          value,
          orientationDeg: 0,
        }),
        topRightMedallion: Object.freeze({
          kind: 'FAMILY_EMBLEM',
          family,
        }),
        bottomRightMedallion: Object.freeze({
          kind: 'FAMILY_MARKER',
          family,
        }),
        pointValue: value,
        headerLabel: 'NEXUS',
        artworkKey: `FAMILY_${family}`,
      }),
    ),
  ),
);

export const FAMILY_SPECIAL_CARD_MODELS: readonly FamilySpecialCardModel[] =
  Object.freeze(
    FAMILY_IDS.flatMap((family) =>
      FAMILY_SPECIAL_CATEGORIES.map((category) =>
        createFamilySpecialModel(family, category),
      ),
    ),
  );

export const UNIVERSAL_SPECIAL_CARD_MODELS: readonly UniversalSpecialCardModel[] =
  Object.freeze([
    Object.freeze({
      variantId: 'UNIVERSAL_SURCHARGE',
      kind: 'UNIVERSAL_SPECIAL',
      family: null,
      specialCategory: 'SURCHARGE',
      cornerBadge: Object.freeze({
        kind: 'SPECIAL',
        symbol: '+4',
        orientationDeg: 0,
      }),
      topRightMedallion: Object.freeze({
        kind: 'NEXUS_STAR',
      }),
      bottomRightMedallion: Object.freeze({
        kind: 'SURCHARGE_PICKER_ICON',
      }),
      pointValue: 50,
      headerLabel: 'SURCHARGE',
      artworkKey: 'POWER_SURCHARGE',
    }),
    Object.freeze({
      variantId: 'UNIVERSAL_PORTAIL',
      kind: 'UNIVERSAL_SPECIAL',
      family: null,
      specialCategory: 'PORTAIL',
      cornerBadge: Object.freeze({
        kind: 'SPECIAL',
        symbol: 'INFINITY',
        orientationDeg: 0,
      }),
      topRightMedallion: Object.freeze({
        kind: 'NEXUS_STAR',
      }),
      bottomRightMedallion: Object.freeze({
        kind: 'PORTAL_RING_ICON',
      }),
      pointValue: 50,
      headerLabel: 'PORTAIL',
      artworkKey: 'POWER_PORTAIL',
    }),
  ]);

export const CARD_CATALOG: readonly CardModel[] = Object.freeze([
  ...NUMERIC_CARD_MODELS,
  ...FAMILY_SPECIAL_CARD_MODELS,
  ...UNIVERSAL_SPECIAL_CARD_MODELS,
]);

export const CARD_CATALOG_BY_ID: Readonly<Record<CardVariantId, CardModel>> =
  Object.freeze(
    CARD_CATALOG.reduce(
      (acc, model) => {
        acc[model.variantId] = model;
        return acc;
      },
      {} as Record<CardVariantId, CardModel>,
    ),
  );
