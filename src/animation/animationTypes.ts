import type { FamilyId } from '../catalog/types';
import type { AnimationLevel } from '../types/app';

export type AnimationEffectKind =
  | 'DEAL_HAND'
  | 'CARD_PLAY_FAMILY'
  | 'CARD_DRAW'
  | 'IMPULSION_STRIKE'
  | 'SURCHARGE_OVERLOAD'
  | 'INVERSION_LOOP'
  | 'BOUCLIER_LOCK'
  | 'PORTAL_RESONANCE'
  | 'NEXUS_CALL'
  | 'NEXUS_PENALTY'
  | 'VICTORY_PULSE';

export type FamilyPatternStyle =
  | 'SOLAR_RAYS'
  | 'EMBER_SURGE'
  | 'HARMONIC_WAVES'
  | 'ECLIPSE_VORTEX'
  | 'VOLT_DISCHARGE'
  | 'PRISM_FACETS';

export interface FamilyAnimationVisualSpec {
  readonly family: FamilyId;
  readonly label: string;
  readonly patternStyle: FamilyPatternStyle;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly particleCountFull: number;
  readonly particleCountReduced: number;
  readonly ringCountFull: number;
  readonly ringCountReduced: number;
}

export interface AnimationStep {
  readonly id: string;
  readonly kind: AnimationEffectKind;
  readonly family: FamilyId | null;
  readonly sourcePlayerId: string | null;
  readonly targetPlayerId: string | null;
  readonly durationMs: number;
  readonly label: string;
  readonly level: Exclude<AnimationLevel, 'OFF'>;
  readonly familyVisual: FamilyAnimationVisualSpec | null;
}

export interface AnimationPlaybackState {
  readonly level: AnimationLevel;
  readonly activeStep: AnimationStep | null;
  readonly queueLength: number;
}
