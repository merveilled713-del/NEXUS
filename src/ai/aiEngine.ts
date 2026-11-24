import type { CardInstance } from '../catalog/types';
import type { AiDifficulty, GameAction, PlayerView, RngFn } from '../engine/gameTypes';
import {
  chooseBestFamily,
  clampRngValue,
  getTableNeighbors,
  scorePlayableCardsExpert,
  scorePlayableCardsNormal,
} from './aiHeuristics';
import type { AiDecisionContext, AiScoredCard } from './aiTypes';

/**
 * NEXUS — AI Decision Engine (Étape 3)
 * Reçoit exclusivement PlayerView et AiDecisionContext (PlayerView + mémoire publique).
 * Ne produit que des actions 100 % légales au regard de PlayerView.
 */

function shouldDirectDeclareNexus(difficulty: AiDifficulty, rng: RngFn): boolean {
  if (difficulty === 'EXPERT') {
    return true;
  }
  if (difficulty === 'NORMAL') {
    return clampRngValue(rng()) < 0.9;
  }
  return clampRngValue(rng()) < 0.35;
}

function shouldPreDeclareNexus(difficulty: AiDifficulty, rng: RngFn): boolean {
  if (difficulty === 'EXPERT') {
    return true;
  }
  if (difficulty === 'NORMAL') {
    return clampRngValue(rng()) < 0.85;
  }
  return false;
}

function shouldReportMissedNexus(difficulty: AiDifficulty, rng: RngFn): boolean {
  if (difficulty === 'EXPERT') {
    return true;
  }
  if (difficulty === 'NORMAL') {
    return clampRngValue(rng()) < 0.65;
  }
  return false;
}

function pickBestScoredCard(scored: readonly AiScoredCard[]): string {
  let best = scored[0];
  for (let i = 1; i < scored.length; i += 1) {
    if (scored[i].score > best.score) {
      best = scored[i];
    }
  }
  return best.instanceId;
}

function selectPlayableCardId(
  view: PlayerView,
  difficulty: AiDifficulty,
  rng: RngFn,
  context?: AiDecisionContext,
): string {
  const playableSet = new Set(view.self.playableCardIds);
  const playableCards: CardInstance[] = view.self.hand.filter((card) =>
    playableSet.has(card.instanceId),
  );

  if (playableCards.length === 1 || difficulty === 'FACILE') {
    const idx = Math.floor(clampRngValue(rng()) * playableCards.length);
    return playableCards[idx].instanceId;
  }

  const neighbors = getTableNeighbors(view);
  const scored =
    difficulty === 'EXPERT'
      ? scorePlayableCardsExpert(view, playableCards, neighbors, context?.memory)
      : scorePlayableCardsNormal(view, playableCards, neighbors);

  return pickBestScoredCard(scored);
}

export function decideAiAction(
  view: PlayerView,
  difficulty: AiDifficulty,
  context?: AiDecisionContext,
): GameAction | null {
  if (view.phase === 'GAME_OVER') {
    return null;
  }

  const rng = context?.rng ?? Math.random;

  if (view.phase === 'CHOOSING_FAMILY') {
    // Ordre B1 strict : 1) DECLARE_NEXUS -> 2) REPORT_MISSED_NEXUS -> 3) CHOOSE_FAMILY
    if (view.canDeclareNexus && shouldDirectDeclareNexus(difficulty, rng)) {
      return {
        type: 'DECLARE_NEXUS',
        playerId: view.viewerId,
      };
    }

    if (view.canReportMissedNexus && shouldReportMissedNexus(difficulty, rng)) {
      return {
        type: 'REPORT_MISSED_NEXUS',
        reporterId: view.viewerId,
        targetPlayerId: view.pendingNexusDeclarationBy ?? undefined,
      };
    }

    if (view.mustChooseFamily) {
      return {
        type: 'CHOOSE_FAMILY',
        playerId: view.viewerId,
        family: chooseBestFamily(view, difficulty, rng, context?.memory),
      };
    }

    return null;
  }

  // Phase PLAYING
  // 1) Déclaration directe à 1 carte (légale même hors tour si fenêtre ouverte)
  if (
    view.canDeclareNexus &&
    view.self.hand.length === 1 &&
    shouldDirectDeclareNexus(difficulty, rng)
  ) {
    return {
      type: 'DECLARE_NEXUS',
      playerId: view.viewerId,
    };
  }

  // 2) Signalement d'un oubli NEXUS adverse (légal même hors tour)
  if (view.canReportMissedNexus && shouldReportMissedNexus(difficulty, rng)) {
    return {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: view.viewerId,
      targetPlayerId: view.pendingNexusDeclarationBy ?? undefined,
    };
  }

  // 3) Actions réservées au joueur actif
  if (view.activePlayerId !== view.viewerId) {
    return null;
  }

  // Pré-déclaration à 2 cartes uniquement si au moins 1 carte est jouable (sinon DRAW_CARD la réinitialiserait)
  if (
    view.canDeclareNexus &&
    view.self.hand.length === 2 &&
    view.self.playableCardIds.length > 0 &&
    shouldPreDeclareNexus(difficulty, rng)
  ) {
    return {
      type: 'DECLARE_NEXUS',
      playerId: view.viewerId,
    };
  }

  if (view.self.playableCardIds.length > 0) {
    return {
      type: 'PLAY_CARD',
      playerId: view.viewerId,
      cardInstanceId: selectPlayableCardId(view, difficulty, rng, context),
    };
  }

  // DRAW_CARD uniquement lorsque playableCardIds est vide (évite toute pioche volontaire illégale)
  return {
    type: 'DRAW_CARD',
    playerId: view.viewerId,
  };
}
