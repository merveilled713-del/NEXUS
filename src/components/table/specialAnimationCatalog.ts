import { CARD_CATALOG_BY_ID } from '../../catalog/cards';
import { FAMILIES_BY_ID } from '../../catalog/families';
import {
  FAMILY_IDS,
  type CardVariantId,
  type FamilyId,
  type FamilySpecialCategory,
} from '../../catalog/types';
import type { GameEvent } from '../../engine/gameTypes';
import { resolveCardVisualSpec } from '../../graphics';
import type { AnimationLevel } from '../../types/app';

export type SpecialSignatureId =
  | `${FamilyId}_${FamilySpecialCategory}`
  | 'UNIVERSAL_SURCHARGE'
  | 'UNIVERSAL_PORTAIL';

export interface SpecialSignatureDefinition {
  readonly id: SpecialSignatureId;
  readonly category: 'FAMILY_SPECIAL' | 'UNIVERSAL_SPECIAL';
  readonly family: FamilyId | null;
  readonly power: FamilySpecialCategory | 'SURCHARGE' | 'PORTAIL';
  readonly variantId: CardVariantId;
  readonly title: string;
  readonly motifName: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly accentColor: string;
  readonly durationFullMs: number;
  readonly durationReducedMs: number;
}

const FAMILY_POWER_TITLES: Readonly<
  Record<
    FamilyId,
    Readonly<Record<FamilySpecialCategory, { readonly title: string; readonly motif: string }>>
  >
> = {
  AUBE: {
    IMPULSION: { title: 'Dard Solaire', motif: 'SOLAR_LANCE' },
    INVERSION: { title: 'Couronne Inversée', motif: 'SOLAR_CROWN_FLIP' },
    BOUCLIER: { title: 'Égide Héliocentrique', motif: 'SOLAR_AEGIS' },
  },
  BRAISE: {
    IMPULSION: { title: 'Salve Incandescente', motif: 'EMBER_SURGE_STRIKE' },
    INVERSION: { title: 'Spirale de Magma', motif: 'EMBER_MAGMA_SPIRAL' },
    BOUCLIER: { title: 'Dôme de Forge', motif: 'EMBER_FORGE_WARD' },
  },
  ONDE: {
    IMPULSION: { title: 'Lame Harmonique', motif: 'WAVE_CREST_SURGE' },
    INVERSION: { title: 'Double Vortex Fluide', motif: 'WAVE_DOUBLE_HELIX' },
    BOUCLIER: { title: 'Barrière Laminaire', motif: 'WAVE_INTERFERENCE_WALL' },
  },
  OMBRE: {
    IMPULSION: { title: 'Fracture d’Éclipse', motif: 'SHADOW_RIFT_LANCE' },
    INVERSION: { title: 'Anneau Contrarotatif', motif: 'SHADOW_ECLIPSE_REVERSE' },
    BOUCLIER: { title: 'Sceau Gravitationnel', motif: 'SHADOW_GRAVITY_SEAL' },
  },
  ECLAIR: {
    IMPULSION: { title: 'Arc Haute Tension', motif: 'VOLT_BRANCH_STRIKE' },
    INVERSION: { title: 'Boucle Magnétique', motif: 'VOLT_POLARITY_LOOP' },
    BOUCLIER: { title: 'Cage de Faraday', motif: 'VOLT_FARADAY_CAGE' },
  },
  CRISTAL: {
    IMPULSION: { title: 'Salve Prismatique', motif: 'PRISM_SHARD_VOLLEY' },
    INVERSION: { title: 'Octaèdre Réfractant', motif: 'PRISM_OCTAHEDRON_FLIP' },
    BOUCLIER: { title: 'Rempart Polyédrique', motif: 'PRISM_POLYHEDRON_WARD' },
  },
};

const FAMILY_SPECIAL_CATEGORIES: readonly FamilySpecialCategory[] = [
  'IMPULSION',
  'INVERSION',
  'BOUCLIER',
];

function buildSpecialSignatureRegistry(): Readonly<
  Record<SpecialSignatureId, SpecialSignatureDefinition>
> {
  const entries: Partial<Record<SpecialSignatureId, SpecialSignatureDefinition>> = {};

  for (const family of FAMILY_IDS) {
    const famDef = FAMILIES_BY_ID[family];
    for (const power of FAMILY_SPECIAL_CATEGORIES) {
      const id = `${family}_${power}` as SpecialSignatureId;
      const variantId = `${family}_${power}` as CardVariantId;
      const spec = resolveCardVisualSpec(variantId);
      const info = FAMILY_POWER_TITLES[family][power];

      entries[id] = Object.freeze({
        id,
        category: 'FAMILY_SPECIAL',
        family,
        power,
        variantId,
        title: `${famDef.displayName} · ${info.title}`,
        motifName: info.motif,
        primaryColor: spec.theme.primaryColor,
        secondaryColor: spec.theme.secondaryColor,
        accentColor: spec.theme.accentHighlight,
        durationFullMs: power === 'IMPULSION' ? 760 : power === 'INVERSION' ? 740 : 720,
        durationReducedMs: 360,
      });
    }
  }

  const surchargeSpec = resolveCardVisualSpec('UNIVERSAL_SURCHARGE');
  entries.UNIVERSAL_SURCHARGE = Object.freeze({
    id: 'UNIVERSAL_SURCHARGE',
    category: 'UNIVERSAL_SPECIAL',
    family: null,
    power: 'SURCHARGE',
    variantId: 'UNIVERSAL_SURCHARGE',
    title: 'Surcharge Universelle +4',
    motifName: 'UNIVERSAL_QUAD_OVERLOAD',
    primaryColor: '#F43F5E',
    secondaryColor: surchargeSpec.theme.secondaryColor,
    accentColor: '#FEF3C7',
    durationFullMs: 840,
    durationReducedMs: 400,
  });

  const portailSpec = resolveCardVisualSpec('UNIVERSAL_PORTAIL');
  entries.UNIVERSAL_PORTAIL = Object.freeze({
    id: 'UNIVERSAL_PORTAIL',
    category: 'UNIVERSAL_SPECIAL',
    family: null,
    power: 'PORTAIL',
    variantId: 'UNIVERSAL_PORTAIL',
    title: 'Ouverture Portail ∞',
    motifName: 'UNIVERSAL_DIMENSIONAL_GATE',
    primaryColor: '#38BDF8',
    secondaryColor: portailSpec.theme.secondaryColor,
    accentColor: '#FFFFFF',
    durationFullMs: 860,
    durationReducedMs: 420,
  });

  return Object.freeze(
    entries as Record<SpecialSignatureId, SpecialSignatureDefinition>,
  );
}

export const SPECIAL_SIGNATURE_REGISTRY = buildSpecialSignatureRegistry();

export function getAllSpecialSignatures(): readonly SpecialSignatureDefinition[] {
  return Object.values(SPECIAL_SIGNATURE_REGISTRY);
}

export interface CardFlightSpec {
  readonly id: string;
  readonly kind: 'PLAY' | 'DRAW';
  readonly variantId: CardVariantId | 'CARD_BACK';
  readonly sourcePlayerId: string | null;
  readonly targetPlayerId: string | null;
  readonly isNumeric: boolean;
  readonly family: FamilyId | null;
  readonly durationMs: number;
}

export interface ActiveSpecialChoreography {
  readonly id: string;
  readonly signature: SpecialSignatureDefinition;
  readonly chosenFamily: FamilyId | null;
  readonly sourcePlayerId: string | null;
  readonly targetPlayerId: string | null;
  readonly level: Exclude<AnimationLevel, 'OFF'>;
  readonly durationMs: number;
  readonly penaltyCount: number | null;
}

export interface TableEventChoreography {
  readonly flights: readonly CardFlightSpec[];
  readonly specials: readonly ActiveSpecialChoreography[];
  readonly numericPulseFamily: FamilyId | null;
}

export function extractTableChoreography(
  events: readonly GameEvent[],
  level: AnimationLevel,
): TableEventChoreography {
  if (level === 'OFF' || events.length === 0) {
    return {
      flights: [],
      specials: [],
      numericPulseFamily: null,
    };
  }

  const flights: CardFlightSpec[] = [];
  const specials: ActiveSpecialChoreography[] = [];
  let numericPulseFamily: FamilyId | null = null;

  const penaltyEvent = events.find((e) => e.type === 'ATTACK_PENALTY_APPLIED');
  const skipEvent = events.find((e) => e.type === 'PLAYER_SKIPPED');

  for (const event of events) {
    if (event.type === 'CARD_PLAYED') {
      const model = CARD_CATALOG_BY_ID[event.payload.card.variantId];
      const isNumeric = model.kind === 'NUMERIC';

      flights.push({
        id: `${event.eventId}-flight-play`,
        kind: 'PLAY',
        variantId: model.variantId,
        sourcePlayerId: event.payload.playerId,
        targetPlayerId: null,
        isNumeric,
        family: model.family,
        durationMs: level === 'REDUCED' ? 180 : 340,
      });

      if (isNumeric && model.family !== null) {
        numericPulseFamily = model.family;
      } else if (model.kind === 'FAMILY_SPECIAL') {
        const sigId = `${model.family}_${model.specialCategory}` as SpecialSignatureId;
        const signature = SPECIAL_SIGNATURE_REGISTRY[sigId];
        const targetId =
          model.specialCategory === 'IMPULSION' && penaltyEvent?.type === 'ATTACK_PENALTY_APPLIED'
            ? penaltyEvent.payload.targetPlayerId
            : model.specialCategory === 'BOUCLIER' && skipEvent?.type === 'PLAYER_SKIPPED'
              ? skipEvent.payload.skippedPlayerId
              : null;

        specials.push({
          id: `${event.eventId}-special`,
          signature,
          chosenFamily: model.family,
          sourcePlayerId: event.payload.playerId,
          targetPlayerId: targetId,
          level,
          durationMs:
            level === 'REDUCED' ? signature.durationReducedMs : signature.durationFullMs,
          penaltyCount:
            model.specialCategory === 'IMPULSION' && penaltyEvent?.type === 'ATTACK_PENALTY_APPLIED'
              ? penaltyEvent.payload.actualCount
              : null,
        });
      } else if (model.kind === 'UNIVERSAL_SPECIAL' && model.specialCategory === 'SURCHARGE') {
        const signature = SPECIAL_SIGNATURE_REGISTRY.UNIVERSAL_SURCHARGE;
        specials.push({
          id: `${event.eventId}-surcharge`,
          signature,
          chosenFamily: null,
          sourcePlayerId: event.payload.playerId,
          targetPlayerId:
            penaltyEvent?.type === 'ATTACK_PENALTY_APPLIED'
              ? penaltyEvent.payload.targetPlayerId
              : null,
          level,
          durationMs:
            level === 'REDUCED' ? signature.durationReducedMs : signature.durationFullMs,
          penaltyCount:
            penaltyEvent?.type === 'ATTACK_PENALTY_APPLIED'
              ? penaltyEvent.payload.actualCount
              : 4,
        });
      }
    } else if (event.type === 'CARD_DRAWN' && !event.payload.isPenalty) {
      flights.push({
        id: `${event.eventId}-flight-draw`,
        kind: 'DRAW',
        variantId: 'CARD_BACK',
        sourcePlayerId: null,
        targetPlayerId: event.payload.playerId,
        isNumeric: true,
        family: null,
        durationMs: level === 'REDUCED' ? 160 : 280,
      });
    } else if (event.type === 'PORTAL_RESONANCE') {
      const signature = SPECIAL_SIGNATURE_REGISTRY.UNIVERSAL_PORTAIL;
      specials.push({
        id: `${event.eventId}-portal`,
        signature,
        chosenFamily: event.payload.chosenFamily,
        sourcePlayerId: event.payload.playerId,
        targetPlayerId: null,
        level,
        durationMs:
          level === 'REDUCED' ? signature.durationReducedMs : signature.durationFullMs,
        penaltyCount: null,
      });
    }
  }

  return {
    flights,
    specials,
    numericPulseFamily,
  };
}
