import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import type { CardInstance, FamilyId, NumericValue } from '../catalog/types';
import type { NexusGameConfig } from '../config/nexus.config';
import type {
  GameState,
  PlayerStanding,
  PlayerState,
  TurnDirection,
} from './gameTypes';

/**
 * NEXUS — Pure Rules & Scoring (Étape 2 - Lot 3)
 * Aucune mutation d'état, aucune dépendance DOM/UI/IA/réseau.
 */

export function getDiscardTop(state: GameState): CardInstance {
  if (state.discardPile.length === 0) {
    throw new Error('Invariant violation: discardPile must never be empty');
  }
  return state.discardPile[state.discardPile.length - 1];
}

export function getLastNumericValue(state: GameState): NumericValue | null {
  for (let i = state.discardPile.length - 1; i >= 0; i -= 1) {
    const model = CARD_CATALOG_BY_ID[state.discardPile[i].variantId];
    if (model.kind === 'NUMERIC') {
      return model.value;
    }
  }
  return state.lastNumericValue ?? null;
}

export function getNextPlayerIndex(
  currentIndex: number,
  direction: TurnDirection,
  playerCount: number,
): number {
  if (playerCount <= 0) {
    throw new Error(`Invalid playerCount: ${playerCount}`);
  }
  return (((currentIndex + direction) % playerCount) + playerCount) % playerCount;
}

export function hasCardOfFamily(
  hand: readonly CardInstance[],
  family: FamilyId,
): boolean {
  return hand.some((card) => {
    const model = CARD_CATALOG_BY_ID[card.variantId];
    return model.family === family;
  });
}

export function getCardPointValue(
  card: CardInstance,
  config?: NexusGameConfig,
): number {
  const model = CARD_CATALOG_BY_ID[card.variantId];
  if (model.kind === 'NUMERIC') {
    return model.value;
  }
  if (model.kind === 'FAMILY_SPECIAL') {
    return config?.scoring.familySpecialPoints ?? model.pointValue;
  }
  return config?.scoring.universalSpecialPoints ?? model.pointValue;
}

export function computeHandPoints(
  hand: readonly CardInstance[],
  config?: NexusGameConfig,
): number {
  let total = 0;
  for (const card of hand) {
    total += getCardPointValue(card, config);
  }
  return total;
}

export function computeStandings(
  players: readonly PlayerState[],
  config?: NexusGameConfig,
): readonly PlayerStanding[] {
  const raw = players.map((player) => ({
    playerId: player.id,
    name: player.name,
    seatIndex: player.seatIndex,
    cardCount: player.hand.length,
    points: computeHandPoints(player.hand, config),
  }));

  raw.sort((a, b) => {
    if (a.cardCount !== b.cardCount) {
      return a.cardCount - b.cardCount;
    }
    if (a.points !== b.points) {
      return a.points - b.points;
    }
    return a.seatIndex - b.seatIndex;
  });

  const standings: PlayerStanding[] = [];
  let currentRank = 1;

  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (i > 0) {
      const prev = raw[i - 1];
      if (entry.cardCount !== prev.cardCount || entry.points !== prev.points) {
        currentRank = i + 1;
      }
    }
    standings.push({
      ...entry,
      rank: currentRank,
      isWinner: currentRank === 1,
    });
  }

  return standings;
}

export function isCardPlayable(
  state: GameState,
  playerId: string,
  cardInstanceId: string,
): boolean {
  if (state.phase !== 'PLAYING') {
    return false;
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (!activePlayer || activePlayer.id !== playerId) {
    return false;
  }

  const card = activePlayer.hand.find((c) => c.instanceId === cardInstanceId);
  if (!card) {
    return false;
  }

  const discardTop = state.discardPile[state.discardPile.length - 1];
  if (!discardTop) {
    return false;
  }

  const cardModel = CARD_CATALOG_BY_ID[card.variantId];
  const topModel = CARD_CATALOG_BY_ID[discardTop.variantId];

  if (cardModel.kind === 'NUMERIC') {
    if (cardModel.family === state.activeFamily) {
      return true;
    }
    const lastNumericValue = getLastNumericValue(state);
    return lastNumericValue !== null && cardModel.value === lastNumericValue;
  }

  if (cardModel.kind === 'FAMILY_SPECIAL') {
    if (cardModel.family === state.activeFamily) {
      return true;
    }
    return (
      topModel.kind === 'FAMILY_SPECIAL' &&
      cardModel.specialCategory === topModel.specialCategory
    );
  }

  if (cardModel.kind === 'UNIVERSAL_SPECIAL') {
    if (cardModel.specialCategory === 'PORTAIL') {
      return true;
    }
    return !hasCardOfFamily(activePlayer.hand, state.activeFamily);
  }

  return false;
}

export function getPlayableCardIds(
  state: GameState,
  playerId: string,
): readonly string[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return [];
  }
  return player.hand
    .filter((card) => isCardPlayable(state, playerId, card.instanceId))
    .map((card) => card.instanceId);
}
