import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import type { CardInstance, FamilyId, NumericValue } from '../catalog/types';
import { isValidFamilyId } from '../catalog/validators';
import { NEXUS_DEFAULT_CONFIG } from '../config/nexus.config';
import { dealInitialCards, shuffleCards, validateSetupOptions } from './deckBuilder';
import type {
  CreateGameOptions,
  EngineActionContext,
  EngineErrorCode,
  EngineTransitionResult,
  GameAction,
  GameEvent,
  GameEventPayloadMap,
  GameEventType,
  GameState,
  PendingFamilyChoice,
  PlayerState,
  RngFn,
  TurnDirection,
} from './gameTypes';
import {
  computeStandings,
  getLastNumericValue,
  getNextPlayerIndex,
  getPlayableCardIds,
  isCardPlayable,
} from './rules';

/**
 * NEXUS — Pure Game Engine (Étape 2 - Lot 7)
 * Ajoute TURN_TIMEOUT (gestion des expirations en phase PLAYING et CHOOSING_FAMILY)
 * et finalise la cohérence des transitions de tours et cas limites.
 */

export interface InitialGameCreationResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

type EventDraft = {
  readonly [K in GameEventType]: {
    readonly type: K;
    readonly payload: GameEventPayloadMap[K];
  };
}[GameEventType];

function rejectAction(
  state: GameState,
  errorCode: EngineErrorCode,
  errorMessage: string,
): EngineTransitionResult {
  return {
    ok: false,
    state,
    events: [],
    errorCode,
    errorMessage,
  };
}

function createTypedEvent<K extends GameEventType>(
  draft: { readonly type: K; readonly payload: GameEventPayloadMap[K] },
  eventId: string,
  stateVersion: number,
  batchIndex: number,
  batchTotal: number,
  timestamp: number,
): GameEvent<K> {
  return {
    eventId,
    stateVersion,
    batchIndex,
    batchTotal,
    timestamp,
    type: draft.type,
    payload: draft.payload,
  } as GameEvent<K>;
}

function finalizeEvents(
  gameId: string,
  stateVersion: number,
  startingSequence: number,
  timestamp: number,
  drafts: readonly EventDraft[],
): { readonly events: readonly GameEvent[]; readonly nextSequence: number } {
  const total = drafts.length;
  let seq = startingSequence;
  const events: GameEvent[] = drafts.map((draft, index) => {
    seq += 1;
    return createTypedEvent(
      draft,
      `${gameId}:v${stateVersion}:e${seq}`,
      stateVersion,
      index,
      total,
      timestamp,
    );
  });
  return { events, nextSequence: seq };
}

function drawFromPileWithRecycle(
  initialDrawPile: readonly CardInstance[],
  initialDiscardPile: readonly CardInstance[],
  requestedCount: number,
  rng: RngFn,
): {
  readonly drawn: readonly CardInstance[];
  readonly drawPile: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly recycledCount: number;
} {
  let drawPile = [...initialDrawPile];
  let discardPile = [...initialDiscardPile];
  const drawn: CardInstance[] = [];
  let recycledCount = 0;

  while (drawn.length < requestedCount) {
    if (drawPile.length === 0) {
      if (discardPile.length <= 1) {
        break;
      }
      const topDiscard = discardPile[discardPile.length - 1];
      const belowTop = discardPile.slice(0, -1);
      drawPile = shuffleCards(belowTop, rng);
      discardPile = [topDiscard];
      recycledCount += belowTop.length;
    }

    const nextCard = drawPile.shift();
    if (!nextCard) {
      break;
    }
    drawn.push(nextCard);
  }

  return {
    drawn,
    drawPile,
    discardPile,
    recycledCount,
  };
}

interface ResolveAttackPenaltyParams {
  readonly baseState: GameState;
  readonly nextVersion: number;
  readonly timestamp: number;
  readonly rng: RngFn;
  readonly drafts: EventDraft[];
  readonly players: readonly PlayerState[];
  readonly drawPile: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly activeFamily: FamilyId;
  readonly lastNumericValue: NumericValue | null;
  readonly direction: TurnDirection;
  readonly sourcePlayerId: string;
  readonly casterIndex: number;
  readonly penaltyCount: 2 | 4;
  readonly source: 'IMPULSION' | 'SURCHARGE';
  readonly nexusVulnerable: boolean;
  readonly pendingNexusDeclarationBy: string | null;
}

function resolveAttackPenaltyAndAdvance(
  params: ResolveAttackPenaltyParams,
): EngineTransitionResult {
  const {
    baseState,
    nextVersion,
    timestamp,
    rng,
    drafts,
    drawPile,
    discardPile,
    activeFamily,
    lastNumericValue,
    direction,
    sourcePlayerId,
    casterIndex,
    penaltyCount,
    source,
    nexusVulnerable,
    pendingNexusDeclarationBy,
  } = params;

  let finalPlayers = params.players;
  const targetIndex = getNextPlayerIndex(casterIndex, direction, finalPlayers.length);
  const targetPlayer = finalPlayers[targetIndex];

  const drawResult = drawFromPileWithRecycle(
    drawPile,
    discardPile,
    penaltyCount,
    rng,
  );

  const finalDrawPile = drawResult.drawPile;
  const finalDiscardPile = drawResult.discardPile;

  if (drawResult.recycledCount > 0) {
    drafts.push({
      type: 'DISCARD_RECYCLED',
      payload: {
        recycledCount: drawResult.recycledCount,
        newDrawPileCount: finalDrawPile.length + drawResult.drawn.length,
      },
    });
  }

  const targetNewHand = [...targetPlayer.hand, ...drawResult.drawn];
  finalPlayers = finalPlayers.map((p, idx) =>
    idx === targetIndex
      ? {
          ...p,
          hand: targetNewHand,
          nexusPreDeclared: false,
          nexusDeclared: targetNewHand.length === 1 ? p.nexusDeclared : false,
        }
      : p,
  );

  if (drawResult.drawn.length > 0) {
    drafts.push({
      type: 'CARD_DRAWN',
      payload: {
        playerId: targetPlayer.id,
        count: drawResult.drawn.length,
        drawnCards: drawResult.drawn,
        isPenalty: true,
        penaltySource: source,
        drawPileRemaining: finalDrawPile.length,
      },
    });
  }

  const insufficientDeck = drawResult.drawn.length < penaltyCount;
  drafts.push({
    type: 'ATTACK_PENALTY_APPLIED',
    payload: {
      sourcePlayerId,
      targetPlayerId: targetPlayer.id,
      requestedCount: penaltyCount,
      actualCount: drawResult.drawn.length,
      source,
      insufficientDeck,
    },
  });

  // Règle A1 : pénalité insuffisamment approvisionnée => GAME_OVER / DECK_EXHAUSTED immédiat
  if (insufficientDeck) {
    const standings = computeStandings(finalPlayers, baseState.config);
    const winners = standings.filter((s) => s.isWinner).map((s) => s.playerId);

    drafts.push({
      type: 'GAME_OVER',
      payload: {
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      baseState.gameId,
      nextVersion,
      baseState.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...baseState,
        stateVersion: nextVersion,
        phase: 'GAME_OVER',
        players: finalPlayers,
        drawPile: finalDrawPile,
        discardPile: finalDiscardPile,
        activeFamily,
        lastNumericValue,
        pendingFamilyChoice: null,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  drafts.push({
    type: 'PLAYER_SKIPPED',
    payload: {
      skippedPlayerId: targetPlayer.id,
      reason: source,
    },
  });

  const nextActiveIndex = getNextPlayerIndex(
    targetIndex,
    direction,
    finalPlayers.length,
  );

  drafts.push({
    type: 'TURN_CHANGED',
    payload: {
      previousPlayerId: sourcePlayerId,
      activePlayerId: finalPlayers[nextActiveIndex].id,
      direction,
    },
  });

  const { events, nextSequence } = finalizeEvents(
    baseState.gameId,
    nextVersion,
    baseState.eventSequence,
    timestamp,
    drafts,
  );

  return {
    ok: true,
    state: {
      ...baseState,
      stateVersion: nextVersion,
      phase: 'PLAYING',
      players: finalPlayers,
      activePlayerIndex: nextActiveIndex,
      direction,
      drawPile: finalDrawPile,
      discardPile: finalDiscardPile,
      activeFamily,
      lastNumericValue,
      pendingFamilyChoice: null,
      nexusVulnerable,
      pendingNexusDeclarationBy,
      eventSequence: nextSequence,
      turnStartedAt: timestamp,
    },
    events,
  };
}

export function createInitialGame(options: CreateGameOptions): InitialGameCreationResult {
  const { config } = validateSetupOptions(options);
  const resolvedConfig = options.config ?? NEXUS_DEFAULT_CONFIG;
  const timestamp = options.timestamp ?? 0;
  const gameId = options.gameId ?? 'nexus-game-1';

  const deal = dealInitialCards({
    ...options,
    config,
  });

  const activePlayer = deal.players[0];
  const initialDiscard = deal.discardPile[0];
  const initialDiscardModel = CARD_CATALOG_BY_ID[initialDiscard.variantId];
  const initialLastNumericValue: NumericValue | null =
    initialDiscardModel.kind === 'NUMERIC' ? initialDiscardModel.value : null;

  const state: GameState = {
    gameId,
    stateVersion: 1,
    phase: 'PLAYING',
    config: resolvedConfig,
    players: deal.players,
    activePlayerIndex: 0,
    direction: 1,
    drawPile: deal.drawPile,
    discardPile: deal.discardPile,
    activeFamily: deal.activeFamily,
    lastNumericValue: initialLastNumericValue,
    pendingFamilyChoice: null,
    nexusVulnerable: false,
    pendingNexusDeclarationBy: null,
    endReason: null,
    winners: [],
    standings: [],
    eventSequence: 1,
    turnStartedAt: timestamp,
  };

  const startedEvent: GameEvent<'GAME_STARTED'> = {
    eventId: `${gameId}:v1:e1`,
    stateVersion: 1,
    batchIndex: 0,
    batchTotal: 1,
    timestamp,
    type: 'GAME_STARTED',
    payload: {
      playerCount: deal.players.length,
      activePlayerId: activePlayer.id,
      activeFamily: deal.activeFamily,
      initialDiscard,
      initialHandSize: resolvedConfig.match.initialHandSize,
    },
  };

  return {
    state,
    events: [startedEvent],
  };
}

export function createInitialGameState(options: CreateGameOptions): GameState {
  return createInitialGame(options).state;
}

function handlePlayCard(
  state: GameState,
  action: Extract<GameAction, { type: 'PLAY_CARD' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const playerExists = state.players.some((p) => p.id === action.playerId);
  if (!playerExists) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.playerId}`);
  }

  if (state.phase !== 'PLAYING') {
    return rejectAction(
      state,
      'INVALID_PHASE',
      `Cannot play card during phase ${state.phase}`,
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.id !== action.playerId) {
    return rejectAction(state, 'NOT_YOUR_TURN', 'It is not your turn');
  }

  const cardIndex = activePlayer.hand.findIndex(
    (c) => c.instanceId === action.cardInstanceId,
  );
  if (cardIndex === -1) {
    return rejectAction(
      state,
      'CARD_NOT_IN_HAND',
      `Card ${action.cardInstanceId} is not in player's hand`,
    );
  }

  if (!isCardPlayable(state, action.playerId, action.cardInstanceId)) {
    return rejectAction(
      state,
      'CARD_NOT_PLAYABLE',
      `Card ${action.cardInstanceId} is not playable on current state`,
    );
  }

  const playedCard = activePlayer.hand[cardIndex];
  const cardModel = CARD_CATALOG_BY_ID[playedCard.variantId];

  const rng = context?.rng ?? Math.random;
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;
  const drafts: EventDraft[] = [];

  const newCasterHand = [
    ...activePlayer.hand.slice(0, cardIndex),
    ...activePlayer.hand.slice(cardIndex + 1),
  ];

  // Mettre à jour les drapeaux NEXUS du lanceur et clôturer une éventuelle fenêtre précédente
  let nextNexusVulnerable = false;
  let nextPendingNexusBy: string | null = null;

  let casterPreDeclared = false;
  let casterDeclared = false;

  if (activePlayer.hand.length === 2 && newCasterHand.length === 1) {
    if (activePlayer.nexusPreDeclared) {
      casterDeclared = true;
    } else if (state.config.rules.requireNexusDeclaration) {
      nextNexusVulnerable = true;
      nextPendingNexusBy = activePlayer.id;
    }
  }

  const updatedPlayers: PlayerState[] = state.players.map((p, idx) =>
    idx === state.activePlayerIndex
      ? {
          ...p,
          hand: newCasterHand,
          nexusPreDeclared: casterPreDeclared,
          nexusDeclared: casterDeclared,
        }
      : p,
  );

  const nextDiscardPile: readonly CardInstance[] = [...state.discardPile, playedCard];
  const nextActiveFamily: FamilyId = cardModel.family ?? state.activeFamily;
  const nextLastNumericValue: NumericValue | null =
    cardModel.kind === 'NUMERIC' ? cardModel.value : getLastNumericValue(state);

  drafts.push({
    type: 'CARD_PLAYED',
    payload: {
      playerId: activePlayer.id,
      card: playedCard,
      newHandCount: newCasterHand.length,
    },
  });

  // Exception dernière carte : fin immédiate GAME_OVER / EMPTY_HAND sans aucun effet différé
  if (newCasterHand.length === 0) {
    const standings = computeStandings(updatedPlayers, state.config);
    const winners = standings.filter((s) => s.isWinner).map((s) => s.playerId);

    drafts.push({
      type: 'GAME_OVER',
      payload: {
        endReason: 'EMPTY_HAND',
        winners,
        standings,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'GAME_OVER',
        players: updatedPlayers,
        discardPile: nextDiscardPile,
        activeFamily: nextActiveFamily,
        lastNumericValue: nextLastNumericValue,
        pendingFamilyChoice: null,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        endReason: 'EMPTY_HAND',
        winners,
        standings,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  // Cartes universelles (PORTAIL et SURCHARGE) -> passage en CHOOSING_FAMILY
  if (cardModel.kind === 'UNIVERSAL_SPECIAL') {
    const pendingFamilyChoice: PendingFamilyChoice = {
      playerId: activePlayer.id,
      cardInstanceId: playedCard.instanceId,
      sourceCategory: cardModel.specialCategory,
      variantId: cardModel.variantId,
      pendingAttackDrawCount: cardModel.specialCategory === 'SURCHARGE' ? 4 : 0,
    };

    drafts.push({
      type: 'FAMILY_CHOICE_REQUIRED',
      payload: {
        playerId: activePlayer.id,
        sourceCategory: cardModel.specialCategory,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'CHOOSING_FAMILY',
        players: updatedPlayers,
        discardPile: nextDiscardPile,
        activeFamily: nextActiveFamily,
        lastNumericValue: nextLastNumericValue,
        pendingFamilyChoice,
        nexusVulnerable: nextNexusVulnerable,
        pendingNexusDeclarationBy: nextPendingNexusBy,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  // Résolution des cartes numériques et spéciales familiales
  const finalPlayers = updatedPlayers;
  const finalDrawPile = state.drawPile;
  const finalDiscardPile = nextDiscardPile;
  let finalDirection: TurnDirection = state.direction;
  let nextActiveIndex = getNextPlayerIndex(
    state.activePlayerIndex,
    state.direction,
    finalPlayers.length,
  );

  if (cardModel.kind === 'FAMILY_SPECIAL') {
    if (cardModel.specialCategory === 'IMPULSION') {
      return resolveAttackPenaltyAndAdvance({
        baseState: state,
        nextVersion,
        timestamp,
        rng,
        drafts,
        players: finalPlayers,
        drawPile: finalDrawPile,
        discardPile: finalDiscardPile,
        activeFamily: nextActiveFamily,
        lastNumericValue: nextLastNumericValue,
        direction: state.direction,
        sourcePlayerId: activePlayer.id,
        casterIndex: state.activePlayerIndex,
        penaltyCount: 2,
        source: 'IMPULSION',
        nexusVulnerable: nextNexusVulnerable,
        pendingNexusDeclarationBy: nextPendingNexusBy,
      });
    } else if (cardModel.specialCategory === 'INVERSION') {
      finalDirection = (state.direction * -1) as TurnDirection;
      const actedAsSkipTwoPlayers =
        finalPlayers.length === 2 && state.config.rules.twoPlayerInversionActsAsSkip;

      drafts.push({
        type: 'DIRECTION_REVERSED',
        payload: {
          direction: finalDirection,
          actedAsSkipTwoPlayers,
        },
      });

      if (actedAsSkipTwoPlayers) {
        const skippedIndex = getNextPlayerIndex(
          state.activePlayerIndex,
          state.direction,
          finalPlayers.length,
        );
        drafts.push({
          type: 'PLAYER_SKIPPED',
          payload: {
            skippedPlayerId: finalPlayers[skippedIndex].id,
            reason: 'INVERSION_2P',
          },
        });
        nextActiveIndex = state.activePlayerIndex;
      } else {
        nextActiveIndex = getNextPlayerIndex(
          state.activePlayerIndex,
          finalDirection,
          finalPlayers.length,
        );
      }
    } else if (cardModel.specialCategory === 'BOUCLIER') {
      const skippedIndex = getNextPlayerIndex(
        state.activePlayerIndex,
        state.direction,
        finalPlayers.length,
      );
      drafts.push({
        type: 'PLAYER_SKIPPED',
        payload: {
          skippedPlayerId: finalPlayers[skippedIndex].id,
          reason: 'BOUCLIER',
        },
      });
      nextActiveIndex = getNextPlayerIndex(
        skippedIndex,
        state.direction,
        finalPlayers.length,
      );
    }
  }

  drafts.push({
    type: 'TURN_CHANGED',
    payload: {
      previousPlayerId: activePlayer.id,
      activePlayerId: finalPlayers[nextActiveIndex].id,
      direction: finalDirection,
    },
  });

  const { events, nextSequence } = finalizeEvents(
    state.gameId,
    nextVersion,
    state.eventSequence,
    timestamp,
    drafts,
  );

  return {
    ok: true,
    state: {
      ...state,
      stateVersion: nextVersion,
      phase: 'PLAYING',
      players: finalPlayers,
      activePlayerIndex: nextActiveIndex,
      direction: finalDirection,
      drawPile: finalDrawPile,
      discardPile: finalDiscardPile,
      activeFamily: nextActiveFamily,
      lastNumericValue: nextLastNumericValue,
      pendingFamilyChoice: null,
      nexusVulnerable: nextNexusVulnerable,
      pendingNexusDeclarationBy: nextPendingNexusBy,
      eventSequence: nextSequence,
      turnStartedAt: timestamp,
    },
    events,
  };
}

function handleChooseFamily(
  state: GameState,
  action: Extract<GameAction, { type: 'CHOOSE_FAMILY' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const playerExists = state.players.some((p) => p.id === action.playerId);
  if (!playerExists) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.playerId}`);
  }

  if (state.phase !== 'CHOOSING_FAMILY' || state.pendingFamilyChoice === null) {
    return rejectAction(
      state,
      'INVALID_PHASE',
      `Cannot choose family during phase ${state.phase}`,
    );
  }

  const pending = state.pendingFamilyChoice;
  if (pending.playerId !== action.playerId) {
    return rejectAction(
      state,
      'NOT_YOUR_TURN',
      'Only the player who initiated the family choice can select a family',
    );
  }

  if (!isValidFamilyId(action.family)) {
    return rejectAction(
      state,
      'INVALID_FAMILY',
      `Invalid family identifier: ${String(action.family)}`,
    );
  }

  const rng = context?.rng ?? Math.random;
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;
  const drafts: EventDraft[] = [];

  const previousFamily = state.activeFamily;
  const nextActiveFamily: FamilyId = action.family;

  drafts.push({
    type: 'FAMILY_CHANGED',
    payload: {
      playerId: action.playerId,
      previousFamily,
      newFamily: nextActiveFamily,
      source: pending.sourceCategory,
    },
  });

  if (pending.sourceCategory === 'PORTAIL') {
    drafts.push({
      type: 'PORTAL_RESONANCE',
      payload: {
        playerId: action.playerId,
        chosenFamily: nextActiveFamily,
        cosmeticOnly: true,
      },
    });

    const nextActiveIndex = getNextPlayerIndex(
      state.activePlayerIndex,
      state.direction,
      state.players.length,
    );

    drafts.push({
      type: 'TURN_CHANGED',
      payload: {
        previousPlayerId: action.playerId,
        activePlayerId: state.players[nextActiveIndex].id,
        direction: state.direction,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'PLAYING',
        activePlayerIndex: nextActiveIndex,
        activeFamily: nextActiveFamily,
        pendingFamilyChoice: null,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  // SURCHARGE : applique normalement le +4 après le choix de famille
  return resolveAttackPenaltyAndAdvance({
    baseState: state,
    nextVersion,
    timestamp,
    rng,
    drafts,
    players: state.players,
    drawPile: state.drawPile,
    discardPile: state.discardPile,
    activeFamily: nextActiveFamily,
    lastNumericValue: state.lastNumericValue,
    direction: state.direction,
    sourcePlayerId: action.playerId,
    casterIndex: state.activePlayerIndex,
    penaltyCount: 4,
    source: 'SURCHARGE',
    nexusVulnerable: state.nexusVulnerable,
    pendingNexusDeclarationBy: state.pendingNexusDeclarationBy,
  });
}

function handleDeclareNexus(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLARE_NEXUS' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const playerIndex = state.players.findIndex((p) => p.id === action.playerId);
  if (playerIndex === -1) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.playerId}`);
  }

  const player = state.players[playerIndex];
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;

  // Cas 1 : déclaration directe pendant une fenêtre ouverte (PLAYING ou CHOOSING_FAMILY selon B1/Cas A)
  if (state.nexusVulnerable && state.pendingNexusDeclarationBy === action.playerId) {
    if (player.hand.length !== 1 || player.nexusDeclared) {
      return rejectAction(
        state,
        'NEXUS_DECLARATION_NOT_ALLOWED',
        'Direct NEXUS declaration requires exactly 1 undeclared card',
      );
    }

    const updatedPlayers = state.players.map((p, idx) =>
      idx === playerIndex
        ? {
            ...p,
            nexusPreDeclared: false,
            nexusDeclared: true,
          }
        : p,
    );

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      [
        {
          type: 'NEXUS_DECLARED',
          payload: {
            playerId: action.playerId,
            mode: 'DIRECT_DECLARATION',
          },
        },
      ],
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        players: updatedPlayers,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        eventSequence: nextSequence,
      },
      events,
    };
  }

  // Cas 2 : pré-déclaration à 2 cartes pendant son propre tour en phase PLAYING
  if (
    state.phase === 'PLAYING' &&
    state.activePlayerIndex === playerIndex &&
    player.hand.length === 2 &&
    !player.nexusPreDeclared &&
    state.config.rules.requireNexusDeclaration
  ) {
    const updatedPlayers = state.players.map((p, idx) =>
      idx === playerIndex
        ? {
            ...p,
            nexusPreDeclared: true,
          }
        : p,
    );

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      [
        {
          type: 'NEXUS_DECLARED',
          payload: {
            playerId: action.playerId,
            mode: 'PRE_DECLARATION',
          },
        },
      ],
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        players: updatedPlayers,
        eventSequence: nextSequence,
      },
      events,
    };
  }

  return rejectAction(
    state,
    'NEXUS_DECLARATION_NOT_ALLOWED',
    'NEXUS declaration is not allowed in the current state',
  );
}

function handleReportMissedNexus(
  state: GameState,
  action: Extract<GameAction, { type: 'REPORT_MISSED_NEXUS' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const reporterExists = state.players.some((p) => p.id === action.reporterId);
  if (!reporterExists) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.reporterId}`);
  }

  if (state.phase !== 'PLAYING' && state.phase !== 'CHOOSING_FAMILY') {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  if (!state.nexusVulnerable || state.pendingNexusDeclarationBy === null) {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  if (
    action.targetPlayerId !== undefined &&
    action.targetPlayerId !== state.pendingNexusDeclarationBy
  ) {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  if (action.reporterId === state.pendingNexusDeclarationBy) {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  const targetIndex = state.players.findIndex(
    (p) => p.id === state.pendingNexusDeclarationBy,
  );
  if (targetIndex === -1) {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  const targetPlayer = state.players[targetIndex];
  if (targetPlayer.hand.length !== 1 || targetPlayer.nexusDeclared) {
    return rejectAction(
      state,
      'NEXUS_REPORT_NOT_APPLICABLE',
      'Signalement non applicable',
    );
  }

  const rng = context?.rng ?? Math.random;
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;
  const drafts: EventDraft[] = [];
  const penaltyCount = state.config.rules.missedNexusPenalty;

  const drawResult = drawFromPileWithRecycle(
    state.drawPile,
    state.discardPile,
    penaltyCount,
    rng,
  );

  if (drawResult.recycledCount > 0) {
    drafts.push({
      type: 'DISCARD_RECYCLED',
      payload: {
        recycledCount: drawResult.recycledCount,
        newDrawPileCount: drawResult.drawPile.length + drawResult.drawn.length,
      },
    });
  }

  const targetNewHand = [...targetPlayer.hand, ...drawResult.drawn];
  const updatedPlayers = state.players.map((p, idx) =>
    idx === targetIndex
      ? {
          ...p,
          hand: targetNewHand,
          nexusPreDeclared: false,
          nexusDeclared: false,
        }
      : p,
  );

  if (drawResult.drawn.length > 0) {
    drafts.push({
      type: 'CARD_DRAWN',
      payload: {
        playerId: targetPlayer.id,
        count: drawResult.drawn.length,
        drawnCards: drawResult.drawn,
        isPenalty: true,
        penaltySource: 'MISSED_NEXUS',
        drawPileRemaining: drawResult.drawPile.length,
      },
    });
  }

  const insufficientDeck = drawResult.drawn.length < penaltyCount;
  drafts.push({
    type: 'NEXUS_PENALTY_REPORTED',
    payload: {
      reporterId: action.reporterId,
      targetPlayerId: targetPlayer.id,
      requestedCount: penaltyCount,
      actualCount: drawResult.drawn.length,
      insufficientDeck,
    },
  });

  // Règle A1 : si la pénalité +2 de signalement ne peut pas être entièrement servie => GAME_OVER / DECK_EXHAUSTED
  if (insufficientDeck) {
    const standings = computeStandings(updatedPlayers, state.config);
    const winners = standings.filter((s) => s.isWinner).map((s) => s.playerId);

    drafts.push({
      type: 'GAME_OVER',
      payload: {
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'GAME_OVER',
        players: updatedPlayers,
        drawPile: drawResult.drawPile,
        discardPile: drawResult.discardPile,
        pendingFamilyChoice: null,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  const { events, nextSequence } = finalizeEvents(
    state.gameId,
    nextVersion,
    state.eventSequence,
    timestamp,
    drafts,
  );

  return {
    ok: true,
    state: {
      ...state,
      stateVersion: nextVersion,
      players: updatedPlayers,
      drawPile: drawResult.drawPile,
      discardPile: drawResult.discardPile,
      nexusVulnerable: false,
      pendingNexusDeclarationBy: null,
      eventSequence: nextSequence,
    },
    events,
  };
}

function handleDrawCard(
  state: GameState,
  action: Extract<GameAction, { type: 'DRAW_CARD' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const playerExists = state.players.some((p) => p.id === action.playerId);
  if (!playerExists) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.playerId}`);
  }

  if (state.phase !== 'PLAYING') {
    return rejectAction(
      state,
      'INVALID_PHASE',
      `Cannot draw card during phase ${state.phase}`,
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.id !== action.playerId) {
    return rejectAction(state, 'NOT_YOUR_TURN', 'It is not your turn');
  }

  if (
    !state.config.rules.allowVoluntaryDraw &&
    getPlayableCardIds(state, action.playerId).length > 0
  ) {
    return rejectAction(
      state,
      'VOLUNTARY_DRAW_FORBIDDEN',
      'Voluntary draw is forbidden while player holds a playable card',
    );
  }

  const rng = context?.rng ?? Math.random;
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;
  const drafts: EventDraft[] = [];
  const requestedCount = state.config.rules.drawCountWhenUnplayable;

  const drawResult = drawFromPileWithRecycle(
    state.drawPile,
    state.discardPile,
    requestedCount,
    rng,
  );

  if (drawResult.recycledCount > 0) {
    drafts.push({
      type: 'DISCARD_RECYCLED',
      payload: {
        recycledCount: drawResult.recycledCount,
        newDrawPileCount: drawResult.recycledCount,
      },
    });
  }

  const newHand = [...activePlayer.hand, ...drawResult.drawn];
  const updatedPlayers: PlayerState[] = state.players.map((p, idx) =>
    idx === state.activePlayerIndex
      ? {
          ...p,
          hand: newHand,
          nexusPreDeclared: false,
          nexusDeclared: newHand.length === 1 ? p.nexusDeclared : false,
        }
      : p,
  );

  if (drawResult.drawn.length > 0) {
    drafts.push({
      type: 'CARD_DRAWN',
      payload: {
        playerId: activePlayer.id,
        count: drawResult.drawn.length,
        drawnCards: drawResult.drawn,
        isPenalty: false,
        drawPileRemaining: drawResult.drawPile.length,
      },
    });
  }

  const insufficientDeck = drawResult.drawn.length < requestedCount;
  if (insufficientDeck) {
    const standings = computeStandings(updatedPlayers, state.config);
    const winners = standings.filter((s) => s.isWinner).map((s) => s.playerId);

    drafts.push({
      type: 'GAME_OVER',
      payload: {
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'GAME_OVER',
        players: updatedPlayers,
        drawPile: drawResult.drawPile,
        discardPile: drawResult.discardPile,
        pendingFamilyChoice: null,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  // Une pioche effective pendant le tour clôture toute fenêtre NEXUS encore ouverte
  const baseNextState: GameState = {
    ...state,
    stateVersion: nextVersion,
    phase: 'PLAYING',
    players: updatedPlayers,
    drawPile: drawResult.drawPile,
    discardPile: drawResult.discardPile,
    pendingFamilyChoice: null,
    nexusVulnerable: false,
    pendingNexusDeclarationBy: null,
    turnStartedAt: timestamp,
  };

  const canPlayDrawnImmediately =
    state.config.rules.allowPlayDrawnCardImmediately &&
    drawResult.drawn.some((drawnCard) =>
      isCardPlayable(baseNextState, activePlayer.id, drawnCard.instanceId),
    );

  if (canPlayDrawnImmediately) {
    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...baseNextState,
        eventSequence: nextSequence,
      },
      events,
    };
  }

  const nextActiveIndex = getNextPlayerIndex(
    state.activePlayerIndex,
    state.direction,
    updatedPlayers.length,
  );

  drafts.push({
    type: 'TURN_CHANGED',
    payload: {
      previousPlayerId: activePlayer.id,
      activePlayerId: updatedPlayers[nextActiveIndex].id,
      direction: state.direction,
    },
  });

  const { events, nextSequence } = finalizeEvents(
    state.gameId,
    nextVersion,
    state.eventSequence,
    timestamp,
    drafts,
  );

  return {
    ok: true,
    state: {
      ...baseNextState,
      activePlayerIndex: nextActiveIndex,
      eventSequence: nextSequence,
    },
    events,
  };
}

function handleTurnTimeout(
  state: GameState,
  action: Extract<GameAction, { type: 'TURN_TIMEOUT' }>,
  context?: EngineActionContext,
): EngineTransitionResult {
  const playerExists = state.players.some((p) => p.id === action.playerId);
  if (!playerExists) {
    return rejectAction(state, 'INVALID_PLAYER', `Unknown player: ${action.playerId}`);
  }

  const rng = context?.rng ?? Math.random;
  const timestamp = context?.timestamp ?? action.timestamp ?? state.turnStartedAt;
  const nextVersion = state.stateVersion + 1;
  const drafts: EventDraft[] = [];

  if (state.phase === 'CHOOSING_FAMILY') {
    if (state.pendingFamilyChoice === null) {
      return rejectAction(
        state,
        'INVALID_PHASE',
        'No pending family choice during CHOOSING_FAMILY',
      );
    }

    const pending = state.pendingFamilyChoice;
    if (pending.playerId !== action.playerId) {
      return rejectAction(
        state,
        'NOT_YOUR_TURN',
        'Only the player choosing a family can time out',
      );
    }

    const autoChosenFamily: FamilyId = isValidFamilyId(state.activeFamily)
      ? state.activeFamily
      : 'AUBE';

    drafts.push({
      type: 'TURN_TIMED_OUT',
      payload: {
        playerId: action.playerId,
        duringPhase: 'CHOOSING_FAMILY',
        autoDrawnCount: 0,
        autoChosenFamily,
      },
    });

    drafts.push({
      type: 'FAMILY_CHANGED',
      payload: {
        playerId: action.playerId,
        previousFamily: state.activeFamily,
        newFamily: autoChosenFamily,
        source: pending.sourceCategory,
      },
    });

    if (pending.sourceCategory === 'PORTAIL') {
      drafts.push({
        type: 'PORTAL_RESONANCE',
        payload: {
          playerId: action.playerId,
          chosenFamily: autoChosenFamily,
          cosmeticOnly: true,
        },
      });

      const nextActiveIndex = getNextPlayerIndex(
        state.activePlayerIndex,
        state.direction,
        state.players.length,
      );

      drafts.push({
        type: 'TURN_CHANGED',
        payload: {
          previousPlayerId: action.playerId,
          activePlayerId: state.players[nextActiveIndex].id,
          direction: state.direction,
        },
      });

      const { events, nextSequence } = finalizeEvents(
        state.gameId,
        nextVersion,
        state.eventSequence,
        timestamp,
        drafts,
      );

      return {
        ok: true,
        state: {
          ...state,
          stateVersion: nextVersion,
          phase: 'PLAYING',
          activePlayerIndex: nextActiveIndex,
          activeFamily: autoChosenFamily,
          pendingFamilyChoice: null,
          eventSequence: nextSequence,
          turnStartedAt: timestamp,
        },
        events,
      };
    }

    return resolveAttackPenaltyAndAdvance({
      baseState: state,
      nextVersion,
      timestamp,
      rng,
      drafts,
      players: state.players,
      drawPile: state.drawPile,
      discardPile: state.discardPile,
      activeFamily: autoChosenFamily,
      lastNumericValue: state.lastNumericValue,
      direction: state.direction,
      sourcePlayerId: action.playerId,
      casterIndex: state.activePlayerIndex,
      penaltyCount: 4,
      source: 'SURCHARGE',
      nexusVulnerable: state.nexusVulnerable,
      pendingNexusDeclarationBy: state.pendingNexusDeclarationBy,
    });
  }

  if (state.phase !== 'PLAYING') {
    return rejectAction(
      state,
      'INVALID_PHASE',
      `Cannot process turn timeout during phase ${state.phase}`,
    );
  }

  const activePlayer = state.players[state.activePlayerIndex];
  if (activePlayer.id !== action.playerId) {
    return rejectAction(
      state,
      'NOT_YOUR_TURN',
      'Only the active player can time out',
    );
  }

  const requestedCount = state.config.rules.drawCountWhenUnplayable;
  const drawResult = drawFromPileWithRecycle(
    state.drawPile,
    state.discardPile,
    requestedCount,
    rng,
  );

  drafts.push({
    type: 'TURN_TIMED_OUT',
    payload: {
      playerId: activePlayer.id,
      duringPhase: 'PLAYING',
      autoDrawnCount: drawResult.drawn.length,
    },
  });

  if (drawResult.recycledCount > 0) {
    drafts.push({
      type: 'DISCARD_RECYCLED',
      payload: {
        recycledCount: drawResult.recycledCount,
        newDrawPileCount: drawResult.recycledCount,
      },
    });
  }

  const newHand = [...activePlayer.hand, ...drawResult.drawn];
  const updatedPlayers: PlayerState[] = state.players.map((p, idx) =>
    idx === state.activePlayerIndex
      ? {
          ...p,
          hand: newHand,
          nexusPreDeclared: false,
          nexusDeclared: newHand.length === 1 ? p.nexusDeclared : false,
        }
      : p,
  );

  if (drawResult.drawn.length > 0) {
    drafts.push({
      type: 'CARD_DRAWN',
      payload: {
        playerId: activePlayer.id,
        count: drawResult.drawn.length,
        drawnCards: drawResult.drawn,
        isPenalty: false,
        drawPileRemaining: drawResult.drawPile.length,
      },
    });
  }

  const insufficientDeck = drawResult.drawn.length < requestedCount;
  if (insufficientDeck) {
    const standings = computeStandings(updatedPlayers, state.config);
    const winners = standings.filter((s) => s.isWinner).map((s) => s.playerId);

    drafts.push({
      type: 'GAME_OVER',
      payload: {
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
      },
    });

    const { events, nextSequence } = finalizeEvents(
      state.gameId,
      nextVersion,
      state.eventSequence,
      timestamp,
      drafts,
    );

    return {
      ok: true,
      state: {
        ...state,
        stateVersion: nextVersion,
        phase: 'GAME_OVER',
        players: updatedPlayers,
        drawPile: drawResult.drawPile,
        discardPile: drawResult.discardPile,
        pendingFamilyChoice: null,
        nexusVulnerable: false,
        pendingNexusDeclarationBy: null,
        endReason: 'DECK_EXHAUSTED',
        winners,
        standings,
        eventSequence: nextSequence,
        turnStartedAt: timestamp,
      },
      events,
    };
  }

  const nextActiveIndex = getNextPlayerIndex(
    state.activePlayerIndex,
    state.direction,
    updatedPlayers.length,
  );

  drafts.push({
    type: 'TURN_CHANGED',
    payload: {
      previousPlayerId: activePlayer.id,
      activePlayerId: updatedPlayers[nextActiveIndex].id,
      direction: state.direction,
    },
  });

  const { events, nextSequence } = finalizeEvents(
    state.gameId,
    nextVersion,
    state.eventSequence,
    timestamp,
    drafts,
  );

  return {
    ok: true,
    state: {
      ...state,
      stateVersion: nextVersion,
      phase: 'PLAYING',
      players: updatedPlayers,
      activePlayerIndex: nextActiveIndex,
      drawPile: drawResult.drawPile,
      discardPile: drawResult.discardPile,
      pendingFamilyChoice: null,
      nexusVulnerable: false,
      pendingNexusDeclarationBy: null,
      eventSequence: nextSequence,
      turnStartedAt: timestamp,
    },
    events,
  };
}

export function dispatchGameAction(
  state: GameState,
  action: GameAction,
  context?: EngineActionContext,
): EngineTransitionResult {
  if (state.phase === 'GAME_OVER') {
    return rejectAction(
      state,
      'GAME_ALREADY_OVER',
      'Cannot perform any action after GAME_OVER',
    );
  }

  switch (action.type) {
    case 'PLAY_CARD':
      return handlePlayCard(state, action, context);
    case 'CHOOSE_FAMILY':
      return handleChooseFamily(state, action, context);
    case 'DECLARE_NEXUS':
      return handleDeclareNexus(state, action, context);
    case 'REPORT_MISSED_NEXUS':
      return handleReportMissedNexus(state, action, context);
    case 'DRAW_CARD':
      return handleDrawCard(state, action, context);
    case 'TURN_TIMEOUT':
      return handleTurnTimeout(state, action, context);
  }
}
