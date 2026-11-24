import test from 'node:test';
import assert from 'node:assert/strict';

import { CARD_CATALOG_BY_ID } from '../src/catalog/cards';
import type { CardInstance } from '../src/catalog/types';
import {
  NEXUS_DEFAULT_CONFIG,
  buildDeck,
  calculateDeckSize,
  type NexusGameConfig,
} from '../src/config/nexus.config';
import { shuffleCards } from '../src/engine/deckBuilder';
import {
  createInitialGame,
  createInitialGameState,
  dispatchGameAction,
} from '../src/engine/gameEngine';
import type { GameState, PlayerInitInput, RngFn } from '../src/engine/gameTypes';
import {
  projectEventsForRecipient,
  projectPlayerView,
} from '../src/engine/projection';
import { getPlayableCardIds, isCardPlayable } from '../src/engine/rules';

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

function makePlayers(count: number): PlayerInitInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `p${idx + 1}`,
    name: `Joueur ${idx + 1}`,
    type: idx === 0 ? 'HUMAN' : 'AI',
    aiDifficulty: idx === 0 ? undefined : 'NORMAL',
  }));
}

test('ENG-01: état initial, construction du paquet (158 cartes), distribution 2-6 joueurs, défausse initiale numérique, reproductibilité RNG et rejets', async (t) => {
  await t.test('distribution valide pour 2 à 6 joueurs (7 cartes/joueur, conservation intégrale sans perte ni doublon)', () => {
    const expectedDeckIds = buildDeck(NEXUS_DEFAULT_CONFIG)
      .map((c) => c.instanceId)
      .sort();

    for (const count of [2, 3, 4, 5, 6]) {
      const rng = createMulberry32(1000 + count);
      const { state, events } = createInitialGame({
        gameId: `game-${count}p`,
        players: makePlayers(count),
        rng,
        timestamp: 42,
      });

      assert.equal(state.stateVersion, 1);
      assert.equal(state.phase, 'PLAYING');
      assert.equal(state.activePlayerIndex, 0);
      assert.equal(state.direction, 1);
      assert.equal(state.players.length, count);
      assert.equal(state.nexusVulnerable, false);
      assert.equal(state.pendingNexusDeclarationBy, null);
      assert.equal(state.pendingFamilyChoice, null);
      assert.equal(state.endReason, null);
      assert.deepEqual(state.winners, []);
      assert.deepEqual(state.standings, []);
      assert.equal(state.turnStartedAt, 42);

      for (let i = 0; i < count; i += 1) {
        const player = state.players[i];
        assert.equal(player.hand.length, 7);
        assert.equal(player.seatIndex, i);
        assert.equal(player.nexusPreDeclared, false);
        assert.equal(player.nexusDeclared, false);
      }

      assert.equal(state.discardPile.length, 1);
      const discardCard = state.discardPile[0];
      const discardModel = CARD_CATALOG_BY_ID[discardCard.variantId];
      assert.equal(discardModel.kind, 'NUMERIC');
      assert.equal(state.activeFamily, discardModel.family);

      const expectedDrawCount = calculateDeckSize(NEXUS_DEFAULT_CONFIG) - count * 7 - 1;
      assert.equal(state.drawPile.length, expectedDrawCount);

      const allDealtIds = [
        ...state.players.flatMap((p) => p.hand.map((c) => c.instanceId)),
        ...state.drawPile.map((c) => c.instanceId),
        ...state.discardPile.map((c) => c.instanceId),
      ].sort();
      assert.equal(allDealtIds.length, 158);
      assert.equal(new Set(allDealtIds).size, 158);
      assert.deepEqual(allDealtIds, expectedDeckIds);

      assert.equal(events.length, 1);
      assert.equal(events[0].type, 'GAME_STARTED');
      assert.equal(events[0].stateVersion, 1);
      assert.equal(events[0].batchIndex, 0);
      assert.equal(events[0].batchTotal, 1);
    }
  });

  await t.test('remise dans le paquet et remélange si la première carte candidate pour la défausse est spéciale', () => {
    // Pour 2 joueurs, 14 cartes sont distribuées (indices 0..13), la candidate initiale est à l'index 14.
    // On construit un RNG déterministe qui place UNIVERSAL_PORTAIL (index 157 du deck neuf) à l'index 14
    // lors du 1er mélange, puis effectue un mélange standard (Mulberry32) si un remélange est déclenché.
    let callCount = 0;
    const fallbackRng = createMulberry32(777);
    const forcedSpecialFirstRng: RngFn = () => {
      const idx = callCount;
      callCount += 1;
      // 1er appel du shuffle (i = 157): cible j = 14
      if (idx === 0) {
        return 14.5 / 158;
      }
      // Appels suivants du 1er shuffle (i = 156..1): j = i (laisse l'index 14 intact)
      if (idx < 157) {
        return 0.999999;
      }
      // Appels du remélange après remise de la carte spéciale dans le paquet
      return fallbackRng();
    };

    const state = createInitialGameState({
      players: makePlayers(2),
      rng: forcedSpecialFirstRng,
    });

    // Vérifie qu'au moins un remélange a bien eu lieu (> 157 appels RNG)
    assert.ok(callCount > 157);
    assert.equal(state.discardPile.length, 1);
    const discardModel = CARD_CATALOG_BY_ID[state.discardPile[0].variantId];
    assert.equal(discardModel.kind, 'NUMERIC');
    assert.equal(state.activeFamily, discardModel.family);

    const allIds = [
      ...state.players.flatMap((p) => p.hand.map((c) => c.instanceId)),
      ...state.drawPile.map((c) => c.instanceId),
      ...state.discardPile.map((c) => c.instanceId),
    ];
    assert.equal(allIds.length, 158);
    assert.equal(new Set(allIds).size, 158);
  });

  await t.test('reproductibilité stricte avec un RNG déterministe et immuabilité de shuffleCards', () => {
    const baseDeck = buildDeck(NEXUS_DEFAULT_CONFIG);
    const snapshotBefore = baseDeck.map((c) => c.instanceId);
    const shuffled = shuffleCards(baseDeck, createMulberry32(999));
    assert.deepEqual(
      baseDeck.map((c) => c.instanceId),
      snapshotBefore,
    );
    assert.equal(shuffled.length, baseDeck.length);

    const stateA = createInitialGame({
      gameId: 'repro-1',
      players: makePlayers(4),
      rng: createMulberry32(2026),
      timestamp: 100,
    });
    const stateB = createInitialGame({
      gameId: 'repro-1',
      players: makePlayers(4),
      rng: createMulberry32(2026),
      timestamp: 100,
    });
    assert.deepEqual(stateA, stateB);
  });

  await t.test('rejet des nombres de joueurs invalides, joueurs dupliqués et configurations corrompues', () => {
    assert.throws(
      () => createInitialGameState({ players: makePlayers(1) }),
      /Invalid player count/,
    );
    assert.throws(
      () => createInitialGameState({ players: makePlayers(7) }),
      /Invalid player count/,
    );
    assert.throws(
      () =>
        createInitialGameState({
          players: [
            { id: 'dup', name: 'A', type: 'HUMAN' },
            { id: 'dup', name: 'B', type: 'AI' },
          ],
        }),
      /Duplicate player id/,
    );
    assert.throws(
      () =>
        createInitialGameState({
          players: [
            { id: 'p1', name: 'A', type: 'HUMAN', seatIndex: 0 },
            { id: 'p2', name: 'B', type: 'AI', seatIndex: 0 },
          ],
        }),
      /Duplicate seatIndex/,
    );

    const invalidDeckConfig: NexusGameConfig = {
      ...NEXUS_DEFAULT_CONFIG,
      deckQuantities: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities,
        universalSpecials: {
          ...NEXUS_DEFAULT_CONFIG.deckQuantities.universalSpecials,
          SURCHARGE: -1,
        },
      },
    };
    assert.throws(
      () =>
        createInitialGameState({
          players: makePlayers(2),
          config: invalidDeckConfig,
        }),
      /Invalid deck configuration/,
    );

    const invalidHandSizeConfig: NexusGameConfig = {
      ...NEXUS_DEFAULT_CONFIG,
      match: {
        ...NEXUS_DEFAULT_CONFIG.match,
        initialHandSize: 0,
      },
    };
    assert.throws(
      () =>
        createInitialGameState({
          players: makePlayers(2),
          config: invalidHandSizeConfig,
        }),
      /Invalid initialHandSize/,
    );
  });
});

function card(instanceId: string, variantId: CardInstance['variantId']): CardInstance {
  return { instanceId, variantId };
}

function buildControlledState(overrides: Partial<GameState> & Pick<GameState, 'players' | 'discardPile' | 'activeFamily'>): GameState {
  const base = createInitialGameState({
    gameId: 'controlled-test',
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

test('ENG-02: cartes numériques — jouabilité par famille active ou valeur, distinction dernière carte, non-mutation et rejets', async (t) => {
  await t.test('jouabilité par famille active ou valeur numérique et mise à jour de activeFamily', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_5')],
      drawPile: [card('p1', 'CRISTAL_1'), card('p2', 'CRISTAL_2')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [
            card('h_aube_2', 'AUBE_2'),
            card('h_braise_5', 'BRAISE_5'),
            card('h_onde_9', 'ONDE_9'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_7'), card('h2_2', 'BRAISE_7')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const beforeSnapshot = structuredClone(state);
    assert.equal(isCardPlayable(state, 'p1', 'h_aube_2'), true);
    assert.equal(isCardPlayable(state, 'p1', 'h_braise_5'), true);
    assert.equal(isCardPlayable(state, 'p1', 'h_onde_9'), false);
    assert.equal(isCardPlayable(state, 'p1', 'absent'), false);
    assert.equal(isCardPlayable(state, 'p2', 'h2_1'), false);
    assert.deepEqual(getPlayableCardIds(state, 'p1'), ['h_aube_2', 'h_braise_5']);
    // Aucune mutation lors des vérifications de jouabilité
    assert.deepEqual(state, beforeSnapshot);

    // Jouer BRAISE_5 (correspondance par valeur) bascule immédiatement activeFamily sur BRAISE
    const played = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h_braise_5',
    });
    assert.equal(played.ok, true);
    assert.equal(played.state.activeFamily, 'BRAISE');
    assert.equal(played.state.activePlayerIndex, 1);
    assert.equal(played.state.discardPile[played.state.discardPile.length - 1].variantId, 'BRAISE_5');
    assert.equal(played.state.players[0].hand.length, 2);
  });

  await t.test('jouabilité numérique sur la dernière carte numérique jouée même sous une ou plusieurs spéciales en défausse', () => {
    // Scénario 1 : une carte spéciale familiale (ONDE_BOUCLIER) au-dessus de AUBE_5, activeFamily = ONDE
    const underOneSpecialState = buildControlledState({
      activeFamily: 'ONDE',
      discardPile: [card('d1', 'AUBE_5'), card('d2', 'ONDE_BOUCLIER')],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [
            card('h_cristal_5', 'CRISTAL_5'),
            card('h_cristal_4', 'CRISTAL_4'),
            card('h_onde_1', 'ONDE_1'),
            card('h_ombre_bouclier', 'OMBRE_BOUCLIER'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    // CRISTAL_5 correspond à la dernière carte numérique (5) malgré ONDE_BOUCLIER au sommet
    assert.equal(isCardPlayable(underOneSpecialState, 'p1', 'h_cristal_5'), true);
    assert.equal(isCardPlayable(underOneSpecialState, 'p1', 'h_cristal_4'), false);
    assert.equal(isCardPlayable(underOneSpecialState, 'p1', 'h_onde_1'), true);
    assert.equal(isCardPlayable(underOneSpecialState, 'p1', 'h_ombre_bouclier'), true);

    // Scénario 2 : plusieurs spéciales empilées au-dessus de AUBE_5 (BOUCLIER + IMPULSION + PORTAIL), activeFamily = ECLAIR
    const underMultipleSpecialsState = buildControlledState({
      activeFamily: 'ECLAIR',
      discardPile: [
        card('d1', 'AUBE_5'),
        card('d2', 'ONDE_BOUCLIER'),
        card('d3', 'BRAISE_IMPULSION'),
        card('d4', 'UNIVERSAL_PORTAIL'),
      ],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: underOneSpecialState.players,
    });

    // CRISTAL_5 reste jouable via la dernière numérique AUBE_5 ; OMBRE_BOUCLIER (spéciale) ne matche ni ECLAIR ni PORTAIL
    assert.equal(isCardPlayable(underMultipleSpecialsState, 'p1', 'h_cristal_5'), true);
    assert.equal(isCardPlayable(underMultipleSpecialsState, 'p1', 'h_cristal_4'), false);
    assert.equal(isCardPlayable(underMultipleSpecialsState, 'p1', 'h_onde_1'), false);
    assert.equal(isCardPlayable(underMultipleSpecialsState, 'p1', 'h_ombre_bouclier'), false);

    // Jouer CRISTAL_5 sur cette pile empilée met à jour activeFamily et la dernière valeur numérique
    const playOnStacked = dispatchGameAction(underMultipleSpecialsState, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h_cristal_5',
    });
    assert.equal(playOnStacked.ok, true);
    assert.equal(playOnStacked.state.activeFamily, 'CRISTAL');
    assert.equal(playOnStacked.state.lastNumericValue, 5);

    // Scénario 3 : si une carte numérique plus récente (BRAISE_7) est jouée puis recouverte de spéciales, 7 remplace 5
    const newerNumericBuriedState = buildControlledState({
      activeFamily: 'ONDE',
      discardPile: [
        card('d1', 'AUBE_5'),
        card('d2', 'ONDE_BOUCLIER'),
        card('d3', 'BRAISE_7'),
        card('d4', 'ECLAIR_INVERSION'),
        card('d5', 'ONDE_IMPULSION'),
      ],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h_cristal_7', 'CRISTAL_7'), card('h_cristal_5', 'CRISTAL_5')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    assert.equal(isCardPlayable(newerNumericBuriedState, 'p1', 'h_cristal_7'), true);
    assert.equal(isCardPlayable(newerNumericBuriedState, 'p1', 'h_cristal_5'), false);

    // Scénario 4 : conservation de lastNumericValue après recyclage laissant uniquement une spéciale en défausse
    const afterRecycleState = buildControlledState({
      activeFamily: 'ONDE',
      lastNumericValue: 7,
      discardPile: [card('d_only_top', 'ONDE_BOUCLIER')],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: newerNumericBuriedState.players,
    });
    assert.equal(isCardPlayable(afterRecycleState, 'p1', 'h_cristal_7'), true);
    assert.equal(isCardPlayable(afterRecycleState, 'p1', 'h_cristal_5'), false);
  });

  await t.test('rejet strict des actions illégales sans mutation d’état', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_3')],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h_ombre_9', 'OMBRE_9'), card('h_aube_1', 'AUBE_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const snapshot = structuredClone(state);

    const wrongCard = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h_ombre_9',
    });
    assert.equal(wrongCard.ok, false);
    if (!wrongCard.ok) assert.equal(wrongCard.errorCode, 'CARD_NOT_PLAYABLE');
    assert.deepEqual(wrongCard.state, snapshot);

    const missingCard = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'card_not_owned',
    });
    assert.equal(missingCard.ok, false);
    if (!missingCard.ok) assert.equal(missingCard.errorCode, 'CARD_NOT_IN_HAND');
    assert.deepEqual(missingCard.state, snapshot);

    const wrongTurn = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p2',
      cardInstanceId: 'h2_1',
    });
    assert.equal(wrongTurn.ok, false);
    if (!wrongTurn.ok) assert.equal(wrongTurn.errorCode, 'NOT_YOUR_TURN');

    const unknownPlayer = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'ghost',
      cardInstanceId: 'h_aube_1',
    });
    assert.equal(unknownPlayer.ok, false);
    if (!unknownPlayer.ok) assert.equal(unknownPlayer.errorCode, 'INVALID_PLAYER');
  });
});

test('ENG-03: spéciales familiales (IMPULSION, INVERSION 3+J, BOUCLIER), compatibilité catégorie, mise à jour activeFamily et A1 sur IMPULSION', async (t) => {
  await t.test('correspondance par catégorie, mise à jour immédiate de activeFamily, BOUCLIER et INVERSION à 3 joueurs', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_BOUCLIER')],
      drawPile: [card('p1', 'CRISTAL_1'), card('p2', 'CRISTAL_2')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [
            card('h_braise_bouclier', 'BRAISE_BOUCLIER'),
            card('h_onde_inversion', 'ONDE_INVERSION'),
            card('h_aube_1', 'AUBE_1'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [
            card('h2_braise_inv', 'BRAISE_INVERSION'),
            card('h2_aube_2', 'AUBE_2'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [
            card('h3_braise_inv', 'BRAISE_INVERSION'),
            card('h3_cristal_4', 'CRISTAL_4'),
          ],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    // ONDE_INVERSION ne correspond ni à AUBE ni à BOUCLIER
    assert.equal(isCardPlayable(state, 'p1', 'h_onde_inversion'), false);
    // BRAISE_BOUCLIER correspond par catégorie BOUCLIER
    assert.equal(isCardPlayable(state, 'p1', 'h_braise_bouclier'), true);

    const afterShield = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h_braise_bouclier',
    });
    assert.equal(afterShield.ok, true);
    assert.equal(afterShield.state.activeFamily, 'BRAISE');
    // J2 est bloqué, le tour passe directement à J3 (index 2)
    assert.equal(afterShield.state.activePlayerIndex, 2);
    assert.ok(
      afterShield.events.some(
        (e) => e.type === 'PLAYER_SKIPPED' && e.payload.skippedPlayerId === 'p2',
      ),
    );

    // J3 joue BRAISE_INVERSION (même famille BRAISE) : sens devient -1, donc tour passe à J2 (index 1)
    const afterInversion = dispatchGameAction(afterShield.state, {
      type: 'PLAY_CARD',
      playerId: 'p3',
      cardInstanceId: 'h3_braise_inv',
    });
    assert.equal(afterInversion.ok, true);
    assert.equal(afterInversion.state.direction, -1);
    assert.equal(afterInversion.state.activePlayerIndex, 1);
    assert.ok(
      afterInversion.events.some(
        (e) =>
          e.type === 'DIRECTION_REVERSED' &&
          e.payload.direction === -1 &&
          e.payload.actedAsSkipTwoPlayers === false,
      ),
    );
  });

  await t.test('IMPULSION (+2) standard : pioche 2 cartes pour le joueur suivant et perte de son tour', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2'), card('draw3', 'CRISTAL_3')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_imp', 'AUBE_IMPULSION'), card('h1_extra', 'AUBE_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_3')],
          nexusPreDeclared: false,
          nexusDeclared: true,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'OMBRE_6'), card('h3_2', 'OMBRE_7')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_imp',
    });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'PLAYING');
    assert.equal(res.state.players[1].hand.length, 3);
    assert.equal(res.state.players[1].nexusDeclared, false);
    assert.equal(res.state.drawPile.length, 1);
    // J2 perd son tour -> J3 (index 2) devient actif
    assert.equal(res.state.activePlayerIndex, 2);
  });

  await t.test('IMPULSION (+2) avec pioche impossible après recyclage -> règle A1 (GAME_OVER / DECK_EXHAUSTED)', () => {
    // 0 carte en pioche, 1 carte en défausse (BRAISE_0) qui deviendra recyclable sous IMPULSION -> k = 1 < 2
    const state = buildControlledState({
      activeFamily: 'BRAISE',
      discardPile: [card('d_top', 'BRAISE_0')],
      drawPile: [],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_imp', 'BRAISE_IMPULSION'), card('h1_keep', 'AUBE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_1')],
          nexusPreDeclared: true,
          nexusDeclared: true,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_imp',
    });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.equal(res.state.endReason, 'DECK_EXHAUSTED');
    // BRAISE_0 a été recyclée et piochée (k = 1 < 2) -> IMPULSION reste seule en défausse
    assert.equal(res.state.discardPile.length, 1);
    assert.equal(res.state.discardPile[0].instanceId, 'h1_imp');
    assert.ok(res.events.some((e) => e.type === 'DISCARD_RECYCLED' && e.payload.recycledCount === 1));
    // J2 a reçu l'unique carte disponible (k = 1) -> main finale = 2 cartes (1 + 0 = 1 pt)
    assert.equal(res.state.players[1].hand.length, 2);
    assert.equal(res.state.players[1].nexusPreDeclared, false);
    assert.equal(res.state.players[1].nexusDeclared, false);
    // J1 a 1 carte restante (AUBE_9 = 9 pts) contre J2 (2 cartes = 1 pt) -> J1 gagne au nombre de cartes
    assert.deepEqual(res.state.winners, ['p1']);
    assert.equal(res.state.standings[0].playerId, 'p1');
    assert.equal(res.state.standings[0].cardCount, 1);
    assert.equal(res.state.standings[1].cardCount, 2);
    assert.equal(res.state.standings[1].points, 1);
    // Aucun effet différé (ni PLAYER_SKIPPED ni TURN_CHANGED) après GAME_OVER
    assert.equal(res.events.some((e) => e.type === 'PLAYER_SKIPPED'), false);
    assert.equal(res.events.some((e) => e.type === 'TURN_CHANGED'), false);

    // Verrouillage irréversible après GAME_OVER
    const afterEnd = dispatchGameAction(res.state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_keep',
    });
    assert.equal(afterEnd.ok, false);
    if (!afterEnd.ok) assert.equal(afterEnd.errorCode, 'GAME_ALREADY_OVER');
  });
});

test('ENG-04: INVERSION à 2 joueurs agit comme BOUCLIER et redonne immédiatement le tour au lanceur', () => {
  const state = buildControlledState({
    activeFamily: 'ECLAIR',
    discardPile: [card('d1', 'ECLAIR_2')],
    drawPile: [card('draw1', 'CRISTAL_1')],
    players: [
      {
        id: 'p1',
        name: 'J1',
        type: 'HUMAN',
        seatIndex: 0,
        hand: [card('h1_inv', 'ECLAIR_INVERSION'), card('h1_next', 'ECLAIR_8')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
      {
        id: 'p2',
        name: 'J2',
        type: 'AI',
        aiDifficulty: 'NORMAL',
        seatIndex: 1,
        hand: [card('h2_1', 'ECLAIR_3'), card('h2_2', 'OMBRE_5')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
    ],
  });

  const res = dispatchGameAction(state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardInstanceId: 'h1_inv',
  });
  assert.equal(res.ok, true);
  assert.equal(res.state.direction, -1);
  // À 2 joueurs, J1 conserve immédiatement le tour
  assert.equal(res.state.activePlayerIndex, 0);
  assert.ok(
    res.events.some(
      (e) =>
        e.type === 'DIRECTION_REVERSED' && e.payload.actedAsSkipTwoPlayers === true,
    ),
  );
  assert.ok(
    res.events.some(
      (e) =>
        e.type === 'PLAYER_SKIPPED' &&
        e.payload.skippedPlayerId === 'p2' &&
        e.payload.reason === 'INVERSION_2P',
    ),
  );
  // J1 peut immédiatement jouer sa carte suivante
  assert.equal(isCardPlayable(res.state, 'p1', 'h1_next'), true);
});

test('ENG-05: PORTAIL — jouable à tout moment, CHOOSING_FAMILY -> PLAYING, choix réel, PORTAL_RESONANCE cosmétique, fin de tour et exception dernière carte', async (t) => {
  await t.test('cycle complet PLAYING -> CHOOSING_FAMILY -> PLAYING, changement réel de famille et fin de tour immédiate', () => {
    const state = buildControlledState({
      activeFamily: 'BRAISE',
      discardPile: [card('d1', 'BRAISE_4')],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_portail', 'UNIVERSAL_PORTAIL'), card('h1_keep', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1'), card('h2_2', 'BRAISE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    assert.equal(isCardPlayable(state, 'p1', 'h1_portail'), true);

    const playPortal = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_portail',
    });
    assert.equal(playPortal.ok, true);
    assert.equal(playPortal.state.phase, 'CHOOSING_FAMILY');
    assert.equal(playPortal.state.activePlayerIndex, 0);
    assert.equal(playPortal.state.pendingFamilyChoice?.sourceCategory, 'PORTAIL');
    assert.ok(
      playPortal.events.some(
        (e) =>
          e.type === 'FAMILY_CHOICE_REQUIRED' &&
          e.payload.playerId === 'p1' &&
          e.payload.sourceCategory === 'PORTAIL',
      ),
    );

    // Impossible de jouer une carte pendant CHOOSING_FAMILY ou de laisser p2 choisir la famille
    const playWhileChoosing = dispatchGameAction(playPortal.state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_keep',
    });
    assert.equal(playWhileChoosing.ok, false);
    if (!playWhileChoosing.ok) assert.equal(playWhileChoosing.errorCode, 'INVALID_PHASE');

    const wrongChooser = dispatchGameAction(playPortal.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p2',
      family: 'OMBRE',
    });
    assert.equal(wrongChooser.ok, false);
    if (!wrongChooser.ok) assert.equal(wrongChooser.errorCode, 'NOT_YOUR_TURN');

    const invalidFamily = dispatchGameAction(playPortal.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'ÉCLAIR' as unknown as 'ECLAIR',
    });
    assert.equal(invalidFamily.ok, false);
    if (!invalidFamily.ok) assert.equal(invalidFamily.errorCode, 'INVALID_FAMILY');

    // Choix valide de famille -> mise à jour réelle de activeFamily, PORTAL_RESONANCE cosmétique, tour passe immédiatement à p2
    const chosen = dispatchGameAction(playPortal.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'OMBRE',
    });
    assert.equal(chosen.ok, true);
    assert.equal(chosen.state.phase, 'PLAYING');
    assert.equal(chosen.state.activeFamily, 'OMBRE');
    assert.equal(chosen.state.pendingFamilyChoice, null);
    // Aucun tour supplémentaire accordé à p1 : c'est à p2
    assert.equal(chosen.state.activePlayerIndex, 1);

    assert.ok(
      chosen.events.some(
        (e) =>
          e.type === 'FAMILY_CHANGED' &&
          e.payload.previousFamily === 'BRAISE' &&
          e.payload.newFamily === 'OMBRE' &&
          e.payload.source === 'PORTAIL',
      ),
    );
    assert.ok(
      chosen.events.some(
        (e) =>
          e.type === 'PORTAL_RESONANCE' &&
          e.payload.chosenFamily === 'OMBRE' &&
          e.payload.cosmeticOnly === true,
      ),
    );

    // L'effet de règle est réel : p2 peut jouer OMBRE_1, pas BRAISE_2 (valeur différente du 4 enfoui)
    assert.equal(isCardPlayable(chosen.state, 'p2', 'h2_1'), true);
    assert.equal(isCardPlayable(chosen.state, 'p2', 'h2_2'), false);
  });

  await t.test('exception dernière carte : PORTAIL joué en dernière carte -> GAME_OVER / EMPTY_HAND immédiat sans CHOOSING_FAMILY', () => {
    const state = buildControlledState({
      activeFamily: 'ONDE',
      discardPile: [card('d1', 'ONDE_8')],
      drawPile: [card('p1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_last_portail', 'UNIVERSAL_PORTAIL')],
          nexusPreDeclared: false,
          nexusDeclared: true,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_last_portail',
    });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.equal(res.state.endReason, 'EMPTY_HAND');
    assert.equal(res.state.pendingFamilyChoice, null);
    assert.deepEqual(res.state.winners, ['p1']);
    assert.equal(res.events.some((e) => e.type === 'FAMILY_CHOICE_REQUIRED'), false);
    assert.equal(res.events.some((e) => e.type === 'PORTAL_RESONANCE'), false);

    // Toute tentative de choisir une famille après GAME_OVER est rejetée
    const afterEnd = dispatchGameAction(res.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'AUBE',
    });
    assert.equal(afterEnd.ok, false);
    if (!afterEnd.ok) assert.equal(afterEnd.errorCode, 'GAME_ALREADY_OVER');
  });
});

test('ENG-06: SURCHARGE (+4) — jouable uniquement si le joueur ne possède aucune carte de la famille active', () => {
  const basePlayers = (hand: CardInstance[]): GameState['players'] => [
    {
      id: 'p1',
      name: 'J1',
      type: 'HUMAN',
      seatIndex: 0,
      hand,
      nexusPreDeclared: false,
      nexusDeclared: false,
      connected: true,
    },
    {
      id: 'p2',
      name: 'J2',
      type: 'AI',
      aiDifficulty: 'NORMAL',
      seatIndex: 1,
      hand: [card('h2_1', 'CRISTAL_1')],
      nexusPreDeclared: false,
      nexusDeclared: false,
      connected: true,
    },
  ];

  // Possède une numérique de la famille active (AUBE_2) -> SURCHARGE interdite
  const withNumericOfActive = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_6')],
    drawPile: [card('d_1', 'CRISTAL_1')],
    players: basePlayers([
      card('h_sur', 'UNIVERSAL_SURCHARGE'),
      card('h_aube', 'AUBE_2'),
    ]),
  });
  assert.equal(isCardPlayable(withNumericOfActive, 'p1', 'h_sur'), false);
  const rejectedNumeric = dispatchGameAction(withNumericOfActive, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardInstanceId: 'h_sur',
  });
  assert.equal(rejectedNumeric.ok, false);
  if (!rejectedNumeric.ok) assert.equal(rejectedNumeric.errorCode, 'CARD_NOT_PLAYABLE');

  // Possède une spéciale familiale de la famille active (AUBE_BOUCLIER) -> SURCHARGE interdite
  const withSpecialOfActive = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_6')],
    drawPile: [card('d_1', 'CRISTAL_1')],
    players: basePlayers([
      card('h_sur', 'UNIVERSAL_SURCHARGE'),
      card('h_aube_sp', 'AUBE_BOUCLIER'),
    ]),
  });
  assert.equal(isCardPlayable(withSpecialOfActive, 'p1', 'h_sur'), false);

  // Aucune carte AUBE, même si le joueur possède une carte jouable par valeur (BRAISE_6) et un PORTAIL -> SURCHARGE autorisée
  const withoutActiveFamily = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_6')],
    drawPile: [card('d_1', 'CRISTAL_1')],
    players: basePlayers([
      card('h_sur', 'UNIVERSAL_SURCHARGE'),
      card('h_braise_6', 'BRAISE_6'),
      card('h_portail', 'UNIVERSAL_PORTAIL'),
    ]),
  });
  assert.equal(isCardPlayable(withoutActiveFamily, 'p1', 'h_sur'), true);
});

test('ENG-07: SURCHARGE (+4) — choix de famille, pénalité +4 et saut, règle A1 et exception dernière carte', async (t) => {
  await t.test('choix de famille suivi du +4 et saut du joueur suivant (3 joueurs)', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_3')],
      drawPile: [
        card('draw1', 'CRISTAL_1'),
        card('draw2', 'CRISTAL_2'),
        card('draw3', 'CRISTAL_3'),
        card('draw4', 'CRISTAL_4'),
        card('draw5', 'CRISTAL_5'),
      ],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_other', 'OMBRE_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1')],
          nexusPreDeclared: false,
          nexusDeclared: true,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'ECLAIR_7'), card('h3_2', 'BRAISE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const played = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(played.ok, true);
    assert.equal(played.state.phase, 'CHOOSING_FAMILY');
    assert.equal(played.state.pendingFamilyChoice?.pendingAttackDrawCount, 4);

    const chosen = dispatchGameAction(played.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'ECLAIR',
    });
    assert.equal(chosen.ok, true);
    assert.equal(chosen.state.phase, 'PLAYING');
    assert.equal(chosen.state.activeFamily, 'ECLAIR');
    assert.equal(chosen.state.players[1].hand.length, 5);
    assert.equal(chosen.state.players[1].nexusDeclared, false);
    assert.equal(chosen.state.drawPile.length, 1);
    assert.equal(chosen.state.activePlayerIndex, 2);
    assert.ok(
      chosen.events.some(
        (e) =>
          e.type === 'ATTACK_PENALTY_APPLIED' &&
          e.payload.source === 'SURCHARGE' &&
          e.payload.actualCount === 4 &&
          e.payload.insufficientDeck === false,
      ),
    );
    assert.ok(
      chosen.events.some(
        (e) =>
          e.type === 'PLAYER_SKIPPED' &&
          e.payload.skippedPlayerId === 'p2' &&
          e.payload.reason === 'SURCHARGE',
      ),
    );
  });

  await t.test('SURCHARGE (+4) insuffisamment approvisionnée -> règle A1 (GAME_OVER / DECK_EXHAUSTED)', () => {
    // 2 cartes en pioche + 1 carte sous SURCHARGE après pose = 3 cartes max (< 4)
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d_top', 'AUBE_0')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_keep', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1')],
          nexusPreDeclared: true,
          nexusDeclared: true,
          connected: true,
        },
      ],
    });

    const played = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(played.ok, true);

    const chosen = dispatchGameAction(played.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'CRISTAL',
    });
    assert.equal(chosen.ok, true);
    assert.equal(chosen.state.phase, 'GAME_OVER');
    assert.equal(chosen.state.endReason, 'DECK_EXHAUSTED');
    // J2 a pioché les 3 cartes disponibles (2 pioche + AUBE_0 recyclée)
    assert.equal(chosen.state.players[1].hand.length, 4);
    assert.equal(chosen.state.players[1].nexusPreDeclared, false);
    assert.equal(chosen.state.players[1].nexusDeclared, false);
    assert.deepEqual(chosen.state.winners, ['p1']);
    assert.equal(chosen.events.some((e) => e.type === 'PLAYER_SKIPPED'), false);
    assert.equal(chosen.events.some((e) => e.type === 'TURN_CHANGED'), false);
  });

  await t.test('exception dernière carte : SURCHARGE posée en dernière carte -> GAME_OVER / EMPTY_HAND immédiat sans CHOOSING_FAMILY ni +4', () => {
    const state = buildControlledState({
      activeFamily: 'OMBRE',
      discardPile: [card('d1', 'OMBRE_5')],
      drawPile: [
        card('draw1', 'CRISTAL_1'),
        card('draw2', 'CRISTAL_2'),
        card('draw3', 'CRISTAL_3'),
        card('draw4', 'CRISTAL_4'),
      ],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_last_sur', 'UNIVERSAL_SURCHARGE')],
          nexusPreDeclared: false,
          nexusDeclared: true,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'AUBE_4')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_last_sur',
    });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.equal(res.state.endReason, 'EMPTY_HAND');
    assert.equal(res.state.pendingFamilyChoice, null);
    // J2 n'a subi aucune pénalité +4 différée et la pioche reste intacte
    assert.equal(res.state.players[1].hand.length, 1);
    assert.equal(res.state.drawPile.length, 4);
    assert.equal(res.events.some((e) => e.type === 'ATTACK_PENALTY_APPLIED'), false);
    assert.equal(res.events.some((e) => e.type === 'FAMILY_CHOICE_REQUIRED'), false);
  });
});

test('ENG-08: cumul des attaques désactivé par défaut (allowAttackStacking: false) — résolution immédiate sans déviation possible', () => {
  assert.equal(NEXUS_DEFAULT_CONFIG.rules.allowAttackStacking, false);

  const state = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_1')],
    drawPile: [
      card('d_1', 'CRISTAL_1'),
      card('d_2', 'CRISTAL_2'),
      card('d_3', 'CRISTAL_3'),
      card('d_4', 'CRISTAL_4'),
    ],
    players: [
      {
        id: 'p1',
        name: 'J1',
        type: 'HUMAN',
        seatIndex: 0,
        hand: [card('h1_imp', 'AUBE_IMPULSION'), card('h1_2', 'AUBE_9')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
      {
        id: 'p2',
        name: 'J2',
        type: 'AI',
        aiDifficulty: 'NORMAL',
        seatIndex: 1,
        hand: [card('h2_imp', 'BRAISE_IMPULSION'), card('h2_sur', 'UNIVERSAL_SURCHARGE')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
      {
        id: 'p3',
        name: 'J3',
        type: 'AI',
        aiDifficulty: 'NORMAL',
        seatIndex: 2,
        hand: [card('h3_1', 'AUBE_7'), card('h3_2', 'OMBRE_8')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
    ],
  });

  // p1 joue IMPULSION : p2 subit immédiatement +2 et est sauté (même s'il possède IMPULSION et SURCHARGE)
  const afterImpulsion = dispatchGameAction(state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardInstanceId: 'h1_imp',
  });
  assert.equal(afterImpulsion.ok, true);
  assert.equal(afterImpulsion.state.players[1].hand.length, 4);
  assert.equal(afterImpulsion.state.activePlayerIndex, 2);

  // p2 ne peut pas contrer/cumuler : ce n'est pas son tour
  const attemptStack = dispatchGameAction(afterImpulsion.state, {
    type: 'PLAY_CARD',
    playerId: 'p2',
    cardInstanceId: 'h2_imp',
  });
  assert.equal(attemptStack.ok, false);
  if (!attemptStack.ok) assert.equal(attemptStack.errorCode, 'NOT_YOUR_TURN');
});

test('ENG-13: pré-déclaration NEXUS à 2 cartes, conservation au passage à 1 carte, rejets et réinitialisation sur pénalité', () => {
  const state = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_4')],
    drawPile: [card('p1', 'CRISTAL_1'), card('p2', 'CRISTAL_2'), card('p3', 'CRISTAL_3')],
    players: [
      {
        id: 'p1',
        name: 'J1',
        type: 'HUMAN',
        seatIndex: 0,
        hand: [card('h1_1', 'AUBE_6'), card('h1_2', 'OMBRE_9')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
      {
        id: 'p2',
        name: 'J2',
        type: 'AI',
        aiDifficulty: 'NORMAL',
        seatIndex: 1,
        hand: [card('h2_1', 'AUBE_7'), card('h2_2', 'BRAISE_2'), card('h2_3', 'ONDE_3')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
    ],
  });

  // Hors tour ou à 3 cartes : pré-déclaration refusée
  const outOfTurn = dispatchGameAction(state, {
    type: 'DECLARE_NEXUS',
    playerId: 'p2',
  });
  assert.equal(outOfTurn.ok, false);
  if (!outOfTurn.ok) assert.equal(outOfTurn.errorCode, 'NEXUS_DECLARATION_NOT_ALLOWED');

  // Pré-déclaration valide à 2 cartes pendant son tour
  const preDecl = dispatchGameAction(state, {
    type: 'DECLARE_NEXUS',
    playerId: 'p1',
  });
  assert.equal(preDecl.ok, true);
  assert.equal(preDecl.state.players[0].nexusPreDeclared, true);
  assert.equal(preDecl.state.players[0].nexusDeclared, false);
  assert.ok(
    preDecl.events.some(
      (e) =>
        e.type === 'NEXUS_DECLARED' &&
        e.payload.playerId === 'p1' &&
        e.payload.mode === 'PRE_DECLARATION',
    ),
  );

  // Doublon de pré-déclaration rejeté
  const dupPreDecl = dispatchGameAction(preDecl.state, {
    type: 'DECLARE_NEXUS',
    playerId: 'p1',
  });
  assert.equal(dupPreDecl.ok, false);

  // Pose de l'avant-dernière carte (2 -> 1) -> nexusDeclared = true, aucune vulnérabilité
  const afterPlay = dispatchGameAction(preDecl.state, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardInstanceId: 'h1_1',
  });
  assert.equal(afterPlay.ok, true);
  assert.equal(afterPlay.state.players[0].hand.length, 1);
  assert.equal(afterPlay.state.players[0].nexusPreDeclared, false);
  assert.equal(afterPlay.state.players[0].nexusDeclared, true);
  assert.equal(afterPlay.state.nexusVulnerable, false);
  assert.equal(afterPlay.state.pendingNexusDeclarationBy, null);

  // Réception d'une pénalité (+2) réinitialise nexusPreDeclared et nexusDeclared
  const stateWithPreDeclaredTarget = buildControlledState({
    activeFamily: 'AUBE',
    discardPile: [card('d1', 'AUBE_4')],
    drawPile: [card('p1', 'CRISTAL_1'), card('p2', 'CRISTAL_2')],
    players: [
      {
        id: 'p1',
        name: 'J1',
        type: 'HUMAN',
        seatIndex: 0,
        hand: [card('h1_imp', 'AUBE_IMPULSION'), card('h1_keep', 'OMBRE_9')],
        nexusPreDeclared: false,
        nexusDeclared: false,
        connected: true,
      },
      {
        id: 'p2',
        name: 'J2',
        type: 'AI',
        aiDifficulty: 'NORMAL',
        seatIndex: 1,
        hand: [card('h2_1', 'AUBE_1'), card('h2_2', 'BRAISE_2')],
        nexusPreDeclared: true,
        nexusDeclared: false,
        connected: true,
      },
    ],
  });
  const afterImp = dispatchGameAction(stateWithPreDeclaredTarget, {
    type: 'PLAY_CARD',
    playerId: 'p1',
    cardInstanceId: 'h1_imp',
  });
  assert.equal(afterImp.ok, true);
  assert.equal(afterImp.state.players[1].hand.length, 4);
  assert.equal(afterImp.state.players[1].nexusPreDeclared, false);
  assert.equal(afterImp.state.players[1].nexusDeclared, false);
});

test('ENG-14: fenêtre NEXUS post-saut (Cas A après BOUCLIER / INVERSION 2J) et distinction pioche de pénalité imposée', async (t) => {
  await t.test('Cas A (3 joueurs) : BOUCLIER garde la fenêtre ouverte jusqu’à déclaration, signalement ou premier PLAY_CARD du joueur suivant', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_2')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2'), card('draw3', 'CRISTAL_3')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_bouclier', 'AUBE_BOUCLIER'), card('h1_last', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1'), card('h2_2', 'OMBRE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'AUBE_7'), card('h3_2', 'BRAISE_8'), card('h3_3', 'CRISTAL_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const afterShield = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_bouclier',
    });
    assert.equal(afterShield.ok, true);
    assert.equal(afterShield.state.activePlayerIndex, 2);
    assert.equal(afterShield.state.nexusVulnerable, true);
    assert.equal(afterShield.state.pendingNexusDeclarationBy, 'p1');

    // Avant l'action de p3, p1 peut encore annoncer NEXUS directement
    const declaredLate = dispatchGameAction(afterShield.state, {
      type: 'DECLARE_NEXUS',
      playerId: 'p1',
    });
    assert.equal(declaredLate.ok, true);
    assert.equal(declaredLate.state.nexusVulnerable, false);
    assert.equal(declaredLate.state.pendingNexusDeclarationBy, null);
    assert.equal(declaredLate.state.players[0].nexusDeclared, true);

    // Si p3 joue avant toute annonce/signalement, la fenêtre se clôture atomiquement
    const closedByNextPlay = dispatchGameAction(afterShield.state, {
      type: 'PLAY_CARD',
      playerId: 'p3',
      cardInstanceId: 'h3_1',
    });
    assert.equal(closedByNextPlay.ok, true);
    assert.equal(closedByNextPlay.state.nexusVulnerable, false);
    assert.equal(closedByNextPlay.state.pendingNexusDeclarationBy, null);
  });

  await t.test('Cas A (2 joueurs) : INVERSION redonne le tour au lanceur avec fenêtre NEXUS ouverte avant sa prochaine action', () => {
    const state = buildControlledState({
      activeFamily: 'ONDE',
      discardPile: [card('d1', 'ONDE_4')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_inv', 'ONDE_INVERSION'), card('h1_last', 'ONDE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1'), card('h2_2', 'OMBRE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const afterInv = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_inv',
    });
    assert.equal(afterInv.ok, true);
    assert.equal(afterInv.state.activePlayerIndex, 0);
    assert.equal(afterInv.state.nexusVulnerable, true);
    assert.equal(afterInv.state.pendingNexusDeclarationBy, 'p1');

    // p1 peut annoncer NEXUS avant sa prochaine action
    const p1Declares = dispatchGameAction(afterInv.state, {
      type: 'DECLARE_NEXUS',
      playerId: 'p1',
    });
    assert.equal(p1Declares.ok, true);
    assert.equal(p1Declares.state.players[0].nexusDeclared, true);
    assert.equal(p1Declares.state.nexusVulnerable, false);
    assert.equal(p1Declares.state.activePlayerIndex, 0);

    // Inversement, si p2 signale en premier avant que p1 déclare ou rejoue -> pénalité +2 sur p1
    const p2Reports = dispatchGameAction(afterInv.state, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'p2',
      targetPlayerId: 'p1',
    });
    assert.equal(p2Reports.ok, true);
    assert.equal(p2Reports.state.players[0].hand.length, 3);
    assert.equal(p2Reports.state.nexusVulnerable, false);
    assert.equal(p2Reports.state.pendingNexusDeclarationBy, null);
  });

  await t.test('distinction stricte : une pioche de pénalité imposée (+2 IMPULSION) ne clôture pas la fenêtre NEXUS ouverte', () => {
    const state = buildControlledState({
      activeFamily: 'BRAISE',
      discardPile: [card('d1', 'BRAISE_3')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2'), card('draw3', 'CRISTAL_3')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_imp', 'BRAISE_IMPULSION'), card('h1_last', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'OMBRE_1'), card('h2_2', 'OMBRE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'BRAISE_7'), card('h3_2', 'ECLAIR_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const afterImp = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_imp',
    });
    assert.equal(afterImp.ok, true);
    // p2 a subi une pénalité imposée de 2 cartes, mais la fenêtre NEXUS de p1 reste ouverte !
    assert.equal(afterImp.state.players[1].hand.length, 4);
    assert.equal(afterImp.state.nexusVulnerable, true);
    assert.equal(afterImp.state.pendingNexusDeclarationBy, 'p1');
    assert.equal(afterImp.state.activePlayerIndex, 2);
  });
});

test('ENG-15: règle B1 (REPORT_MISSED_NEXUS pendant CHOOSING_FAMILY), arbitrage FIFO, A1 et faux signalements', async (t) => {
  await t.test('B1 FIFO : DECLARE_NEXUS en premier clôture la vulnérabilité et préserve CHOOSING_FAMILY puis le +4 de SURCHARGE', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [
        card('draw1', 'CRISTAL_1'),
        card('draw2', 'CRISTAL_2'),
        card('draw3', 'CRISTAL_3'),
        card('draw4', 'CRISTAL_4'),
        card('draw5', 'CRISTAL_5'),
      ],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_last', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'CRISTAL_8'), card('h3_2', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const afterSur = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(afterSur.ok, true);
    assert.equal(afterSur.state.phase, 'CHOOSING_FAMILY');
    assert.equal(afterSur.state.nexusVulnerable, true);
    assert.equal(afterSur.state.pendingNexusDeclarationBy, 'p1');

    // FIFO 1 : DECLARE_NEXUS passe avant REPORT_MISSED_NEXUS
    const afterDecl = dispatchGameAction(afterSur.state, {
      type: 'DECLARE_NEXUS',
      playerId: 'p1',
    });
    assert.equal(afterDecl.ok, true);
    assert.equal(afterDecl.state.phase, 'CHOOSING_FAMILY');
    assert.equal(afterDecl.state.players[0].nexusDeclared, true);
    assert.equal(afterDecl.state.nexusVulnerable, false);
    assert.equal(afterDecl.state.pendingNexusDeclarationBy, null);
    assert.equal(afterDecl.state.pendingFamilyChoice?.sourceCategory, 'SURCHARGE');

    // FIFO 2 : REPORT_MISSED_NEXUS suivant est refusé sans pénalité
    const lateReport = dispatchGameAction(afterDecl.state, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'p2',
    });
    assert.equal(lateReport.ok, false);
    if (!lateReport.ok) {
      assert.equal(lateReport.errorCode, 'NEXUS_REPORT_NOT_APPLICABLE');
      assert.equal(lateReport.errorMessage, 'Signalement non applicable');
    }

    // Le choix de famille engagé aboutit normalement avec le +4 sans duplication
    const afterChoose = dispatchGameAction(afterDecl.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'OMBRE',
    });
    assert.equal(afterChoose.ok, true);
    assert.equal(afterChoose.state.phase, 'PLAYING');
    assert.equal(afterChoose.state.activeFamily, 'OMBRE');
    assert.equal(afterChoose.state.players[1].hand.length, 6);
    assert.equal(afterChoose.state.activePlayerIndex, 2);
  });

  await t.test('B1 FIFO : REPORT_MISSED_NEXUS en premier pendant CHOOSING_FAMILY inflige +2 puis le choix de famille et le +4 s’exécutent normalement', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [
        card('draw1', 'CRISTAL_1'),
        card('draw2', 'CRISTAL_2'),
        card('draw3', 'CRISTAL_3'),
        card('draw4', 'CRISTAL_4'),
        card('draw5', 'CRISTAL_5'),
        card('draw6', 'CRISTAL_6'),
      ],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_last', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'CRISTAL_8'), card('h3_2', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const afterSur = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(afterSur.ok, true);

    // FIFO 1 : p2 signale pendant CHOOSING_FAMILY -> p1 pioche 2 cartes, CHOOSING_FAMILY reste actif
    const afterReport = dispatchGameAction(afterSur.state, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'p2',
      targetPlayerId: 'p1',
    });
    assert.equal(afterReport.ok, true);
    assert.equal(afterReport.state.phase, 'CHOOSING_FAMILY');
    assert.equal(afterReport.state.players[0].hand.length, 3);
    assert.equal(afterReport.state.players[0].nexusDeclared, false);
    assert.equal(afterReport.state.nexusVulnerable, false);
    assert.equal(afterReport.state.pendingNexusDeclarationBy, null);
    assert.equal(afterReport.state.pendingFamilyChoice?.sourceCategory, 'SURCHARGE');

    // FIFO 2 : DECLARE_NEXUS tardif de p1 est rejeté
    const lateDeclare = dispatchGameAction(afterReport.state, {
      type: 'DECLARE_NEXUS',
      playerId: 'p1',
    });
    assert.equal(lateDeclare.ok, false);
    if (!lateDeclare.ok) assert.equal(lateDeclare.errorCode, 'NEXUS_DECLARATION_NOT_ALLOWED');

    // Ensuite p1 choisit la famille : le +4 s'applique normalement à p2 (sans annulation ni duplication)
    const afterChoose = dispatchGameAction(afterReport.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'CRISTAL',
    });
    assert.equal(afterChoose.ok, true);
    assert.equal(afterChoose.state.phase, 'PLAYING');
    assert.equal(afterChoose.state.activeFamily, 'CRISTAL');
    assert.equal(afterChoose.state.players[1].hand.length, 6);
    assert.equal(afterChoose.state.drawPile.length, 0);
    assert.equal(afterChoose.state.activePlayerIndex, 2);
  });

  await t.test('B1 + A1 : si REPORT_MISSED_NEXUS pendant CHOOSING_FAMILY épuise la pioche -> GAME_OVER / DECK_EXHAUSTED immédiat sans +4 ni CHOOSE_FAMILY', () => {
    // 0 carte en pioche, AUBE_4 seul sous SURCHARGE -> k = 1 < 2 pour le signalement
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_last', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const afterSur = dispatchGameAction(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(afterSur.ok, true);
    assert.equal(afterSur.state.phase, 'CHOOSING_FAMILY');

    const afterReport = dispatchGameAction(afterSur.state, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'p2',
    });
    assert.equal(afterReport.ok, true);
    assert.equal(afterReport.state.phase, 'GAME_OVER');
    assert.equal(afterReport.state.endReason, 'DECK_EXHAUSTED');
    assert.equal(afterReport.state.pendingFamilyChoice, null);
    // p1 a reçu l'unique carte disponible (AUBE_4) -> 2 cartes contre 1 pour p2 -> p2 gagne
    assert.equal(afterReport.state.players[0].hand.length, 2);
    assert.deepEqual(afterReport.state.winners, ['p2']);
    assert.equal(
      afterReport.events.some((e) => e.type === 'ATTACK_PENALTY_APPLIED'),
      false,
    );

    const attemptChooseAfterEnd = dispatchGameAction(afterReport.state, {
      type: 'CHOOSE_FAMILY',
      playerId: 'p1',
      family: 'CRISTAL',
    });
    assert.equal(attemptChooseAfterEnd.ok, false);
    if (!attemptChooseAfterEnd.ok) {
      assert.equal(attemptChooseAfterEnd.errorCode, 'GAME_ALREADY_OVER');
    }
  });

  await t.test('faux signalement : retourne "Signalement non applicable", 0 pénalité, aucune fuite ni mutation', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_1'), card('draw2', 'CRISTAL_2')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'AUBE_5'), card('h1_2', 'OMBRE_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const snapshot = structuredClone(state);
    const falseReport = dispatchGameAction(state, {
      type: 'REPORT_MISSED_NEXUS',
      reporterId: 'p2',
      targetPlayerId: 'p1',
    });
    assert.equal(falseReport.ok, false);
    if (!falseReport.ok) {
      assert.equal(falseReport.errorCode, 'NEXUS_REPORT_NOT_APPLICABLE');
      assert.equal(falseReport.errorMessage, 'Signalement non applicable');
    }
    assert.equal(falseReport.events.length, 0);
    assert.deepEqual(falseReport.state, snapshot);
  });
});

test('ENG-09: DRAW_CARD — refus si carte jouable, pioche non jouable/jouable immédiate, réinitialisation nexusPreDeclared et clôture fenêtre NEXUS', async (t) => {
  await t.test('refuse DRAW_CARD avec VOLUNTARY_DRAW_FORBIDDEN si carte jouable et allowVoluntaryDraw=false, ainsi que les appels invalides', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'AUBE_9'), card('h1_2', 'OMBRE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const snapshot = structuredClone(state);
    const forbidden = dispatchGameAction(state, {
      type: 'DRAW_CARD',
      playerId: 'p1',
    });
    assert.equal(forbidden.ok, false);
    if (!forbidden.ok) {
      assert.equal(forbidden.errorCode, 'VOLUNTARY_DRAW_FORBIDDEN');
    }
    assert.equal(forbidden.events.length, 0);
    assert.deepEqual(forbidden.state, snapshot);

    const wrongTurn = dispatchGameAction(state, {
      type: 'DRAW_CARD',
      playerId: 'p2',
    });
    assert.equal(wrongTurn.ok, false);
    if (!wrongTurn.ok) assert.equal(wrongTurn.errorCode, 'NOT_YOUR_TURN');

    const unknownPlayer = dispatchGameAction(state, {
      type: 'DRAW_CARD',
      playerId: 'ghost',
    });
    assert.equal(unknownPlayer.ok, false);
    if (!unknownPlayer.ok) assert.equal(unknownPlayer.errorCode, 'INVALID_PLAYER');

    const choosingState: GameState = {
      ...state,
      phase: 'CHOOSING_FAMILY',
      pendingFamilyChoice: {
        playerId: 'p1',
        cardInstanceId: 'x',
        sourceCategory: 'PORTAIL',
        variantId: 'UNIVERSAL_PORTAIL',
        pendingAttackDrawCount: 0,
      },
    };
    const wrongPhase = dispatchGameAction(choosingState, {
      type: 'DRAW_CARD',
      playerId: 'p1',
    });
    assert.equal(wrongPhase.ok, false);
    if (!wrongPhase.ok) assert.equal(wrongPhase.errorCode, 'INVALID_PHASE');
  });

  await t.test('autorise DRAW_CARD volontaire si allowVoluntaryDraw=true', () => {
    const voluntaryConfig: NexusGameConfig = {
      ...NEXUS_DEFAULT_CONFIG,
      rules: {
        ...NEXUS_DEFAULT_CONFIG.rules,
        allowVoluntaryDraw: true,
      },
    };
    const state = buildControlledState({
      config: voluntaryConfig,
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_9')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'AUBE_9'), card('h1_2', 'OMBRE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const res = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(res.ok, true);
    assert.equal(res.state.players[0].hand.length, 3);
    assert.equal(res.state.activePlayerIndex, 1);
  });

  await t.test('pioche non jouable passe le tour, réinitialise nexusPreDeclared et clôture une fenêtre NEXUS ouverte', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_9'), card('draw2', 'BRAISE_8')],
      activePlayerIndex: 0,
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'p2',
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'OMBRE_1'), card('h1_2', 'ONDE_2')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_7')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, {
      type: 'DRAW_CARD',
      playerId: 'p1',
      timestamp: 500,
    });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'PLAYING');
    assert.equal(res.state.players[0].hand.length, 3);
    assert.equal(res.state.players[0].hand[2].instanceId, 'draw1');
    assert.equal(res.state.players[0].nexusPreDeclared, false);
    assert.equal(res.state.players[0].nexusDeclared, false);
    assert.equal(res.state.nexusVulnerable, false);
    assert.equal(res.state.pendingNexusDeclarationBy, null);
    assert.equal(res.state.activePlayerIndex, 1);
    assert.equal(res.state.drawPile.length, 1);
    assert.equal(res.state.turnStartedAt, 500);

    const drawnEv = res.events.find((e) => e.type === 'CARD_DRAWN');
    assert.ok(drawnEv && drawnEv.type === 'CARD_DRAWN');
    assert.equal(drawnEv.payload.isPenalty, false);
    assert.equal(drawnEv.payload.count, 1);
    assert.equal(drawnEv.payload.drawnCards?.[0].instanceId, 'draw1');

    const turnEv = res.events.find((e) => e.type === 'TURN_CHANGED');
    assert.ok(turnEv && turnEv.type === 'TURN_CHANGED');
    assert.equal(turnEv.payload.previousPlayerId, 'p1');
    assert.equal(turnEv.payload.activePlayerId, 'p2');
  });

  await t.test('pioche jouable avec allowPlayDrawnCardImmediately=true conserve le tour et permet de jouer immédiatement', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw_playable', 'AUBE_9')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'OMBRE_1'), card('h1_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const drawn = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(drawn.ok, true);
    assert.equal(drawn.state.activePlayerIndex, 0);
    assert.equal(drawn.state.players[0].hand.length, 3);
    assert.equal(drawn.events.some((e) => e.type === 'TURN_CHANGED'), false);

    // Impossible de piocher une seconde fois alors qu'une carte jouable est en main
    const secondDraw = dispatchGameAction(drawn.state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(secondDraw.ok, false);
    if (!secondDraw.ok) assert.equal(secondDraw.errorCode, 'VOLUNTARY_DRAW_FORBIDDEN');

    // La carte piochée est immédiatement jouable
    const playedDrawn = dispatchGameAction(drawn.state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'draw_playable',
    });
    assert.equal(playedDrawn.ok, true);
    assert.equal(playedDrawn.state.activePlayerIndex, 1);
    assert.equal(playedDrawn.state.players[0].hand.length, 2);
  });

  await t.test('pioche jouable avec allowPlayDrawnCardImmediately=false passe immédiatement le tour', () => {
    const noImmediatePlayConfig: NexusGameConfig = {
      ...NEXUS_DEFAULT_CONFIG,
      rules: {
        ...NEXUS_DEFAULT_CONFIG.rules,
        allowPlayDrawnCardImmediately: false,
      },
    };
    const state = buildControlledState({
      config: noImmediatePlayConfig,
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw_playable', 'AUBE_9')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'OMBRE_1'), card('h1_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const drawn = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(drawn.ok, true);
    assert.equal(drawn.state.activePlayerIndex, 1);
    assert.equal(drawn.state.players[0].hand.length, 3);
    assert.equal(drawn.events.some((e) => e.type === 'TURN_CHANGED'), true);
  });
});

test('ENG-10: exception dernière carte (EMPTY_HAND) pour toutes les catégories et verrouillage GAME_OVER permanent', async (t) => {
  const lastCardVariants: readonly CardInstance['variantId'][] = [
    'AUBE_7',
    'AUBE_IMPULSION',
    'AUBE_INVERSION',
    'AUBE_BOUCLIER',
    'UNIVERSAL_PORTAIL',
    'UNIVERSAL_SURCHARGE',
  ];

  for (const variantId of lastCardVariants) {
    await t.test(`dernière carte ${variantId} termine immédiatement la manche sans effet différé`, () => {
      const state = buildControlledState({
        activeFamily: 'AUBE',
        discardPile: [card('d1', 'AUBE_4')],
        drawPile: [
          card('draw1', 'CRISTAL_1'),
          card('draw2', 'CRISTAL_2'),
          card('draw3', 'CRISTAL_3'),
          card('draw4', 'CRISTAL_4'),
        ],
        nexusVulnerable: true,
        pendingNexusDeclarationBy: 'p1',
        players: [
          {
            id: 'p1',
            name: 'J1',
            type: 'HUMAN',
            seatIndex: 0,
            hand: [card('last_card', variantId)],
            nexusPreDeclared: false,
            nexusDeclared: true,
            connected: true,
          },
          {
            id: 'p2',
            name: 'J2',
            type: 'AI',
            aiDifficulty: 'NORMAL',
            seatIndex: 1,
            hand: [card('h2_1', 'ONDE_5'), card('h2_2', 'ONDE_6')],
            nexusPreDeclared: false,
            nexusDeclared: false,
            connected: true,
          },
        ],
      });

      const res = dispatchGameAction(state, {
        type: 'PLAY_CARD',
        playerId: 'p1',
        cardInstanceId: 'last_card',
      });
      assert.equal(res.ok, true);
      assert.equal(res.state.phase, 'GAME_OVER');
      assert.equal(res.state.endReason, 'EMPTY_HAND');
      assert.deepEqual(res.state.winners, ['p1']);
      assert.equal(res.state.pendingFamilyChoice, null);
      assert.equal(res.state.nexusVulnerable, false);
      assert.equal(res.state.pendingNexusDeclarationBy, null);
      assert.equal(res.state.players[0].hand.length, 0);
      assert.equal(res.state.players[0].nexusDeclared, false);
      assert.equal(res.state.players[1].hand.length, 2);
      assert.equal(res.state.drawPile.length, 4);

      assert.equal(res.state.standings[0].playerId, 'p1');
      assert.equal(res.state.standings[0].cardCount, 0);
      assert.equal(res.state.standings[0].points, 0);
      assert.equal(res.state.standings[0].rank, 1);
      assert.equal(res.state.standings[0].isWinner, true);
      assert.equal(res.state.standings[1].playerId, 'p2');
      assert.equal(res.state.standings[1].points, 11);
      assert.equal(res.state.standings[1].rank, 2);
      assert.equal(res.state.standings[1].isWinner, false);

      // Aucun effet différé ni changement de tour après dernière carte
      assert.equal(res.events.some((e) => e.type === 'FAMILY_CHOICE_REQUIRED'), false);
      assert.equal(res.events.some((e) => e.type === 'ATTACK_PENALTY_APPLIED'), false);
      assert.equal(res.events.some((e) => e.type === 'DIRECTION_REVERSED'), false);
      assert.equal(res.events.some((e) => e.type === 'PLAYER_SKIPPED'), false);
      assert.equal(res.events.some((e) => e.type === 'TURN_CHANGED'), false);
      assert.equal(res.events.some((e) => e.type === 'GAME_OVER'), true);

      // Verrouillage permanent : aucune action autorisée après GAME_OVER
      const gameOverSnapshot = structuredClone(res.state);
      const blockedActions = [
        dispatchGameAction(res.state, { type: 'PLAY_CARD', playerId: 'p2', cardInstanceId: 'h2_1' }),
        dispatchGameAction(res.state, { type: 'DRAW_CARD', playerId: 'p2' }),
        dispatchGameAction(res.state, { type: 'CHOOSE_FAMILY', playerId: 'p1', family: 'ONDE' }),
        dispatchGameAction(res.state, { type: 'DECLARE_NEXUS', playerId: 'p2' }),
        dispatchGameAction(res.state, { type: 'REPORT_MISSED_NEXUS', reporterId: 'p2', targetPlayerId: 'p1' }),
      ];
      for (const blocked of blockedActions) {
        assert.equal(blocked.ok, false);
        if (!blocked.ok) {
          assert.equal(blocked.errorCode, 'GAME_ALREADY_OVER');
        }
        assert.equal(blocked.events.length, 0);
        assert.deepEqual(blocked.state, gameOverSnapshot);
      }
    });
  }
});

test('ENG-11: recyclage de la défausse — conservation de la carte supérieure, mélange déterministe, 0 perte/duplication et conservation de lastNumericValue', async (t) => {
  await t.test('recycle uniquement sous la carte supérieure, conserve lastNumericValue=7 et reste déterministe', () => {
    const initialState = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d_init', 'AUBE_2')],
      lastNumericValue: 2,
      drawPile: [],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_num7', 'AUBE_7'), card('h1_keep', 'CRISTAL_1')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_bouclier', 'ONDE_BOUCLIER'), card('h2_imp', 'AUBE_IMPULSION')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_match7', 'BRAISE_7'), card('h3_other', 'CRISTAL_4')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    // Vérifie qu'un coup numérique met bien à jour lastNumericValue dans le flux normal
    const afterP1 = dispatchGameAction(initialState, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_num7',
    });
    assert.equal(afterP1.ok, true);
    assert.equal(afterP1.state.lastNumericValue, 7);
    assert.equal(afterP1.state.discardPile.length, 2);

    // Puis vérifie le recyclage complet avec une carte spéciale au sommet de la défausse
    const stateWithSpecialTop = buildControlledState({
      activeFamily: 'ONDE',
      discardPile: [
        card('d_base1', 'BRAISE_1'),
        card('d_base2', 'CRISTAL_3'),
        card('d_num7', 'AUBE_7'),
        card('d_top_special', 'ONDE_BOUCLIER'),
      ],
      lastNumericValue: 7,
      drawPile: [],
      activePlayerIndex: 0,
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_unplayable1', 'BRAISE_4'), card('h1_unplayable2', 'CRISTAL_9')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_match7', 'BRAISE_7'), card('h2_other', 'CRISTAL_5')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const totalIdsBefore = [
      ...stateWithSpecialTop.players.flatMap((p) => p.hand.map((c) => c.instanceId)),
      ...stateWithSpecialTop.drawPile.map((c) => c.instanceId),
      ...stateWithSpecialTop.discardPile.map((c) => c.instanceId),
    ].sort();

    const resA = dispatchGameAction(
      stateWithSpecialTop,
      { type: 'DRAW_CARD', playerId: 'p1' },
      { rng: createMulberry32(999) },
    );
    const resB = dispatchGameAction(
      stateWithSpecialTop,
      { type: 'DRAW_CARD', playerId: 'p1' },
      { rng: createMulberry32(999) },
    );

    assert.equal(resA.ok, true);
    assert.equal(resB.ok, true);
    assert.deepEqual(resA.state, resB.state);

    // Carte supérieure STRICTEMENT conservée en défausse
    assert.equal(resA.state.discardPile.length, 1);
    assert.equal(resA.state.discardPile[0].instanceId, 'd_top_special');
    assert.equal(resA.state.drawPile.length, 2);

    const recycledEv = resA.events.find((e) => e.type === 'DISCARD_RECYCLED');
    assert.ok(recycledEv && recycledEv.type === 'DISCARD_RECYCLED');
    assert.equal(recycledEv.payload.recycledCount, 3);
    assert.equal(recycledEv.payload.newDrawPileCount, 3);

    const totalIdsAfter = [
      ...resA.state.players.flatMap((p) => p.hand.map((c) => c.instanceId)),
      ...resA.state.drawPile.map((c) => c.instanceId),
      ...resA.state.discardPile.map((c) => c.instanceId),
    ].sort();
    assert.deepEqual(totalIdsAfter, totalIdsBefore);
    assert.equal(new Set(totalIdsAfter).size, totalIdsBefore.length);

    // lastNumericValue = 7 conservé malgré le recyclage de AUBE_7 : p2 peut jouer BRAISE_7 !
    assert.equal(resA.state.lastNumericValue, 7);
    if (resA.state.activePlayerIndex === 1) {
      assert.equal(isCardPlayable(resA.state, 'p2', 'h2_match7'), true);
      const p2Play = dispatchGameAction(resA.state, {
        type: 'PLAY_CARD',
        playerId: 'p2',
        cardInstanceId: 'h2_match7',
      });
      assert.equal(p2Play.ok, true);
      assert.equal(p2Play.state.activeFamily, 'BRAISE');
    }
  });
});

test('ENG-12: épuisement total du paquet (DECK_EXHAUSTED), décompte (0-9/20/50), départage et co-vainqueurs', async (t) => {
  await t.test('DRAW_CARD avec pioche vide et défausse à 1 seule carte termine immédiatement avec DECK_EXHAUSTED', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [],
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'p2',
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'OMBRE_8'), card('h1_2', 'CRISTAL_9')], // 2 cartes, 17 pts
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_BOUCLIER')], // 1 carte, 20 pts -> gagne car moins de cartes
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.equal(res.state.endReason, 'DECK_EXHAUSTED');
    assert.equal(res.state.nexusVulnerable, false);
    assert.equal(res.state.pendingNexusDeclarationBy, null);
    assert.equal(res.state.players[0].nexusPreDeclared, false);
    assert.deepEqual(res.state.winners, ['p2']);
    assert.equal(res.state.standings[0].playerId, 'p2');
    assert.equal(res.state.standings[0].cardCount, 1);
    assert.equal(res.state.standings[0].points, 20);
    assert.equal(res.state.standings[0].rank, 1);
    assert.equal(res.state.standings[1].playerId, 'p1');
    assert.equal(res.state.standings[1].cardCount, 2);
    assert.equal(res.state.standings[1].points, 17);
    assert.equal(res.state.standings[1].rank, 2);
    assert.equal(res.events.some((e) => e.type === 'CARD_DRAWN'), false);
    assert.equal(res.events.some((e) => e.type === 'GAME_OVER'), true);
  });

  await t.test('départage aux points (0-9, 20 spéciales familiales, 50 universelles) à nombre de cartes égal', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          // 2 cartes non jouables sur AUBE_4 : CRISTAL_6 (6) + ONDE_BOUCLIER (20) = 26 pts -> 2e
          hand: [card('h1_1', 'CRISTAL_6'), card('h1_2', 'ONDE_BOUCLIER')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          // 2 cartes : BRAISE_0 (0) + ONDE_IMPULSION (20) = 20 pts -> gagne au départage
          hand: [card('h2_1', 'BRAISE_0'), card('h2_2', 'ONDE_IMPULSION')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          // 2 cartes : OMBRE_5 (5) + UNIVERSAL_PORTAIL (50) = 55 pts -> 3e
          hand: [card('h3_1', 'OMBRE_5'), card('h3_2', 'UNIVERSAL_PORTAIL')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.deepEqual(res.state.winners, ['p2']);
    assert.deepEqual(
      res.state.standings.map((s) => ({ id: s.playerId, pts: s.points, rank: s.rank, win: s.isWinner })),
      [
        { id: 'p2', pts: 20, rank: 1, win: true },
        { id: 'p1', pts: 26, rank: 2, win: false },
        { id: 'p3', pts: 55, rank: 3, win: false },
      ],
    );
  });

  await t.test('égalité exacte (même nombre de cartes et mêmes points) -> co-vainqueurs au rang 1', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          // 2 cartes non jouables sur AUBE_4 : OMBRE_5 (5) + CRISTAL_BOUCLIER (20) = 25 pts
          hand: [card('h1_1', 'OMBRE_5'), card('h1_2', 'CRISTAL_BOUCLIER')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          // 2 cartes : BRAISE_6 (6) + UNIVERSAL_SURCHARGE (50) = 56 pts -> rang 3
          hand: [card('h2_1', 'BRAISE_6'), card('h2_2', 'UNIVERSAL_SURCHARGE')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          // 2 cartes : CRISTAL_5 (5) + BRAISE_INVERSION (20) = 25 pts -> co-vainqueur rang 1
          hand: [card('h3_1', 'CRISTAL_5'), card('h3_2', 'BRAISE_INVERSION')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const res = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(res.ok, true);
    assert.equal(res.state.phase, 'GAME_OVER');
    assert.equal(res.state.endReason, 'DECK_EXHAUSTED');
    assert.deepEqual(res.state.winners, ['p1', 'p3']);
    assert.deepEqual(
      res.state.standings.map((s) => ({ id: s.playerId, pts: s.points, rank: s.rank, win: s.isWinner })),
      [
        { id: 'p1', pts: 25, rank: 1, win: true },
        { id: 'p3', pts: 25, rank: 1, win: true },
        { id: 'p2', pts: 56, rank: 3, win: false },
      ],
    );
  });
});

test('ENG-16: gestion des tours, TURN_TIMEOUT (PLAYING / CHOOSING_FAMILY) et cas limites sans blocage', async (t) => {
  await t.test('rejets de TURN_TIMEOUT pour joueur inconnu, hors tour ou après GAME_OVER', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('draw1', 'CRISTAL_1')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'AUBE_2'), card('h1_2', 'OMBRE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const snapshot = structuredClone(state);
    const unknown = dispatchGameAction(state, { type: 'TURN_TIMEOUT', playerId: 'ghost' });
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.equal(unknown.errorCode, 'INVALID_PLAYER');
    assert.deepEqual(unknown.state, snapshot);

    const notYourTurn = dispatchGameAction(state, { type: 'TURN_TIMEOUT', playerId: 'p2' });
    assert.equal(notYourTurn.ok, false);
    if (!notYourTurn.ok) assert.equal(notYourTurn.errorCode, 'NOT_YOUR_TURN');
    assert.deepEqual(notYourTurn.state, snapshot);

    const gameOverState: GameState = { ...state, phase: 'GAME_OVER', endReason: 'EMPTY_HAND' };
    const afterEnd = dispatchGameAction(gameOverState, { type: 'TURN_TIMEOUT', playerId: 'p1' });
    assert.equal(afterEnd.ok, false);
    if (!afterEnd.ok) assert.equal(afterEnd.errorCode, 'GAME_ALREADY_OVER');
  });

  await t.test('TURN_TIMEOUT en PLAYING pioche 1 carte (même jouable), réinitialise nexusPreDeclared, clôture NEXUS et passe le tour', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d_old', 'BRAISE_1'), card('d1', 'AUBE_4')],
      drawPile: [],
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'p2',
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'AUBE_2'), card('h1_2', 'OMBRE_3')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
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

    const timedOut = dispatchGameAction(
      state,
      { type: 'TURN_TIMEOUT', playerId: 'p1', timestamp: 900 },
      { rng: createMulberry32(101) },
    );
    assert.equal(timedOut.ok, true);
    assert.equal(timedOut.state.phase, 'PLAYING');
    assert.equal(timedOut.state.players[0].hand.length, 3);
    assert.equal(timedOut.state.players[0].nexusPreDeclared, false);
    assert.equal(timedOut.state.nexusVulnerable, false);
    assert.equal(timedOut.state.pendingNexusDeclarationBy, null);
    assert.equal(timedOut.state.activePlayerIndex, 1);
    assert.equal(timedOut.state.discardPile.length, 1);
    assert.equal(timedOut.state.discardPile[0].instanceId, 'd1');
    assert.equal(timedOut.state.turnStartedAt, 900);

    const timeoutEv = timedOut.events.find((e) => e.type === 'TURN_TIMED_OUT');
    assert.ok(timeoutEv && timeoutEv.type === 'TURN_TIMED_OUT');
    assert.equal(timeoutEv.payload.duringPhase, 'PLAYING');
    assert.equal(timeoutEv.payload.autoDrawnCount, 1);
    assert.equal(timedOut.events.some((e) => e.type === 'DISCARD_RECYCLED'), true);
    assert.equal(timedOut.events.some((e) => e.type === 'CARD_DRAWN'), true);
    assert.equal(timedOut.events.some((e) => e.type === 'TURN_CHANGED'), true);

    // Si pioche vide et défausse à 1 seule carte -> DECK_EXHAUSTED sans blocage
    const exhaustedTimeout = dispatchGameAction(timedOut.state, {
      type: 'TURN_TIMEOUT',
      playerId: 'p2',
    });
    assert.equal(exhaustedTimeout.ok, true);
    assert.equal(exhaustedTimeout.state.phase, 'GAME_OVER');
    assert.equal(exhaustedTimeout.state.endReason, 'DECK_EXHAUSTED');
  });

  await t.test('TURN_TIMEOUT en CHOOSING_FAMILY sélectionne une famille valide et exécute PORTAIL ou SURCHARGE (+4 / A1)', () => {
    const baseState = buildControlledState({
      activeFamily: 'BRAISE',
      discardPile: [card('d1', 'BRAISE_4')],
      drawPile: [
        card('draw1', 'CRISTAL_1'),
        card('draw2', 'CRISTAL_2'),
        card('draw3', 'CRISTAL_3'),
        card('draw4', 'CRISTAL_4'),
        card('draw5', 'CRISTAL_5'),
      ],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_por', 'UNIVERSAL_PORTAIL'), card('h1_sur', 'UNIVERSAL_SURCHARGE'), card('h1_end', 'OMBRE_8')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'ONDE_1'), card('h2_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 2,
          hand: [card('h3_1', 'AUBE_3'), card('h3_2', 'AUBE_4')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    // Cas PORTAIL
    const afterPortail = dispatchGameAction(baseState, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_por',
    });
    assert.equal(afterPortail.ok, true);
    assert.equal(afterPortail.state.phase, 'CHOOSING_FAMILY');

    const wrongPlayerTimeout = dispatchGameAction(afterPortail.state, {
      type: 'TURN_TIMEOUT',
      playerId: 'p2',
    });
    assert.equal(wrongPlayerTimeout.ok, false);
    if (!wrongPlayerTimeout.ok) assert.equal(wrongPlayerTimeout.errorCode, 'NOT_YOUR_TURN');

    const timeoutPortail = dispatchGameAction(afterPortail.state, {
      type: 'TURN_TIMEOUT',
      playerId: 'p1',
    });
    assert.equal(timeoutPortail.ok, true);
    assert.equal(timeoutPortail.state.phase, 'PLAYING');
    assert.equal(timeoutPortail.state.activeFamily, 'BRAISE');
    assert.equal(timeoutPortail.state.pendingFamilyChoice, null);
    assert.equal(timeoutPortail.state.activePlayerIndex, 1);
    const evPortail = timeoutPortail.events.find((e) => e.type === 'TURN_TIMED_OUT');
    assert.ok(evPortail && evPortail.type === 'TURN_TIMED_OUT');
    assert.equal(evPortail.payload.duringPhase, 'CHOOSING_FAMILY');
    assert.equal(evPortail.payload.autoChosenFamily, 'BRAISE');
    assert.equal(timeoutPortail.events.some((e) => e.type === 'PORTAL_RESONANCE'), true);

    // Cas SURCHARGE (+4 appliqué à p3 après timeout de p1)
    const stateSurcharge: GameState = {
      ...baseState,
      activePlayerIndex: 0,
    };
    const afterSurcharge = dispatchGameAction(stateSurcharge, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardInstanceId: 'h1_sur',
    });
    assert.equal(afterSurcharge.ok, true);
    const timeoutSurcharge = dispatchGameAction(afterSurcharge.state, {
      type: 'TURN_TIMEOUT',
      playerId: 'p1',
    });
    assert.equal(timeoutSurcharge.ok, true);
    assert.equal(timeoutSurcharge.state.phase, 'PLAYING');
    assert.equal(timeoutSurcharge.state.players[1].hand.length, 6);
    assert.equal(timeoutSurcharge.state.activePlayerIndex, 2);
    assert.equal(timeoutSurcharge.events.some((e) => e.type === 'ATTACK_PENALTY_APPLIED'), true);
    assert.equal(timeoutSurcharge.events.some((e) => e.type === 'PLAYER_SKIPPED'), true);
  });

  await t.test('simulation complète à 4 joueurs avec enchaînements, timeouts et conservation intégrale des 158 cartes', () => {
    const rng = createMulberry32(202607);
    let state = createInitialGameState({
      gameId: 'full-sim-4p',
      players: makePlayers(4),
      rng,
    });

    const totalBefore =
      state.players.reduce((sum, p) => sum + p.hand.length, 0) +
      state.drawPile.length +
      state.discardPile.length;
    assert.equal(totalBefore, 158);

    let steps = 0;
    const maxSteps = 500;
    while (state.phase !== 'GAME_OVER' && steps < maxSteps) {
      steps += 1;
      if (state.phase === 'CHOOSING_FAMILY') {
        const chooserId = state.pendingFamilyChoice!.playerId;
        const res =
          steps % 5 === 0
            ? dispatchGameAction(state, { type: 'TURN_TIMEOUT', playerId: chooserId }, { rng })
            : dispatchGameAction(state, { type: 'CHOOSE_FAMILY', playerId: chooserId, family: 'ONDE' }, { rng });
        assert.equal(res.ok, true);
        state = res.state;
      } else {
        const active = state.players[state.activePlayerIndex];
        const playable = getPlayableCardIds(state, active.id);
        let res;
        if (steps % 9 === 0) {
          res = dispatchGameAction(state, { type: 'TURN_TIMEOUT', playerId: active.id }, { rng });
        } else if (playable.length > 0) {
          res = dispatchGameAction(
            state,
            { type: 'PLAY_CARD', playerId: active.id, cardInstanceId: playable[0] },
            { rng },
          );
        } else {
          res = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: active.id }, { rng });
        }
        assert.equal(res.ok, true);
        state = res.state;
      }

      const ids = [
        ...state.players.flatMap((p) => p.hand.map((c) => c.instanceId)),
        ...state.drawPile.map((c) => c.instanceId),
        ...state.discardPile.map((c) => c.instanceId),
      ];
      assert.equal(ids.length, 158);
      assert.equal(new Set(ids).size, 158);
    }

    assert.equal(state.phase, 'GAME_OVER');
    assert.ok(state.endReason === 'EMPTY_HAND' || state.endReason === 'DECK_EXHAUSTED');
    assert.ok(state.winners.length >= 1);
    assert.equal(state.standings.length, 4);
  });
});

test('ENG-17: projection privée PlayerView et filtrage strict des événements CARD_DRAWN', async (t) => {
  await t.test('projectPlayerView isole les mains adverses, la pioche, les cartes enfouies et nexusPreDeclared', () => {
    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d_buried_secret', 'OMBRE_0'), card('d_top_visible', 'AUBE_4')],
      drawPile: [card('draw_secret_1', 'CRISTAL_7'), card('draw_secret_2', 'BRAISE_8')],
      activePlayerIndex: 0,
      nexusVulnerable: true,
      pendingNexusDeclarationBy: 'p2',
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_a', 'AUBE_6'), card('h1_b', 'OMBRE_9')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'EXPERT',
          seatIndex: 1,
          hand: [card('h2_secret', 'BRAISE_3')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p3',
          name: 'J3',
          type: 'AI',
          aiDifficulty: 'FACILE',
          seatIndex: 2,
          hand: [card('h3_secret_1', 'ONDE_2'), card('h3_secret_2', 'CRISTAL_5')],
          nexusPreDeclared: true,
          nexusDeclared: false,
          connected: false,
        },
      ],
    });

    assert.throws(() => projectPlayerView(state, 'unknown'), /Unknown viewerId/);

    const view1 = projectPlayerView(state, 'p1');
    assert.equal(view1.viewerId, 'p1');
    assert.deepEqual(
      view1.self.hand.map((c) => c.instanceId),
      ['h1_a', 'h1_b'],
    );
    assert.deepEqual(view1.self.playableCardIds, ['h1_a']);
    assert.equal(view1.self.nexusPreDeclared, true);
    assert.equal(view1.drawPileCount, 2);
    assert.equal(view1.discardCount, 2);
    assert.equal(view1.discardTop.instanceId, 'd_top_visible');
    assert.equal(view1.canDeclareNexus, false); // p1 déjà pré-déclaré à 2 cartes
    assert.equal(view1.canReportMissedNexus, true); // p2 vulnérable à 1 carte
    assert.equal(view1.mustChooseFamily, false);

    assert.equal(view1.opponents.length, 2);
    assert.equal(view1.opponents[0].id, 'p2');
    assert.equal(view1.opponents[0].cardCount, 1);
    assert.equal(view1.opponents[1].id, 'p3');
    assert.equal(view1.opponents[1].cardCount, 2);
    assert.equal(view1.opponents[1].connected, false);

    for (const opp of view1.opponents) {
      assert.equal('hand' in opp, false);
      assert.equal('nexusPreDeclared' in opp, false);
    }

    const serialized1 = JSON.stringify(view1);
    for (const forbiddenId of [
      'h2_secret',
      'h3_secret_1',
      'h3_secret_2',
      'draw_secret_1',
      'draw_secret_2',
      'd_buried_secret',
    ]) {
      assert.equal(serialized1.includes(forbiddenId), false);
    }

    // Vue pour p2 : peut déclarer directement son NEXUS et ne peut pas s'auto-signaler
    const view2 = projectPlayerView(state, 'p2');
    assert.equal(view2.canDeclareNexus, true);
    assert.equal(view2.canReportMissedNexus, false);
    assert.deepEqual(view2.self.playableCardIds, []); // ce n'est pas le tour de p2
    assert.equal(JSON.stringify(view2).includes('h1_a'), false);
    assert.equal(JSON.stringify(view2).includes('h3_secret_1'), false);
  });

  await t.test('projectEventsForRecipient filtre drawnCards des autres joueurs et re-indexe le batch', () => {
    assert.deepEqual(projectEventsForRecipient([], 'p1'), []);

    const state = buildControlledState({
      activeFamily: 'AUBE',
      discardPile: [card('d1', 'AUBE_4')],
      drawPile: [card('secret_draw_1', 'CRISTAL_9'), card('secret_draw_2', 'BRAISE_8')],
      players: [
        {
          id: 'p1',
          name: 'J1',
          type: 'HUMAN',
          seatIndex: 0,
          hand: [card('h1_1', 'OMBRE_1'), card('h1_2', 'ONDE_2')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
        {
          id: 'p2',
          name: 'J2',
          type: 'AI',
          aiDifficulty: 'NORMAL',
          seatIndex: 1,
          hand: [card('h2_1', 'CRISTAL_3'), card('h2_2', 'BRAISE_5')],
          nexusPreDeclared: false,
          nexusDeclared: false,
          connected: true,
        },
      ],
    });

    const drawn = dispatchGameAction(state, { type: 'DRAW_CARD', playerId: 'p1' });
    assert.equal(drawn.ok, true);

    // Pour p1 (le piocheur), drawnCards reste présent
    const eventsForP1 = projectEventsForRecipient(drawn.events, 'p1');
    assert.equal(eventsForP1.length, drawn.events.length);
    const p1DrawEv = eventsForP1.find((e) => e.type === 'CARD_DRAWN');
    assert.ok(p1DrawEv && p1DrawEv.type === 'CARD_DRAWN');
    assert.equal(p1DrawEv.payload.drawnCards?.[0].instanceId, 'secret_draw_1');

    // Pour p2 (l'adversaire), drawnCards est strictement supprimé
    const eventsForP2 = projectEventsForRecipient(drawn.events, 'p2');
    assert.equal(eventsForP2.length, drawn.events.length);
    const p2DrawEv = eventsForP2.find((e) => e.type === 'CARD_DRAWN');
    assert.ok(p2DrawEv && p2DrawEv.type === 'CARD_DRAWN');
    assert.equal('drawnCards' in p2DrawEv.payload, false);
    assert.equal(p2DrawEv.payload.count, 1);
    assert.equal(JSON.stringify(eventsForP2).includes('secret_draw_1'), false);

    eventsForP2.forEach((ev, idx) => {
      assert.equal(ev.batchIndex, idx);
      assert.equal(ev.batchTotal, eventsForP2.length);
    });
  });
});




