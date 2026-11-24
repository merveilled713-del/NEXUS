import test from 'node:test';
import assert from 'node:assert/strict';

import { CARD_CATALOG_BY_ID } from '../src/catalog/cards';
import type { CardInstance, FamilyId } from '../src/catalog/types';
import { NEXUS_DEFAULT_CONFIG } from '../src/config/nexus.config';
import { decideAiAction } from '../src/ai/aiEngine';
import {
  createAiPublicMemory,
  getWeakPlayabilityConfidence,
  updateAiPublicMemory,
} from '../src/ai/aiMemory';
import type {
  AiBenchmarkMetrics,
  AiBenchmarkSummary,
  AiPublicMemory,
} from '../src/ai/aiTypes';
import { createInitialGame, createInitialGameState, dispatchGameAction } from '../src/engine/gameEngine';
import type {
  AiDifficulty,
  GameEvent,
  GameState,
  PlayerInitInput,
  RngFn,
} from '../src/engine/gameTypes';
import { projectEventsForRecipient, projectPlayerView } from '../src/engine/projection';

function createMulberry32(seed: number): RngFn {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function card(instanceId: string, variantId: CardInstance['variantId']): CardInstance {
  return { instanceId, variantId };
}

function buildControlledState(
  overrides: Partial<GameState> & Pick<GameState, 'players' | 'discardPile' | 'activeFamily'>,
): GameState {
  const base = createInitialGameState({
    gameId: 'ai-controlled-test',
    players: overrides.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      aiDifficulty: p.aiDifficulty,
      seatIndex: idx,
    })),
    rng: createMulberry32(42),
  });
  return {
    ...base,
    ...overrides,
  };
}

function makeEvent(
  partial: {
    readonly eventId: string;
    readonly stateVersion: number;
    readonly batchIndex: number;
    readonly batchTotal: number;
    readonly type: GameEvent['type'];
    readonly payload: GameEvent['payload'];
  },
): GameEvent {
  return {
    ...partial,
    timestamp: partial.stateVersion * 100,
  } as GameEvent;
}

function runAiMatch(
  players: readonly PlayerInitInput[],
  seed: number,
): GameState {
  const rng = createMulberry32(seed);
  const initial = createInitialGame({
    gameId: `ai-match-${seed}`,
    players,
    config: NEXUS_DEFAULT_CONFIG,
    rng,
  });

  let state = initial.state;
  const memories = new Map<string, AiPublicMemory>();
  for (const p of state.players) {
    const projectedInitial = projectEventsForRecipient(initial.events, p.id);
    const mem = updateAiPublicMemory(
      createAiPublicMemory(state.activeFamily),
      projectedInitial,
      projectPlayerView(state, p.id),
    );
    memories.set(p.id, mem);
  }

  let safetySteps = 0;
  const maxSteps = 800;

  while (state.phase !== 'GAME_OVER' && safetySteps < maxSteps) {
    safetySteps += 1;
    let acted = false;

    // Priorité d'arbitrage FIFO réaliste autour de la table :
    // 1) joueur(s) pouvant déclarer ou signaler hors tour, puis joueur actif / en choix de famille
    const candidateOrder: string[] = [];
    if (state.phase === 'CHOOSING_FAMILY' && state.pendingFamilyChoice) {
      candidateOrder.push(state.pendingFamilyChoice.playerId);
    } else {
      candidateOrder.push(state.players[state.activePlayerIndex].id);
    }
    for (const p of state.players) {
      if (!candidateOrder.includes(p.id)) {
        candidateOrder.push(p.id);
      }
    }

    for (const playerId of candidateOrder) {
      const player = state.players.find((p) => p.id === playerId)!;
      const difficulty = player.aiDifficulty ?? 'NORMAL';
      const view = projectPlayerView(state, player.id);
      const memory = memories.get(player.id);
      const action = decideAiAction(view, difficulty, { rng, memory });
      if (!action) {
        continue;
      }

      const res = dispatchGameAction(state, action, { rng });
      assert.equal(
        res.ok,
        true,
        `Illegal AI action emitted by ${player.id} (${difficulty}): ${JSON.stringify(action)}`,
      );
      state = res.state;

      for (const observer of state.players) {
        const projectedEvents = projectEventsForRecipient(res.events, observer.id);
        const obsView = projectPlayerView(state, observer.id);
        const prevMem = memories.get(observer.id) ?? createAiPublicMemory(obsView.activeFamily);
        memories.set(observer.id, updateAiPublicMemory(prevMem, projectedEvents, obsView));
      }

      acted = true;
      break;
    }

    assert.equal(acted, true, `AI simulation stalled at stateVersion ${state.stateVersion}`);
  }

  // Si une partie s'étire anormalement au-delà de maxSteps, elle échoue explicitement (aucune boucle infinie autorisée)
  assert.equal(state.phase, 'GAME_OVER', `Match ${seed} did not finish within ${maxSteps} steps`);
  return state;
}

test('AI-01: isolation stricte anti-triche (PlayerView uniquement) et mémoire publique fiable', async (t) => {
  await t.test('invariance totale des décisions FACILE/NORMAL/EXPERT face à des mains adverses et drawPile modifiées', () => {
    const stateA = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw_a1', 'CRISTAL_1'), card('draw_a2', 'OMBRE_2')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [
            card('h_aube_7', 'AUBE_7'),
            card('h_aube_imp', 'AUBE_IMPULSION'),
            card('h_por', 'UNIVERSAL_PORTAIL'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'opp1',
          name: 'Adv1',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('opp1_a', 'OMBRE_9'), card('opp1_b', 'BRAISE_0')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'opp2',
          name: 'Adv2',
          type: 'AI',
          aiDifficulty: 'FACILE',
          seatIndex: 2,
          hand: [card('opp2_a', 'CRISTAL_5'), card('opp2_b', 'ONDE_8'), card('opp2_c', 'ECLAIR_1')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const stateB = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw_b1', 'UNIVERSAL_SURCHARGE'), card('draw_b2', 'AUBE_9')],
      players: [
        stateA.players[0],
        {
          ...stateA.players[1],
          hand: [card('opp1_x', 'UNIVERSAL_SURCHARGE'), card('opp1_y', 'AUBE_IMPULSION')],
        },
        {
          ...stateA.players[2],
          hand: [card('opp2_x', 'AUBE_0'), card('opp2_y', 'AUBE_1'), card('opp2_z', 'AUBE_2')],
          nexusPreDeclared: false,
        },
      ],
    });

    const viewA = projectPlayerView(stateA, 'ai1');
    const viewB = projectPlayerView(stateB, 'ai1');
    assert.deepEqual(viewA, viewB);

    const sharedMemory = createAiPublicMemory('AUBE');
    for (const difficulty of ['FACILE', 'NORMAL', 'EXPERT'] as const) {
      const actionA = decideAiAction(viewA, difficulty, {
        rng: createMulberry32(777),
        memory: sharedMemory,
      });
      const actionB = decideAiAction(viewB, difficulty, {
        rng: createMulberry32(777),
        memory: sharedMemory,
      });
      assert.deepEqual(actionA, actionB);
    }
  });

  await t.test('idempotence mémoire sur événements successifs d’un même stateVersion en plusieurs appels, exclusion TURN_TIMEOUT et probabilité bornée', () => {
    let mem = createAiPublicMemory('AUBE');

    // Lot v2 en deux appels chevauchants (batchIndex 0, 1 puis 1, 2)
    const evV2B0 = makeEvent({
      eventId: 'g:v2:e2',
      stateVersion: 2,
      batchIndex: 0,
      batchTotal: 3,
      type: 'CARD_PLAYED',
      payload: {
        playerId: 'p1',
        card: card('c1', 'BRAISE_4'),
        newHandCount: 5,
      },
    });
    const evV2B1 = makeEvent({
      eventId: 'g:v2:e3',
      stateVersion: 2,
      batchIndex: 1,
      batchTotal: 3,
      type: 'CARD_DRAWN',
      payload: {
        playerId: 'p2',
        count: 1,
        isPenalty: false,
        drawPileRemaining: 80,
      },
    });
    const evV2B2 = makeEvent({
      eventId: 'g:v2:e4',
      stateVersion: 2,
      batchIndex: 2,
      batchTotal: 3,
      type: 'TURN_CHANGED',
      payload: {
        previousPlayerId: 'p2',
        activePlayerId: 'p3',
        direction: 1,
      },
    });

    mem = updateAiPublicMemory(mem, [evV2B0, evV2B1]);
    assert.equal(mem.trackedActiveFamily, 'BRAISE');
    const confAfterDraw = getWeakPlayabilityConfidence(mem, 'p2', 'BRAISE');
    assert.ok(confAfterDraw > 0 && confAfterDraw < 1);

    // Deuxième appel recevant evV2B1 (déjà vu) + evV2B2 (nouveau du même stateVersion = 2)
    mem = updateAiPublicMemory(mem, [evV2B1, evV2B2]);
    const confAfterTurnChange = getWeakPlayabilityConfidence(mem, 'p2', 'BRAISE');
    assert.ok(confAfterTurnChange > 0 && confAfterTurnChange < confAfterDraw);

    // Troisième appel rejouant tout le lot v2 -> strictement idempotent
    const memReplayed = updateAiPublicMemory(mem, [evV2B0, evV2B1, evV2B2]);
    assert.deepEqual(memReplayed, mem);

    // Si p2 joue ensuite une AUTRE famille (CRISTAL_4 par correspondance de valeur),
    // on ne suppose pas qu'il possède BRAISE : l'observation sur BRAISE n'est pas effacée.
    const evPlayOtherFamily = makeEvent({
      eventId: 'g:v3:e5',
      stateVersion: 3,
      batchIndex: 0,
      batchTotal: 1,
      type: 'CARD_PLAYED',
      payload: {
        playerId: 'p2',
        card: card('c2', 'CRISTAL_4'),
        newHandCount: 5,
      },
    });
    mem = updateAiPublicMemory(mem, [evPlayOtherFamily]);
    assert.equal(mem.trackedActiveFamily, 'CRISTAL');
    assert.equal(getWeakPlayabilityConfidence(mem, 'p2', 'BRAISE'), confAfterTurnChange);

    // Une pioche de pénalité ultérieure atténue fortement les observations existantes
    const evPenaltyDraw = makeEvent({
      eventId: 'g:v4:e6',
      stateVersion: 4,
      batchIndex: 0,
      batchTotal: 1,
      type: 'CARD_DRAWN',
      payload: {
        playerId: 'p2',
        count: 2,
        isPenalty: true,
        penaltySource: 'IMPULSION',
        drawPileRemaining: 78,
      },
    });
    mem = updateAiPublicMemory(mem, [evPenaltyDraw]);
    assert.ok(getWeakPlayabilityConfidence(mem, 'p2', 'BRAISE') < confAfterTurnChange);

    // Un TURN_TIMEOUT + CARD_DRAWN dans le même stateVersion ne crée AUCUNE hypothèse sur p3
    const evTimeout = makeEvent({
      eventId: 'g:v5:e7',
      stateVersion: 5,
      batchIndex: 0,
      batchTotal: 2,
      type: 'TURN_TIMED_OUT',
      payload: {
        playerId: 'p3',
        duringPhase: 'PLAYING',
        autoDrawnCount: 1,
      },
    });
    const evTimeoutDraw = makeEvent({
      eventId: 'g:v5:e8',
      stateVersion: 5,
      batchIndex: 1,
      batchTotal: 2,
      type: 'CARD_DRAWN',
      payload: {
        playerId: 'p3',
        count: 1,
        isPenalty: false,
        drawPileRemaining: 77,
      },
    });
    mem = updateAiPublicMemory(mem, [evTimeout, evTimeoutDraw]);
    assert.equal(getWeakPlayabilityConfidence(mem, 'p3', 'CRISTAL'), 0);

    // Si p2 finit par jouer explicitement BRAISE, l'hypothèse sur (p2, BRAISE) est annulée
    const evPlayBraise = makeEvent({
      eventId: 'g:v6:e9',
      stateVersion: 6,
      batchIndex: 0,
      batchTotal: 1,
      type: 'CARD_PLAYED',
      payload: {
        playerId: 'p2',
        card: card('c3', 'BRAISE_8'),
        newHandCount: 6,
      },
    });
    mem = updateAiPublicMemory(mem, [evPlayBraise]);
    assert.equal(getWeakPlayabilityConfidence(mem, 'p2', 'BRAISE'), 0);
  });
});

test('AI-02: légalité 100 % des actions sur toutes phases, B1 et post-DRAW_CARD jouable', async (t) => {
  await t.test('parties complètes IA vs IA sans aucune action illégale ni blocage', () => {
    const lineups: readonly PlayerInitInput[][] = [
      [
        { id: 'a1', name: 'Facile', type: 'AI', aiDifficulty: 'FACILE' },
        { id: 'a2', name: 'Normal', type: 'AI', aiDifficulty: 'NORMAL' },
        { id: 'a3', name: 'Expert', type: 'AI', aiDifficulty: 'EXPERT' },
      ],
      [
        { id: 'b1', name: 'Expert1', type: 'AI', aiDifficulty: 'EXPERT' },
        { id: 'b2', name: 'Expert2', type: 'AI', aiDifficulty: 'EXPERT' },
      ],
      [
        { id: 'c1', name: 'F1', type: 'AI', aiDifficulty: 'FACILE' },
        { id: 'c2', name: 'N1', type: 'AI', aiDifficulty: 'NORMAL' },
        { id: 'c3', name: 'E1', type: 'AI', aiDifficulty: 'EXPERT' },
        { id: 'c4', name: 'N2', type: 'AI', aiDifficulty: 'NORMAL' },
      ],
    ];

    lineups.forEach((players, idx) => {
      const finished = runAiMatch(players, 5000 + idx);
      assert.equal(finished.phase, 'GAME_OVER');
      assert.ok(finished.winners.length >= 1);
    });
  });

  await t.test('après DRAW_CARD immédiatement jouable, aucune seconde pioche volontaire n’est émise', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('drawn_playable', 'AUBE_9'), card('draw2', 'CRISTAL_1')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('h1', 'OMBRE_1'), card('h2', 'CRISTAL_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_7'), card('h2_2', 'ONDE_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    for (const difficulty of ['FACILE', 'NORMAL', 'EXPERT'] as const) {
      const viewBeforeDraw = projectPlayerView(state, 'ai1');
      assert.equal(viewBeforeDraw.self.playableCardIds.length, 0);
      const drawAction = decideAiAction(viewBeforeDraw, difficulty, { rng: createMulberry32(1) });
      assert.deepEqual(drawAction, { type: 'DRAW_CARD', playerId: 'ai1' });

      const afterDraw = dispatchGameAction(state, drawAction!);
      assert.equal(afterDraw.ok, true);
      assert.equal(afterDraw.state.activePlayerIndex, 0);

      const viewAfterDraw = projectPlayerView(afterDraw.state, 'ai1');
      assert.deepEqual(viewAfterDraw.self.playableCardIds, ['drawn_playable']);

      const followUp = decideAiAction(viewAfterDraw, difficulty, { rng: createMulberry32(1) });
      assert.ok(followUp !== null);
      assert.equal(followUp.type, 'PLAY_CARD');
      if (followUp.type === 'PLAY_CARD') {
        assert.equal(followUp.cardInstanceId, 'drawn_playable');
      }
      const afterPlay = dispatchGameAction(afterDraw.state, followUp);
      assert.equal(afterPlay.ok, true);
    }
  });

  await t.test('priorités B1 en CHOOSING_FAMILY et garde pré-déclaration à 2 cartes sans carte jouable', () => {
    // 1) En CHOOSING_FAMILY avec 1 carte non déclarée : EXPERT déclare d'abord DECLARE_NEXUS, puis CHOOSE_FAMILY
    const choosingState = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4'), card('d2', 'UNIVERSAL_PORTAIL')],
      phase: 'CHOOSING_FAMILY',
      pendingFamilyChoice: {
        playerId: 'ai1',
        cardInstanceId: 'd2',
        sourceCategory: 'PORTAIL',
        variantId: 'UNIVERSAL_PORTAIL',
        pendingAttackDrawCount: 0,
      },
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'ai1',
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('h_last', 'CRISTAL_7')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view1 = projectPlayerView(choosingState, 'ai1');
    const step1 = decideAiAction(view1, 'EXPERT');
    assert.deepEqual(step1, { type: 'DECLARE_NEXUS', playerId: 'ai1' });
    const afterDecl = dispatchGameAction(choosingState, step1!);
    assert.equal(afterDecl.ok, true);

    const view2 = projectPlayerView(afterDecl.state, 'ai1');
    const step2 = decideAiAction(view2, 'EXPERT');
    assert.ok(step2 && step2.type === 'CHOOSE_FAMILY');
    assert.equal(dispatchGameAction(afterDecl.state, step2).ok, true);

    // 2) En CHOOSING_FAMILY lorsqu'un adversaire est vulnérable : EXPERT signale avant CHOOSE_FAMILY (B1)
    const reportInChoosingState = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4'), card('d2', 'UNIVERSAL_PORTAIL')],
      drawPile: [card('draw1', 'BRAISE_1'), card('draw2', 'BRAISE_2')],
      phase: 'CHOOSING_FAMILY',
      pendingFamilyChoice: {
        playerId: 'ai1',
        cardInstanceId: 'd2',
        sourceCategory: 'PORTAIL',
        variantId: 'UNIVERSAL_PORTAIL',
        pendingAttackDrawCount: 0,
      },
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'p2',
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('h1_a', 'CRISTAL_7'), card('h1_b', 'CRISTAL_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_last', 'ONDE_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const repView = projectPlayerView(reportInChoosingState, 'ai1');
    const repAction = decideAiAction(repView, 'EXPERT');
    assert.deepEqual(repAction, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'ai1',
      targetPlayerId: 'p2',
    });
    assert.equal(dispatchGameAction(reportInChoosingState, repAction!).ok, true);

    // 3) À 2 cartes avec 0 carte jouable : ne pré-déclare pas à vide, exécute DRAW_CARD
    const twoCardsUnplayable = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_1')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('h1', 'OMBRE_1'), card('h2', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_7'), card('h2_2', 'ONDE_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const unplayableView = projectPlayerView(twoCardsUnplayable, 'ai1');
    assert.equal(unplayableView.canDeclareNexus, true);
    assert.equal(unplayableView.self.playableCardIds.length, 0);
    assert.deepEqual(decideAiAction(unplayableView, 'EXPERT'), {
      type: 'DRAW_CARD',
      playerId: 'ai1',
    });
  });

  await t.test('GAME_OVER retourne null pour tous les niveaux', () => {
    const overState = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      phase: 'GAME_OVER',
      endReason: 'EMPTY_HAND',
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view = projectPlayerView(overState, 'ai1');
    for (const diff of ['FACILE', 'NORMAL', 'EXPERT'] as const) {
      assert.equal(decideAiAction(view, diff), null);
    }
  });
});

test('AI-03: différenciation comportementale déterministe entre FACILE, NORMAL et EXPERT', async (t) => {
  await t.test('préservation des jokers par NORMAL et EXPERT face à FACILE', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [
            card('c_portail', 'UNIVERSAL_PORTAIL'),
            card('c_num_8', 'AUBE_8'),
            card('c_num_3', 'AUBE_3'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [
            card('h2_1', 'ONDE_1'),
            card('h2_2', 'ONDE_2'),
            card('h2_3', 'ONDE_3'),
            card('h2_4', 'ONDE_4'),
            card('h2_5', 'ONDE_5'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view = projectPlayerView(state, 'ai1');
    // Avec rng = 0, FACILE choisit l'index 0 (c_portail)
    const facileAction = decideAiAction(view, 'FACILE', { rng: () => 0 });
    assert.deepEqual(facileAction, {
      type: 'PLAY_CARD',
      playerId: 'ai1',
      cardInstanceId: 'c_portail',
    });

    const normalAction = decideAiAction(view, 'NORMAL');
    const expertAction = decideAiAction(view, 'EXPERT');
    assert.deepEqual(normalAction, {
      type: 'PLAY_CARD',
      playerId: 'ai1',
      cardInstanceId: 'c_num_8',
    });
    assert.deepEqual(expertAction, {
      type: 'PLAY_CARD',
      playerId: 'ai1',
      cardInstanceId: 'c_num_8',
    });
  });

  await t.test('EXPERT bloque la menace à 1 carte et adapte INVERSION selon 2J vs 3J', () => {
    // 3 joueurs : p2 (suivant) a 1 carte, p3 (précédent) a 5 cartes -> EXPERT utilise INVERSION pour dévier le tour
    const threePlayerThreat = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [
            card('c_num_2', 'AUBE_2'),
            card('c_inv', 'AUBE_INVERSION'),
            card('c_keep', 'CRISTAL_7'),
          ],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Menace',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_9')],
          nexusPreDeclared: false,
          nexusDeclared: true,
          connected: true,
        },
        {
          id: 'p3',
          name: 'Sur',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [
            card('h3_1', 'ONDE_1'),
            card('h3_2', 'ONDE_2'),
            card('h3_3', 'ONDE_3'),
            card('h3_4', 'ONDE_4'),
            card('h3_5', 'ONDE_5'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view3p = projectPlayerView(threePlayerThreat, 'ai1');
    const action3p = decideAiAction(view3p, 'EXPERT');
    assert.deepEqual(action3p, {
      type: 'PLAY_CARD',
      playerId: 'ai1',
      cardInstanceId: 'c_inv',
    });

    // 2 joueurs : EXPERT a 2 cartes (AUBE_INVERSION + AUBE_9) et sait que INVERSION 2J donne un rejeu gagnant
    const twoPlayerCombo = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('c_inv', 'AUBE_INVERSION'), card('c_fin', 'AUBE_9')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2'), card('h2_3', 'ONDE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view2p = projectPlayerView(twoPlayerCombo, 'ai1');
    const action2p = decideAiAction(view2p, 'EXPERT');
    assert.deepEqual(action2p, {
      type: 'PLAY_CARD',
      playerId: 'ai1',
      cardInstanceId: 'c_inv',
    });
  });

  await t.test('EXPERT CHOOSE_FAMILY respecte la priorité : personnel > risque > probabilité adverse', () => {
    // Cas 1 : IA a 3 CRISTAL contre 1 OMBRE, même si la mémoire dit que p2 a du mal sur OMBRE (0.85),
    // la jouabilité personnelle (CRISTAL) DOIT primer.
    const statePersonalFirst = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4'), card('d2', 'UNIVERSAL_PORTAIL')],
      phase: 'CHOOSING_FAMILY',
      pendingFamilyChoice: {
        playerId: 'ai1',
        cardInstanceId: 'd2',
        sourceCategory: 'PORTAIL',
        variantId: 'UNIVERSAL_PORTAIL',
        pendingAttackDrawCount: 0,
      },
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [
            card('c1', 'CRISTAL_2'),
            card('c2', 'CRISTAL_5'),
            card('c3', 'CRISTAL_8'),
            card('o1', 'OMBRE_1'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2'), card('h2_3', 'ONDE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const memOmbreWeak: AiPublicMemory = {
      ...createAiPublicMemory('AUBE'),
      weakPlayabilityConfidence: {
        p2: { OMBRE: 0.85 },
      },
    };
    const chosen1 = decideAiAction(projectPlayerView(statePersonalFirst, 'ai1'), 'EXPERT', {
      memory: memOmbreWeak,
    });
    assert.deepEqual(chosen1, {
      type: 'CHOOSE_FAMILY',
      playerId: 'ai1',
      family: 'CRISTAL',
    });

    // Cas 2 : À force personnelle et risque strictement égaux (1 ONDE_5 vs 1 ECLAIR_5),
    // l'observation probabiliste sur p2 départage vers la famille où p2 a pioché (ECLAIR).
    const stateTieBreak = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4'), card('d2', 'UNIVERSAL_PORTAIL')],
      phase: 'CHOOSING_FAMILY',
      pendingFamilyChoice: {
        playerId: 'ai1',
        cardInstanceId: 'd2',
        sourceCategory: 'PORTAIL',
        variantId: 'UNIVERSAL_PORTAIL',
        pendingAttackDrawCount: 0,
      },
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('c1', 'ONDE_5'), card('c2', 'ECLAIR_5')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'BRAISE_1'), card('h2_2', 'BRAISE_2'), card('h2_3', 'BRAISE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const memEclairWeak: AiPublicMemory = {
      ...createAiPublicMemory('AUBE'),
      weakPlayabilityConfidence: {
        p2: { ECLAIR: 0.75 },
      },
    };
    const chosen2 = decideAiAction(projectPlayerView(stateTieBreak, 'ai1'), 'EXPERT', {
      memory: memEclairWeak,
    });
    assert.deepEqual(chosen2, {
      type: 'CHOOSE_FAMILY',
      playerId: 'ai1',
      family: 'ECLAIR',
    });
  });

  await t.test('écarts déterministes de réactivité NEXUS entre FACILE et EXPERT', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      players: [
        {
          id: 'ai1',
          name: 'IA',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 0,
          hand: [card('h1', 'AUBE_7'), card('h2', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'Adv',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const view = projectPlayerView(state, 'ai1');
    assert.deepEqual(decideAiAction(view, 'EXPERT'), {
      type: 'DECLARE_NEXUS',
      playerId: 'ai1',
    });
    // FACILE ne pré-déclare jamais à 2 cartes
    const facile = decideAiAction(view, 'FACILE', { rng: () => 0 });
    assert.equal(facile?.type, 'PLAY_CARD');
  });
});

function runControlledBenchmark(seeds: readonly number[]): AiBenchmarkSummary {
  const levels: readonly AiDifficulty[] = ['FACILE', 'NORMAL', 'EXPERT'];
  const stats: Record<
    AiDifficulty,
    { gamesPlayed: number; wins: number; rankSum: number; pointsSum: number }
  > = {
    FACILE: { gamesPlayed: 0, wins: 0, rankSum: 0, pointsSum: 0 },
    NORMAL: { gamesPlayed: 0, wins: 0, rankSum: 0, pointsSum: 0 },
    EXPERT: { gamesPlayed: 0, wins: 0, rankSum: 0, pointsSum: 0 },
  };

  for (const baseSeed of seeds) {
    for (let rotation = 0; rotation < 3; rotation += 1) {
      const rotatedLevels: AiDifficulty[] = [
        levels[rotation % 3],
        levels[(rotation + 1) % 3],
        levels[(rotation + 2) % 3],
      ];
      const players: PlayerInitInput[] = rotatedLevels.map((diff, seatIdx) => ({
        id: `bot_${diff}`,
        name: `Bot ${diff}`,
        type: 'AI',
        aiDifficulty: diff,
        seatIndex: seatIdx,
      }));

      // Même graine de distribution/jeu entre rotations pour neutraliser le biais de siège
      const finalState = runAiMatch(players, baseSeed);
      for (const standing of finalState.standings) {
        const diff = finalState.players.find((p) => p.id === standing.playerId)!.aiDifficulty!;
        stats[diff].gamesPlayed += 1;
        if (standing.isWinner) {
          stats[diff].wins += 1;
        }
        stats[diff].rankSum += standing.rank;
        stats[diff].pointsSum += standing.points;
      }
    }
  }

  const buildMetric = (difficulty: AiDifficulty): AiBenchmarkMetrics => {
    const s = stats[difficulty];
    return {
      difficulty,
      gamesPlayed: s.gamesPlayed,
      wins: s.wins,
      winRate: s.wins / s.gamesPlayed,
      averageRank: s.rankSum / s.gamesPlayed,
      averageResidualPoints: s.pointsSum / s.gamesPlayed,
    };
  };

  return {
    seedCount: seeds.length,
    rotationsPerSeed: 3,
    totalGames: seeds.length * 3,
    byDifficulty: {
      FACILE: buildMetric('FACILE'),
      NORMAL: buildMetric('NORMAL'),
      EXPERT: buildMetric('EXPERT'),
    },
  };
}

test('AI-04: benchmark statistique reproductible (200 graines contrôlées × 3 rotations = 600 manches, métriques winRate / averageRank / averageResidualPoints)', () => {
  const controlledSeeds: readonly number[] = Array.from(
    { length: 200 },
    (_, i) => (i + 1) * 97,
  );

  const summaryA = runControlledBenchmark(controlledSeeds);
  const summaryB = runControlledBenchmark(controlledSeeds);

  // Reproductibilité exacte avec les mêmes graines
  assert.deepEqual(summaryA, summaryB);
  assert.equal(summaryA.seedCount, 200);
  assert.equal(summaryA.rotationsPerSeed, 3);
  assert.equal(summaryA.totalGames, 600);

  const f = summaryA.byDifficulty.FACILE;
  const n = summaryA.byDifficulty.NORMAL;
  const e = summaryA.byDifficulty.EXPERT;

  assert.equal(f.gamesPlayed, 600);
  assert.equal(n.gamesPlayed, 600);
  assert.equal(e.gamesPlayed, 600);

  // Vérification reproductible des trois métriques sur les 600 manches :
  // 1) winRate : EXPERT > NORMAL > FACILE
  assert.ok(
    e.winRate > n.winRate && n.winRate > f.winRate,
    `Expected winRate EXPERT (${e.winRate.toFixed(4)}) > NORMAL (${n.winRate.toFixed(4)}) > FACILE (${f.winRate.toFixed(4)})`,
  );
  // 2) averageRank : EXPERT < NORMAL < FACILE
  assert.ok(
    e.averageRank < n.averageRank && n.averageRank < f.averageRank,
    `Expected averageRank EXPERT (${e.averageRank.toFixed(4)}) < NORMAL (${n.averageRank.toFixed(4)}) < FACILE (${f.averageRank.toFixed(4)})`,
  );
  // 3) averageResidualPoints : EXPERT < NORMAL < FACILE
  assert.ok(
    e.averageResidualPoints < n.averageResidualPoints &&
      n.averageResidualPoints < f.averageResidualPoints,
    `Expected averageResidualPoints EXPERT (${e.averageResidualPoints.toFixed(2)}) < NORMAL (${n.averageResidualPoints.toFixed(2)}) < FACILE (${f.averageResidualPoints.toFixed(2)})`,
  );

  // Aucun niveau n'exige 100 % de victoires sur chaque manche individuelle
  assert.ok(e.winRate < 1.0);
});
