import type {
  BottomRightMedallion,
  CardModel,
  CardVariantId,
  FamilyId,
  FamilySpecialCategory,
  NumericValue,
  SpecialCornerSymbol,
  TopRightMedallion,
} from '../catalog/types';

export type ThemeKey = FamilyId | 'UNIVERSAL';

export type FamilySpecialArtworkKey = `FAMILY_${FamilyId}_${FamilySpecialCategory}`;

export type ArtworkAssetKey =
  | CardModel['artworkKey']
  | FamilySpecialArtworkKey
  | 'CARD_BACK';

export type FamilyPatternId =
  | 'SOLAR_RAYS'
  | 'EMBER_CHEVRONS'
  | 'WAVE_ARCS'
  | 'ECLIPSE_RINGS'
  | 'VOLT_GRID'
  | 'PRISM_FACETS'
  | 'NEXUS_PRISM';

export interface FamilyVisualTheme {
  readonly themeKey: ThemeKey;
  readonly displayName: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly chassisPrimary: string;
  readonly chassisSecondary: string;
  readonly chassisDark: string;
  readonly accentHighlight: string;
  readonly glowColor: string;
  readonly patternId: FamilyPatternId;
}

export interface ArtworkAssetEntry {
  readonly key: ArtworkAssetKey;
  readonly publicPath: string;
  readonly diskRelativePath: string;
  readonly alt: string;
  readonly fallbackGradient: string;
}

export type CornerInsertSpec =
  | {
      readonly kind: 'NUMERIC';
      readonly value: NumericValue;
      readonly label: string;
      readonly orientationDeg: 0;
      readonly contentKey: string;
    }
  | {
      readonly kind: 'SPECIAL';
      readonly symbol: SpecialCornerSymbol;
      readonly label: string;
      readonly orientationDeg: 0;
      readonly contentKey: string;
    };

export interface RectBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
}

export interface CircleBounds {
  readonly cx: number;
  readonly cy: number;
  readonly outerRadius: number;
  readonly innerRadius: number;
}

export interface CardGeometryMetrics {
  readonly viewBoxWidth: 1024;
  readonly viewBoxHeight: 1536;
  readonly aspectRatio: number;
  readonly outerFrame: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  readonly headerCartouche: RectBounds;
  readonly topLeftInsert: RectBounds & { readonly chamfer: number };
  readonly bottomLeftInsert: RectBounds & { readonly chamfer: number };
  readonly topRightMedallion: CircleBounds;
  readonly bottomRightMedallion: CircleBounds;
}

/**
 * Calibrated directly against the 1024x1536 NEXUS V2 master reference image.
 * Enforces exact vertical mirror symmetry around y = 768 while preserving V2 zone proportions.
 */
export const CARD_GEOMETRY: CardGeometryMetrics = Object.freeze({
  viewBoxWidth: 1024,
  viewBoxHeight: 1536,
  aspectRatio: 2 / 3,
  outerFrame: Object.freeze({
    left: 20,
    right: 1004,
    top: 20,
    bottom: 1516,
  }),
  headerCartouche: Object.freeze({
    x: 320,
    y: 44,
    width: 384,
    height: 66,
    cx: 512,
    cy: 77,
  }),
  topLeftInsert: Object.freeze({
    x: 36,
    y: 42,
    width: 272,
    height: 244,
    cx: 172,
    cy: 164,
    chamfer: 46,
  }),
  bottomLeftInsert: Object.freeze({
    x: 36,
    y: 1250,
    width: 272,
    height: 244,
    cx: 172,
    cy: 1372,
    chamfer: 46,
  }),
  topRightMedallion: Object.freeze({
    cx: 862,
    cy: 164,
    outerRadius: 114,
    innerRadius: 90,
  }),
  bottomRightMedallion: Object.freeze({
    cx: 862,
    cy: 1372,
    outerRadius: 114,
    innerRadius: 90,
  }),
});

export interface CardVisualSpec {
  readonly variantId: CardVariantId;
  readonly kind: CardModel['kind'];
  readonly family: FamilyId | null;
  readonly themeKey: ThemeKey;
  readonly theme: FamilyVisualTheme;
  readonly headerLabel: CardModel['headerLabel'];
  readonly topLeftInsert: CornerInsertSpec;
  readonly bottomLeftInsert: CornerInsertSpec;
  readonly topRightMedallion: TopRightMedallion;
  readonly bottomRightMedallion: BottomRightMedallion;
  readonly artwork: ArtworkAssetEntry;
  readonly pointValue: CardModel['pointValue'];
}

export interface CardRenderOptions {
  readonly glowEnabled?: boolean;
  readonly playable?: boolean;
  readonly selected?: boolean;
  readonly dimmed?: boolean;
  readonly interactive?: boolean;
  readonly showPointsHint?: boolean;
  readonly className?: string;
}
