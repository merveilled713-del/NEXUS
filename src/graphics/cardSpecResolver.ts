import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import type { CardModel, CardVariantId, SpecialCornerSymbol } from '../catalog/types';
import { getArtworkAsset } from './artworkRegistry';
import { getThemeForFamily } from './familyThemes';
import type { ArtworkAssetKey, CardVisualSpec, CornerInsertSpec } from './graphicsTypes';

function formatSpecialCornerLabel(symbol: SpecialCornerSymbol): string {
  switch (symbol) {
    case '+2':
      return '+2';
    case '+4':
      return '+4';
    case 'LOOP':
      return 'LOOP';
    case 'LOCK':
      return 'LOCK';
    case 'INFINITY':
      return '∞';
  }
}

function buildCornerInsert(model: CardModel): CornerInsertSpec {
  const { cornerBadge } = model;
  if (cornerBadge.kind === 'NUMERIC') {
    const label = String(cornerBadge.value);
    return Object.freeze({
      kind: 'NUMERIC',
      value: cornerBadge.value,
      label,
      orientationDeg: cornerBadge.orientationDeg,
      contentKey: `NUMERIC:${label}`,
    });
  }

  return Object.freeze({
    kind: 'SPECIAL',
    symbol: cornerBadge.symbol,
    label: formatSpecialCornerLabel(cornerBadge.symbol),
    orientationDeg: cornerBadge.orientationDeg,
    contentKey: `SPECIAL:${cornerBadge.symbol}`,
  });
}

export function resolveArtworkKeyForModel(model: CardModel): ArtworkAssetKey {
  if (model.kind === 'FAMILY_SPECIAL') {
    return `FAMILY_${model.family}_${model.specialCategory}`;
  }
  return model.artworkKey;
}

export function resolveCardVisualSpec(variantId: CardVariantId): CardVisualSpec {
  const model = CARD_CATALOG_BY_ID[variantId];
  const theme = getThemeForFamily(model.family);
  const cornerInsert = buildCornerInsert(model);

  return Object.freeze({
    variantId: model.variantId,
    kind: model.kind,
    family: model.family,
    themeKey: theme.themeKey,
    theme,
    headerLabel: model.headerLabel,
    topLeftInsert: cornerInsert,
    bottomLeftInsert: cornerInsert,
    topRightMedallion: model.topRightMedallion,
    bottomRightMedallion: model.bottomRightMedallion,
    artwork: getArtworkAsset(resolveArtworkKeyForModel(model)),
    pointValue: model.pointValue,
  });
}
