import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMatchOutcomeToProgression,
  createInitialProgressionStats,
  getPlayerLevelInfo,
} from '../src/progression/progressionStore';
import {
  createDefaultSoloSetup,
  HUMAN_PLAYER_ID,
  SoloSessionHost,
} from '../src/solo/soloSession';

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('SOLO-01: SoloSessionHost exposes only PlayerView without private opponent hands or draw pile data', () => {
  const setup = createDefaultSoloSetup();
  const host = new SoloSessionHost(setup, {
    rng: createSeededRng(42),
    gameId: 'solo-privacy-check',
    timestamp: 1000,
  });

  const view = host.getHumanView();
  assert.equal(view.self.id, HUMAN_PLAYER_ID);
  assert.equal(view.self.hand.length, 7);
  assert.equal(view.opponents.length, 3);
  assert.equal('drawPile' in view, false);
  assert.equal('players' in view, false);

  for (const opp of view.opponents) {
    assert.equal(opp.cardCount, 7);
    assert.equal('hand' in opp, false);
    assert.equal('nexusPreDeclared' in opp, false);
  }
});

test('SOLO-02: Full end-to-end Solo match finishes cleanly with AI opponents and legal human moves', () => {
  const rng = createSeededRng(2026);
  const setup = {
    ...createDefaultSoloSetup(),
    opponentCount: 2,
    defaultDifficulty: 'NORMAL' as const,
  };
  const host = new SoloSessionHost(setup, {
    rng,
    gameId: 'solo-e2e-1',
    timestamp: 1000,
  });

  let guard = 0;
  while (host.getHumanView().phase !== 'GAME_OVER' && guard < 1200) {
    guard += 1;
    const view = host.getHumanView();

    if (view.canDeclareNexus) {
      const res = host.dispatchHumanAction({
        type: 'DECLARE_NEXUS',
        playerId: HUMAN_PLAYER_ID,
      });
      assert.equal(res.ok, true);
      continue;
    }

    if (view.mustChooseFamily) {
      const res = host.dispatchHumanAction({
        type: 'CHOOSE_FAMILY',
        playerId: HUMAN_PLAYER_ID,
        family: 'ONDE',
      });
      assert.equal(res.ok, true);
      continue;
    }

    if (view.activePlayerId === HUMAN_PLAYER_ID && view.phase === 'PLAYING') {
      if (view.self.playableCardIds.length > 0) {
        const res = host.dispatchHumanAction({
          type: 'PLAY_CARD',
          playerId: HUMAN_PLAYER_ID,
          cardInstanceId: view.self.playableCardIds[0],
        });
        assert.equal(res.ok, true);
      } else {
        const res = host.dispatchHumanAction({
          type: 'DRAW_CARD',
          playerId: HUMAN_PLAYER_ID,
        });
        assert.equal(res.ok, true);
      }
      continue;
    }

    const aiStep = host.stepNextAiAction();
    assert.ok(aiStep !== null, 'AI must advance when human is not blocking');
    assert.equal(aiStep.ok, true);
  }

  const finalView = host.getHumanView();
  assert.equal(finalView.phase, 'GAME_OVER');
  assert.ok(finalView.winners.length >= 1);
  assert.equal(finalView.standings.length, 3);
  assert.ok(guard < 1200, 'Solo game should terminate cleanly well within turn bound');
});

test('SOLO-03: Progression store awards XP, tracks difficulty stats, and unlocks achievements cleanly', () => {
  const initial = createInitialProgressionStats();
  const { next, newlyUnlocked } = applyMatchOutcomeToProgression(initial, {
    won: true,
    difficulty: 'EXPERT',
    turnsPlayed: 18,
    humanCardsPlayed: 9,
    humanSpecialCardsPlayed: 3,
    humanNexusDeclarations: 1,
    humanMissedNexusCaught: 1,
    familiesUsed: ['AUBE', 'BRAISE', 'ONDE', 'OMBRE', 'ECLAIR', 'CRISTAL'],
    variantsUsed: ['AUBE_7', 'PORTAIL'],
    endReason: 'EMPTY_HAND',
  });

  assert.equal(next.gamesPlayed, 1);
  assert.equal(next.gamesWon, 1);
  assert.equal(next.bestWinTurns, 18);
  assert.equal(next.byDifficulty.EXPERT.wins, 1);
  assert.ok(next.xp > 0);
  assert.ok(newlyUnlocked.some((a) => a.id === 'FIRST_SOLO_WIN'));
  assert.ok(newlyUnlocked.some((a) => a.id === 'EXPERT_VICTORY'));
  assert.ok(newlyUnlocked.some((a) => a.id === 'ALL_FAMILIES_PLAYED'));

  const lvl = getPlayerLevelInfo(next.xp);
  assert.ok(lvl.level >= 2);
});
