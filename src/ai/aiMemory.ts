import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import { FAMILY_IDS, type FamilyId } from '../catalog/types';
import type { GameEvent, PlayerView } from '../engine/gameTypes';
import type { AiPublicMemory } from './aiTypes';

/**
 * NEXUS — AI Public Memory (Étape 3)
 * Alimentée exclusivement par les événements publics projetés (sans mains ni pioche cachées).
 * - Idempotente via curseur (stateVersion + seenEventIdsAtLastVersion), sans perte sur batches fractionnés.
 * - Exclut les pioches automatiques provoquées par TURN_TIMEOUT.
 * - Représente uniquement une observation probabiliste et temporaire d'absence de coup jouable.
 */

const MAX_WEAK_CONFIDENCE = 0.85;
const OBSERVATION_BOOST = 0.6;
const DRAW_ATTENUATION_FACTOR = 0.45;
const TURN_DECAY_FACTOR = 0.9;
const MIN_CONFIDENCE_THRESHOLD = 0.15;
const MAX_TRACKED_TIMEOUT_VERSIONS = 32;

export function createAiPublicMemory(initialFamily: FamilyId = 'AUBE'): AiPublicMemory {
  return {
    lastStateVersion: 0,
    lastBatchIndex: -1,
    seenEventIdsAtLastVersion: [],
    timedOutStateVersions: [],
    trackedActiveFamily: initialFamily,
    playedVariantsCount: {},
    weakPlayabilityConfidence: {},
  };
}

function cloneWeakConfidence(
  source: Readonly<Record<string, Partial<Record<FamilyId, number>>>>,
): Record<string, Partial<Record<FamilyId, number>>> {
  const copy: Record<string, Partial<Record<FamilyId, number>>> = {};
  for (const [playerId, families] of Object.entries(source)) {
    copy[playerId] = { ...families };
  }
  return copy;
}

function decayPlayerWeakConfidence(
  map: Record<string, Partial<Record<FamilyId, number>>>,
  playerId: string,
  factor: number,
): void {
  const existing = map[playerId];
  if (!existing) {
    return;
  }
  const updated: Partial<Record<FamilyId, number>> = {};
  let hasAny = false;
  for (const family of FAMILY_IDS) {
    const val = existing[family];
    if (typeof val === 'number') {
      const next = val * factor;
      if (next >= MIN_CONFIDENCE_THRESHOLD) {
        updated[family] = next;
        hasAny = true;
      }
    }
  }
  if (hasAny) {
    map[playerId] = updated;
  } else {
    delete map[playerId];
  }
}

function decayAllPlayersWeakConfidence(
  map: Record<string, Partial<Record<FamilyId, number>>>,
  factor: number,
): void {
  for (const playerId of Object.keys(map)) {
    decayPlayerWeakConfidence(map, playerId, factor);
  }
}

export function getWeakPlayabilityConfidence(
  memory: AiPublicMemory | undefined,
  playerId: string,
  family: FamilyId,
): number {
  if (!memory) {
    return 0;
  }
  const value = memory.weakPlayabilityConfidence[playerId]?.[family];
  return typeof value === 'number' ? value : 0;
}

export function updateAiPublicMemory(
  memory: AiPublicMemory,
  events: readonly GameEvent[],
  currentView?: PlayerView,
): AiPublicMemory {
  if (events.length === 0) {
    if (currentView && memory.lastStateVersion === 0) {
      return {
        ...memory,
        trackedActiveFamily: currentView.activeFamily,
      };
    }
    return memory;
  }

  const sortedEvents = [...events].sort((a, b) => {
    if (a.stateVersion !== b.stateVersion) {
      return a.stateVersion - b.stateVersion;
    }
    return a.batchIndex - b.batchIndex;
  });

  const timedOutSet = new Set<number>(memory.timedOutStateVersions);
  for (const ev of sortedEvents) {
    if (ev.type === 'TURN_TIMED_OUT') {
      timedOutSet.add(ev.stateVersion);
    }
  }

  let lastStateVersion = memory.lastStateVersion;
  let lastBatchIndex = memory.lastBatchIndex;
  let seenAtLastVersion = new Set<string>(memory.seenEventIdsAtLastVersion);
  let trackedActiveFamily = memory.trackedActiveFamily;
  const playedVariantsCount: Record<string, number> = { ...memory.playedVariantsCount };
  const weakConfidence = cloneWeakConfidence(memory.weakPlayabilityConfidence);
  let processedAny = false;

  for (const ev of sortedEvents) {
    if (ev.stateVersion < lastStateVersion) {
      continue;
    }
    if (ev.stateVersion === lastStateVersion) {
      if (seenAtLastVersion.has(ev.eventId)) {
        continue;
      }
      seenAtLastVersion.add(ev.eventId);
      if (ev.batchIndex > lastBatchIndex) {
        lastBatchIndex = ev.batchIndex;
      }
    } else {
      lastStateVersion = ev.stateVersion;
      lastBatchIndex = ev.batchIndex;
      seenAtLastVersion = new Set<string>([ev.eventId]);
    }

    processedAny = true;

    switch (ev.type) {
      case 'GAME_STARTED': {
        trackedActiveFamily = ev.payload.activeFamily;
        break;
      }
      case 'CARD_PLAYED': {
        const variantId = ev.payload.card.variantId;
        playedVariantsCount[variantId] = (playedVariantsCount[variantId] ?? 0) + 1;

        const model = CARD_CATALOG_BY_ID[variantId];
        if (model && model.family !== null) {
          trackedActiveFamily = model.family;
          const playerMap = weakConfidence[ev.payload.playerId];
          if (playerMap && playerMap[model.family] !== undefined) {
            const nextPlayerMap = { ...playerMap };
            delete nextPlayerMap[model.family];
            if (Object.keys(nextPlayerMap).length > 0) {
              weakConfidence[ev.payload.playerId] = nextPlayerMap;
            } else {
              delete weakConfidence[ev.payload.playerId];
            }
          }
        }
        break;
      }
      case 'FAMILY_CHANGED': {
        trackedActiveFamily = ev.payload.newFamily;
        break;
      }
      case 'CARD_DRAWN': {
        // Toute pioche ajoute des cartes privées inconnues -> atténue les observations antérieures
        decayPlayerWeakConfidence(
          weakConfidence,
          ev.payload.playerId,
          DRAW_ATTENUATION_FACTOR,
        );

        // N'ajoute une observation probabiliste temporaire d'absence de coup jouable
        // que pour une pioche volontaire/forcée en tour normal (hors pénalité et hors TURN_TIMEOUT).
        if (!ev.payload.isPenalty && !timedOutSet.has(ev.stateVersion)) {
          const existingForPlayer = weakConfidence[ev.payload.playerId] ?? {};
          const prev = existingForPlayer[trackedActiveFamily] ?? 0;
          const boosted = Math.min(
            MAX_WEAK_CONFIDENCE,
            prev + (1 - prev) * OBSERVATION_BOOST,
          );
          weakConfidence[ev.payload.playerId] = {
            ...existingForPlayer,
            [trackedActiveFamily]: boosted,
          };
        }
        break;
      }
      case 'TURN_CHANGED': {
        decayAllPlayersWeakConfidence(weakConfidence, TURN_DECAY_FACTOR);
        break;
      }
      default:
        break;
    }
  }

  if (!processedAny) {
    return memory;
  }

  const trimmedTimedOutVersions = [...timedOutSet]
    .sort((a, b) => a - b)
    .slice(-MAX_TRACKED_TIMEOUT_VERSIONS);

  return {
    lastStateVersion,
    lastBatchIndex,
    seenEventIdsAtLastVersion: [...seenAtLastVersion],
    timedOutStateVersions: trimmedTimedOutVersions,
    trackedActiveFamily,
    playedVariantsCount,
    weakPlayabilityConfidence: weakConfidence,
  };
}
