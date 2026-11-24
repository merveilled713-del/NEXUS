import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import { FAMILIES_BY_ID } from '../catalog/families';
import { FAMILY_IDS, type FamilyId } from '../catalog/types';
import type { GameEvent } from '../engine/gameTypes';
import type { AnimationLevel } from '../types/app';
import type {
  AnimationEffectKind,
  AnimationStep,
  FamilyAnimationVisualSpec,
} from './animationTypes';

/**
 * NEXUS — Pure Animation Mapper & Manager (Étape 5)
 * Totalement découplé du moteur de jeu et du DOM.
 * Définit les 6 animations familiales programmatiques + effets spéciaux selon FULL / REDUCED / OFF.
 */

export const FAMILY_ANIMATION_SPECS: Readonly<Record<FamilyId, FamilyAnimationVisualSpec>> =
  Object.freeze({
    AUBE: Object.freeze({
      family: 'AUBE',
      label: 'Rayonnement Solaire',
      patternStyle: 'SOLAR_RAYS',
      primaryColor: FAMILIES_BY_ID.AUBE.primaryColor,
      secondaryColor: FAMILIES_BY_ID.AUBE.secondaryColor,
      accentColor: '#FEF3C7',
      particleCountFull: 16,
      particleCountReduced: 6,
      ringCountFull: 3,
      ringCountReduced: 1,
    }),
    BRAISE: Object.freeze({
      family: 'BRAISE',
      label: 'Éruption de Braise',
      patternStyle: 'EMBER_SURGE',
      primaryColor: FAMILIES_BY_ID.BRAISE.primaryColor,
      secondaryColor: FAMILIES_BY_ID.BRAISE.secondaryColor,
      accentColor: '#FED7AA',
      particleCountFull: 18,
      particleCountReduced: 6,
      ringCountFull: 3,
      ringCountReduced: 1,
    }),
    ONDE: Object.freeze({
      family: 'ONDE',
      label: 'Résonance d’Onde',
      patternStyle: 'HARMONIC_WAVES',
      primaryColor: FAMILIES_BY_ID.ONDE.primaryColor,
      secondaryColor: FAMILIES_BY_ID.ONDE.secondaryColor,
      accentColor: '#CFFAFE',
      particleCountFull: 12,
      particleCountReduced: 4,
      ringCountFull: 4,
      ringCountReduced: 2,
    }),
    OMBRE: Object.freeze({
      family: 'OMBRE',
      label: 'Vortex d’Ombre',
      patternStyle: 'ECLIPSE_VORTEX',
      primaryColor: FAMILIES_BY_ID.OMBRE.primaryColor,
      secondaryColor: FAMILIES_BY_ID.OMBRE.secondaryColor,
      accentColor: '#EDE9FE',
      particleCountFull: 14,
      particleCountReduced: 5,
      ringCountFull: 3,
      ringCountReduced: 1,
    }),
    ECLAIR: Object.freeze({
      family: 'ECLAIR',
      label: 'Décharge Éclair',
      patternStyle: 'VOLT_DISCHARGE',
      primaryColor: FAMILIES_BY_ID.ECLAIR.primaryColor,
      secondaryColor: FAMILIES_BY_ID.ECLAIR.secondaryColor,
      accentColor: '#FFFFFF',
      particleCountFull: 14,
      particleCountReduced: 5,
      ringCountFull: 2,
      ringCountReduced: 1,
    }),
    CRISTAL: Object.freeze({
      family: 'CRISTAL',
      label: 'Prisme Cristallin',
      patternStyle: 'PRISM_FACETS',
      primaryColor: FAMILIES_BY_ID.CRISTAL.primaryColor,
      secondaryColor: FAMILIES_BY_ID.CRISTAL.secondaryColor,
      accentColor: '#D1FAE5',
      particleCountFull: 12,
      particleCountReduced: 4,
      ringCountFull: 3,
      ringCountReduced: 1,
    }),
  });

export function getAllFamilyAnimationSpecs(): readonly FamilyAnimationVisualSpec[] {
  return FAMILY_IDS.map((id) => FAMILY_ANIMATION_SPECS[id]);
}

export function getDurationForEffect(
  kind: AnimationEffectKind,
  level: AnimationLevel,
): number {
  if (level === 'OFF') {
    return 0;
  }
  const fullDurations: Readonly<Record<AnimationEffectKind, number>> = {
    DEAL_HAND: 520,
    CARD_PLAY_FAMILY: 340,
    CARD_DRAW: 260,
    IMPULSION_STRIKE: 480,
    SURCHARGE_OVERLOAD: 580,
    INVERSION_LOOP: 460,
    BOUCLIER_LOCK: 450,
    PORTAL_RESONANCE: 620,
    NEXUS_CALL: 420,
    NEXUS_PENALTY: 460,
    VICTORY_PULSE: 640,
  };
  const base = fullDurations[kind];
  return level === 'REDUCED' ? Math.round(base * 0.48) : base;
}

export function mapEventsToAnimationSteps(
  events: readonly GameEvent[],
  level: AnimationLevel,
): readonly AnimationStep[] {
  if (level === 'OFF' || events.length === 0) {
    return [];
  }

  const steps: AnimationStep[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'GAME_STARTED': {
        steps.push({
          id: `${event.eventId}-deal`,
          kind: 'DEAL_HAND',
          family: event.payload.activeFamily,
          sourcePlayerId: null,
          targetPlayerId: event.payload.activePlayerId,
          durationMs: getDurationForEffect('DEAL_HAND', level),
          label: 'Distribution initiale',
          level,
          familyVisual: FAMILY_ANIMATION_SPECS[event.payload.activeFamily],
        });
        break;
      }

      case 'CARD_PLAYED': {
        const model = CARD_CATALOG_BY_ID[event.payload.card.variantId];
        if (model.family !== null) {
          const familySpec = FAMILY_ANIMATION_SPECS[model.family];
          steps.push({
            id: `${event.eventId}-play`,
            kind: 'CARD_PLAY_FAMILY',
            family: model.family,
            sourcePlayerId: event.payload.playerId,
            targetPlayerId: null,
            durationMs: getDurationForEffect('CARD_PLAY_FAMILY', level),
            label: `${FAMILIES_BY_ID[model.family].displayName} — ${familySpec.label}`,
            level,
            familyVisual: familySpec,
          });
        }
        break;
      }

      case 'CARD_DRAWN': {
        if (!event.payload.isPenalty) {
          steps.push({
            id: `${event.eventId}-draw`,
            kind: 'CARD_DRAW',
            family: null,
            sourcePlayerId: null,
            targetPlayerId: event.payload.playerId,
            durationMs: getDurationForEffect('CARD_DRAW', level),
            label: `Pioche (${event.payload.count})`,
            level,
            familyVisual: null,
          });
        }
        break;
      }

      case 'ATTACK_PENALTY_APPLIED': {
        const kind: AnimationEffectKind =
          event.payload.source === 'SURCHARGE' ? 'SURCHARGE_OVERLOAD' : 'IMPULSION_STRIKE';
        steps.push({
          id: `${event.eventId}-attack`,
          kind,
          family: null,
          sourcePlayerId: event.payload.sourcePlayerId,
          targetPlayerId: event.payload.targetPlayerId,
          durationMs: getDurationForEffect(kind, level),
          label:
            event.payload.source === 'SURCHARGE'
              ? `Surcharge +${event.payload.actualCount}`
              : `Impulsion +${event.payload.actualCount}`,
          level,
          familyVisual: null,
        });
        break;
      }

      case 'DIRECTION_REVERSED': {
        steps.push({
          id: `${event.eventId}-inversion`,
          kind: 'INVERSION_LOOP',
          family: null,
          sourcePlayerId: null,
          targetPlayerId: null,
          durationMs: getDurationForEffect('INVERSION_LOOP', level),
          label: 'Inversion du sens',
          level,
          familyVisual: null,
        });
        break;
      }

      case 'PLAYER_SKIPPED': {
        if (event.payload.reason === 'BOUCLIER') {
          steps.push({
            id: `${event.eventId}-bouclier`,
            kind: 'BOUCLIER_LOCK',
            family: null,
            sourcePlayerId: null,
            targetPlayerId: event.payload.skippedPlayerId,
            durationMs: getDurationForEffect('BOUCLIER_LOCK', level),
            label: 'Bouclier verrouillé',
            level,
            familyVisual: null,
          });
        }
        break;
      }

      case 'PORTAL_RESONANCE': {
        const chosen = event.payload.chosenFamily;
        steps.push({
          id: `${event.eventId}-portal`,
          kind: 'PORTAL_RESONANCE',
          family: chosen,
          sourcePlayerId: event.payload.playerId,
          targetPlayerId: null,
          durationMs: getDurationForEffect('PORTAL_RESONANCE', level),
          label: `Résonance Portail · ${FAMILIES_BY_ID[chosen].displayName}`,
          level,
          familyVisual: FAMILY_ANIMATION_SPECS[chosen],
        });
        break;
      }

      case 'NEXUS_DECLARED': {
        steps.push({
          id: `${event.eventId}-nexus`,
          kind: 'NEXUS_CALL',
          family: null,
          sourcePlayerId: event.payload.playerId,
          targetPlayerId: null,
          durationMs: getDurationForEffect('NEXUS_CALL', level),
          label: 'Déclaration NEXUS',
          level,
          familyVisual: null,
        });
        break;
      }

      case 'NEXUS_PENALTY_REPORTED': {
        steps.push({
          id: `${event.eventId}-nexus-penalty`,
          kind: 'NEXUS_PENALTY',
          family: null,
          sourcePlayerId: event.payload.reporterId,
          targetPlayerId: event.payload.targetPlayerId,
          durationMs: getDurationForEffect('NEXUS_PENALTY', level),
          label: `Oubli NEXUS (+${event.payload.actualCount})`,
          level,
          familyVisual: null,
        });
        break;
      }

      case 'GAME_OVER': {
        steps.push({
          id: `${event.eventId}-gameover`,
          kind: 'VICTORY_PULSE',
          family: null,
          sourcePlayerId: event.payload.winners[0] ?? null,
          targetPlayerId: null,
          durationMs: getDurationForEffect('VICTORY_PULSE', level),
          label: 'Fin de partie',
          level,
          familyVisual: null,
        });
        break;
      }

      default:
        break;
    }
  }

  return steps;
}
