import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import { FAMILY_IDS, type CardInstance, type FamilyId } from '../catalog/types';
import type { AiDifficulty, PlayerView, RngFn } from '../engine/gameTypes';
import { getWeakPlayabilityConfidence } from './aiMemory';
import type { AiPublicMemory, AiScoredCard } from './aiTypes';

/**
 * NEXUS — Pure AI Heuristics (Étape 3)
 * Opère exclusivement sur PlayerView et AiPublicMemory.
 */

export interface TableNeighbor {
  readonly id: string;
  readonly seatIndex: number;
  readonly cardCount: number;
}

export interface TableNeighborsSummary {
  readonly playerCount: number;
  readonly nextOpponent: TableNeighbor;
  readonly prevOpponent: TableNeighbor;
  readonly minOpponentCards: number;
}

export function clampRngValue(raw: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0;
  }
  if (raw <= 0) {
    return 0;
  }
  if (raw >= 1) {
    return 0.999999999999;
  }
  return raw;
}

export function getCardPoints(card: CardInstance): number {
  return CARD_CATALOG_BY_ID[card.variantId].pointValue;
}

export function countFamiliesInHand(
  hand: readonly CardInstance[],
): Readonly<Record<FamilyId, number>> {
  const counts: Record<FamilyId, number> = {
    AUBE: 0,
    BRAISE: 0,
    ONDE: 0,
    OMBRE: 0,
    ECLAIR: 0,
    CRISTAL: 0,
  };
  for (const card of hand) {
    const family = CARD_CATALOG_BY_ID[card.variantId].family;
    if (family !== null) {
      counts[family] += 1;
    }
  }
  return counts;
}

export function sumFamilyPointsInHand(
  hand: readonly CardInstance[],
): Readonly<Record<FamilyId, number>> {
  const sums: Record<FamilyId, number> = {
    AUBE: 0,
    BRAISE: 0,
    ONDE: 0,
    OMBRE: 0,
    ECLAIR: 0,
    CRISTAL: 0,
  };
  for (const card of hand) {
    const model = CARD_CATALOG_BY_ID[card.variantId];
    if (model.family !== null) {
      sums[model.family] += model.pointValue;
    }
  }
  return sums;
}

export function getTableNeighbors(view: PlayerView): TableNeighborsSummary {
  const ring: TableNeighbor[] = [
    {
      id: view.self.id,
      seatIndex: view.self.seatIndex,
      cardCount: view.self.hand.length,
    },
    ...view.opponents.map((opp) => ({
      id: opp.id,
      seatIndex: opp.seatIndex,
      cardCount: opp.cardCount,
    })),
  ].sort((a, b) => a.seatIndex - b.seatIndex);

  const playerCount = ring.length;
  const selfIdx = ring.findIndex((entry) => entry.id === view.viewerId);
  const resolvedSelfIdx = selfIdx === -1 ? 0 : selfIdx;

  const nextIdx = (((resolvedSelfIdx + view.direction) % playerCount) + playerCount) % playerCount;
  const prevIdx = (((resolvedSelfIdx - view.direction) % playerCount) + playerCount) % playerCount;

  let minOpponentCards = Infinity;
  for (const opp of view.opponents) {
    if (opp.cardCount < minOpponentCards) {
      minOpponentCards = opp.cardCount;
    }
  }

  return {
    playerCount,
    nextOpponent: ring[nextIdx],
    prevOpponent: ring[prevIdx],
    minOpponentCards: Number.isFinite(minOpponentCards) ? minOpponentCards : 0,
  };
}

export function chooseBestFamily(
  view: PlayerView,
  difficulty: AiDifficulty,
  rng: RngFn,
  memory?: AiPublicMemory,
): FamilyId {
  if (difficulty === 'FACILE') {
    const idx = Math.floor(clampRngValue(rng()) * FAMILY_IDS.length);
    return FAMILY_IDS[idx];
  }

  const hand = view.self.hand;
  const counts = countFamiliesInHand(hand);
  const points = sumFamilyPointsInHand(hand);

  if (difficulty === 'NORMAL') {
    let bestFamily: FamilyId = FAMILY_IDS[0];
    let bestScore = -Infinity;
    for (const family of FAMILY_IDS) {
      const score = counts[family] * 100 + points[family];
      if (score > bestScore) {
        bestScore = score;
        bestFamily = family;
      }
    }
    return bestFamily;
  }

  // EXPERT : 1) Jouabilité personnelle au tour suivant > 2) Risques immédiats > 3) Observations publiques probabilistes
  const neighbors = getTableNeighbors(view);
  let bestFamily: FamilyId = FAMILY_IDS[0];
  let bestScore = -Infinity;

  for (const family of FAMILY_IDS) {
    const familyCount = counts[family];
    const familyPoints = points[family];

    // Priorité 1 : possibilités de jeu personnelles
    let score = familyCount > 0 ? familyCount * 1000 : -1500;
    score += familyPoints * 8;

    let hasBridgeNumeric = false;
    let hasSpecialInFamily = false;
    let hasStopSpecialInFamily = false;

    for (const card of hand) {
      const model = CARD_CATALOG_BY_ID[card.variantId];
      if (model.family !== family) {
        continue;
      }
      if (model.kind === 'FAMILY_SPECIAL') {
        hasSpecialInFamily = true;
        if (
          model.specialCategory === 'IMPULSION' ||
          model.specialCategory === 'BOUCLIER' ||
          (neighbors.playerCount === 2 && model.specialCategory === 'INVERSION')
        ) {
          hasStopSpecialInFamily = true;
        }
      } else if (model.kind === 'NUMERIC') {
        const sharesValueWithOtherFamily = hand.some((other) => {
          if (other.instanceId === card.instanceId) {
            return false;
          }
          const otherModel = CARD_CATALOG_BY_ID[other.variantId];
          return (
            otherModel.kind === 'NUMERIC' &&
            otherModel.family !== family &&
            otherModel.value === model.value
          );
        });
        if (sharesValueWithOtherFamily) {
          hasBridgeNumeric = true;
        }
      }
    }

    if (hasBridgeNumeric) {
      score += 220;
    }
    if (hasSpecialInFamily) {
      score += 120;
    }

    // Priorité 2 : risques immédiats (menace adverse / épuisement proche de la pioche)
    if (neighbors.nextOpponent.cardCount <= 2 && hasStopSpecialInFamily) {
      score += 180;
    }
    if (view.drawPileCount <= 8) {
      score += familyPoints * 6;
    }

    // Priorité 3 : observations publiques probabilistes (strictement secondaire)
    const weakProb = getWeakPlayabilityConfidence(
      memory,
      neighbors.nextOpponent.id,
      family,
    );
    score += Math.round(weakProb * 45);

    if (score > bestScore) {
      bestScore = score;
      bestFamily = family;
    }
  }

  return bestFamily;
}

export function scorePlayableCardsNormal(
  view: PlayerView,
  playableCards: readonly CardInstance[],
  neighbors: TableNeighborsSummary,
): readonly AiScoredCard[] {
  return playableCards.map((card) => {
    const model = CARD_CATALOG_BY_ID[card.variantId];
    const remaining = view.self.hand.filter((c) => c.instanceId !== card.instanceId);
    const remainingCounts = countFamiliesInHand(remaining);
    const points = model.pointValue;

    if (view.self.hand.length === 1) {
      return { instanceId: card.instanceId, score: 100000 };
    }

    if (model.kind === 'NUMERIC') {
      const score = 400 + points * 6 + remainingCounts[model.family] * 25;
      return { instanceId: card.instanceId, score };
    }

    if (model.kind === 'FAMILY_SPECIAL') {
      let score = 340 + points * 4 + remainingCounts[model.family] * 15;
      const threatensNext = neighbors.nextOpponent.cardCount <= 2;
      if (
        threatensNext &&
        (model.specialCategory === 'IMPULSION' ||
          model.specialCategory === 'BOUCLIER' ||
          (neighbors.playerCount === 2 && model.specialCategory === 'INVERSION'))
      ) {
        score += 200;
      }
      return { instanceId: card.instanceId, score };
    }

    // UNIVERSAL_SPECIAL
    let score = model.specialCategory === 'SURCHARGE' ? 130 : 110;
    if (neighbors.minOpponentCards <= 2 && model.specialCategory === 'SURCHARGE') {
      score += 390;
    } else if (view.self.hand.length <= 2) {
      score += 320;
    }
    return { instanceId: card.instanceId, score };
  });
}

export function scorePlayableCardsExpert(
  view: PlayerView,
  playableCards: readonly CardInstance[],
  neighbors: TableNeighborsSummary,
  memory?: AiPublicMemory,
): readonly AiScoredCard[] {
  return playableCards.map((card) => {
    const model = CARD_CATALOG_BY_ID[card.variantId];
    const remaining = view.self.hand.filter((c) => c.instanceId !== card.instanceId);
    const remainingCounts = countFamiliesInHand(remaining);
    const points = model.pointValue;

    // Coup gagnant immédiat
    if (remaining.length === 0) {
      return { instanceId: card.instanceId, score: 100000 };
    }

    let dominantRemainingFamily: FamilyId = FAMILY_IDS[0];
    let maxRemainingCount = -1;
    for (const family of FAMILY_IDS) {
      if (remainingCounts[family] > maxRemainingCount) {
        maxRemainingCount = remainingCounts[family];
        dominantRemainingFamily = family;
      }
    }

    let score = 0;

    // Anticipation à 2 cartes restantes : préparer une dernière carte jouable ou un enchaînement gagnant
    if (remaining.length === 1) {
      const lastCard = remaining[0];
      const lastModel = CARD_CATALOG_BY_ID[lastCard.variantId];
      const selfReplaysInTwoPlayer =
        neighbors.playerCount === 2 &&
        model.kind === 'FAMILY_SPECIAL' &&
        (model.specialCategory === 'BOUCLIER' ||
          model.specialCategory === 'INVERSION' ||
          model.specialCategory === 'IMPULSION');

      const resultingFamily = model.family ?? view.activeFamily;
      const lastCompatibleWithPlayed =
        lastModel.kind === 'UNIVERSAL_SPECIAL' ||
        lastModel.family === resultingFamily ||
        (model.kind === 'NUMERIC' &&
          lastModel.kind === 'NUMERIC' &&
          lastModel.value === model.value) ||
        (model.kind === 'FAMILY_SPECIAL' &&
          lastModel.kind === 'FAMILY_SPECIAL' &&
          lastModel.specialCategory === model.specialCategory);

      if (selfReplaysInTwoPlayer && lastCompatibleWithPlayed) {
        score += 5000;
      } else if (lastCompatibleWithPlayed) {
        score += 2000;
      }
    }

    if (model.kind === 'NUMERIC') {
      const pointWeight = view.drawPileCount <= 10 ? 18 : 10;
      score += 500 + points * pointWeight + remainingCounts[model.family] * 45;

      if (model.family === dominantRemainingFamily && maxRemainingCount > 0) {
        score += 40;
      } else if (
        model.family !== view.activeFamily &&
        remainingCounts[view.activeFamily] > 0 &&
        remainingCounts[model.family] === 0
      ) {
        score -= 30;
      }

      const sharesValueInRemaining = remaining.some((other) => {
        const otherModel = CARD_CATALOG_BY_ID[other.variantId];
        return otherModel.kind === 'NUMERIC' && otherModel.value === model.value;
      });
      if (sharesValueInRemaining) {
        score += 35;
      }

      const weakProb = getWeakPlayabilityConfidence(
        memory,
        neighbors.nextOpponent.id,
        model.family,
      );
      score += Math.round(weakProb * 35);

      return { instanceId: card.instanceId, score };
    }

    if (model.kind === 'FAMILY_SPECIAL') {
      const nextThreat = neighbors.nextOpponent.cardCount <= 2;
      score += 370 + remainingCounts[model.family] * 25;

      if (view.drawPileCount <= 8) {
        score += 180;
      }

      if (model.specialCategory === 'IMPULSION') {
        if (nextThreat) {
          score += 950;
        } else if (neighbors.playerCount === 2 && remainingCounts[model.family] > 0) {
          score += 140;
        }
      } else if (model.specialCategory === 'BOUCLIER') {
        if (nextThreat) {
          score += 880;
        } else if (neighbors.playerCount === 2 && remainingCounts[model.family] > 0) {
          score += 130;
        }
      } else if (model.specialCategory === 'INVERSION') {
        if (neighbors.playerCount === 2) {
          if (nextThreat) {
            score += 920;
          } else if (remainingCounts[model.family] > 0) {
            score += 150;
          }
        } else {
          if (
            nextThreat &&
            neighbors.prevOpponent.cardCount > neighbors.nextOpponent.cardCount
          ) {
            score += 840;
          } else if (
            neighbors.prevOpponent.cardCount <= 1 &&
            neighbors.nextOpponent.cardCount > 1
          ) {
            score -= 160;
          }
        }
      }

      return { instanceId: card.instanceId, score };
    }

    // UNIVERSAL_SPECIAL (SURCHARGE / PORTAIL)
    if (model.specialCategory === 'SURCHARGE') {
      score += 140;
      if (neighbors.nextOpponent.cardCount <= 2) {
        score += 980;
      } else if (view.drawPileCount <= 6) {
        score += 360;
      }
      return { instanceId: card.instanceId, score };
    }

    // PORTAIL
    score += 90;
    if (
      neighbors.nextOpponent.cardCount === 1 &&
      dominantRemainingFamily !== view.activeFamily &&
      maxRemainingCount >= 2
    ) {
      score += 320;
    } else if (view.drawPileCount <= 5) {
      score += 240;
    }

    return { instanceId: card.instanceId, score };
  });
}
