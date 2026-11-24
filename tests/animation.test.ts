import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILY_ANIMATION_SPECS,
  getAllFamilyAnimationSpecs,
  getDurationForEffect,
  mapEventsToAnimationSteps,
} from '../src/animation/animationManager';
import { FAMILY_IDS } from '../src/catalog/types';
import type { GameEvent } from '../src/engine/gameTypes';

test('ANI-01: 6 distinct programmatic family play animations exist (one per family)', () => {
  const specs = getAllFamilyAnimationSpecs();
  assert.equal(specs.length, 6);

  const familySet = new Set(specs.map((s) => s.family));
  const patternSet = new Set(specs.map((s) => s.patternStyle));
  const labelSet = new Set(specs.map((s) => s.label));

  assert.equal(familySet.size, 6);
  assert.equal(patternSet.size, 6);
  assert.equal(labelSet.size, 6);

  for (const familyId of FAMILY_IDS) {
    assert.ok(FAMILY_ANIMATION_SPECS[familyId], `Missing family animation spec for ${familyId}`);
  }
});

test('ANI-02: FULL and REDUCED map deal, draw, family play, and all 5 special effects accurately', () => {
  const sampleEvents: readonly GameEvent[] = [
    {
      eventId: 'g1:v1:e1',
      stateVersion: 1,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 1,
      type: 'GAME_STARTED',
      payload: {
        playerCount: 4,
        activePlayerId: 'human-1',
        activeFamily: 'ONDE',
        initialDiscard: { instanceId: 'c0', variantId: 'ONDE_4' },
        initialHandSize: 7,
      },
    },
    {
      eventId: 'g1:v2:e2',
      stateVersion: 2,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 2,
      type: 'CARD_PLAYED',
      payload: {
        playerId: 'human-1',
        card: { instanceId: 'c1', variantId: 'BRAISE_IMPULSION' },
        newHandCount: 6,
      },
    },
    {
      eventId: 'g1:v2:e3',
      stateVersion: 2,
      batchIndex: 1,
      batchTotal: 2,
      timestamp: 2,
      type: 'ATTACK_PENALTY_APPLIED',
      payload: {
        sourcePlayerId: 'human-1',
        targetPlayerId: 'ai-1',
        requestedCount: 2,
        actualCount: 2,
        source: 'IMPULSION',
        insufficientDeck: false,
      },
    },
    {
      eventId: 'g1:v3:e4',
      stateVersion: 3,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 3,
      type: 'DIRECTION_REVERSED',
      payload: { direction: -1, actedAsSkipTwoPlayers: false },
    },
    {
      eventId: 'g1:v4:e5',
      stateVersion: 4,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 4,
      type: 'PLAYER_SKIPPED',
      payload: { skippedPlayerId: 'ai-2', reason: 'BOUCLIER' },
    },
    {
      eventId: 'g1:v5:e6',
      stateVersion: 5,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 5,
      type: 'PORTAL_RESONANCE',
      payload: { playerId: 'human-1', chosenFamily: 'CRISTAL', cosmeticOnly: true },
    },
    {
      eventId: 'g1:v6:e7',
      stateVersion: 6,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 6,
      type: 'CARD_DRAWN',
      payload: { playerId: 'ai-1', count: 1, isPenalty: false, drawPileRemaining: 90 },
    },
    {
      eventId: 'g1:v7:e8',
      stateVersion: 7,
      batchIndex: 0,
      batchTotal: 1,
      timestamp: 7,
      type: 'ATTACK_PENALTY_APPLIED',
      payload: {
        sourcePlayerId: 'ai-1',
        targetPlayerId: 'ai-2',
        requestedCount: 4,
        actualCount: 4,
        source: 'SURCHARGE',
        insufficientDeck: false,
      },
    },
  ];

  const fullSteps = mapEventsToAnimationSteps(sampleEvents, 'FULL');
  const reducedSteps = mapEventsToAnimationSteps(sampleEvents, 'REDUCED');

  assert.equal(fullSteps.length, 8);
  assert.equal(reducedSteps.length, 8);

  assert.deepEqual(
    fullSteps.map((s) => s.kind),
    [
      'DEAL_HAND',
      'CARD_PLAY_FAMILY',
      'IMPULSION_STRIKE',
      'INVERSION_LOOP',
      'BOUCLIER_LOCK',
      'PORTAL_RESONANCE',
      'CARD_DRAW',
      'SURCHARGE_OVERLOAD',
    ],
  );

  assert.equal(fullSteps[1].family, 'BRAISE');
  assert.equal(fullSteps[5].family, 'CRISTAL');

  for (let i = 0; i < fullSteps.length; i += 1) {
    assert.ok(fullSteps[i].durationMs > 0);
    assert.ok(reducedSteps[i].durationMs > 0);
    assert.ok(
      reducedSteps[i].durationMs < fullSteps[i].durationMs,
      'REDUCED duration must be shorter than FULL',
    );
  }
});

test('ANI-03: OFF animation level returns zero duration and produces empty animation steps', () => {
  assert.equal(getDurationForEffect('DEAL_HAND', 'OFF'), 0);
  assert.equal(getDurationForEffect('CARD_PLAY_FAMILY', 'OFF'), 0);
  assert.equal(getDurationForEffect('PORTAL_RESONANCE', 'OFF'), 0);

  const steps = mapEventsToAnimationSteps(
    [
      {
        eventId: 'g1:v1:e1',
        stateVersion: 1,
        batchIndex: 0,
        batchTotal: 1,
        timestamp: 1,
        type: 'CARD_PLAYED',
        payload: {
          playerId: 'human-1',
          card: { instanceId: 'c1', variantId: 'AUBE_7' },
          newHandCount: 6,
        },
      },
    ],
    'OFF',
  );

  assert.deepEqual(steps, []);
});
