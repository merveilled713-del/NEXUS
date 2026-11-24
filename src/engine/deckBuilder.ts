import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import type { CardInstance, FamilyId } from '../catalog/types';
import {
  NEXUS_DEFAULT_CONFIG,
  buildDeck,
  validateDeckConfig,
  type NexusGameConfig,
} from '../config/nexus.config';
import type { CreateGameOptions, PlayerInitInput, PlayerState, RngFn } from './gameTypes';

/**
 * NEXUS — Deck Builder & Initial Deal (Étape 2 - Lot 2)
 */

export interface InitialDealResult {
  readonly players: readonly PlayerState[];
  readonly drawPile: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly activeFamily: FamilyId;
}

function isFinitePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 1;
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

export function shuffleCards(
  cards: readonly CardInstance[],
  rng: RngFn = Math.random,
): CardInstance[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const raw = rng();
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`Invalid RNG output: ${String(raw)}`);
    }
    const clamped = raw <= 0 ? 0 : raw >= 1 ? 0.999999999999 : raw;
    const j = Math.floor(clamped * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function validateSetupOptions(options: CreateGameOptions): {
  readonly config: NexusGameConfig;
  readonly normalizedPlayers: readonly PlayerInitInput[];
} {
  const config = options.config ?? NEXUS_DEFAULT_CONFIG;

  const deckCheck = validateDeckConfig(config);
  if (!deckCheck.valid) {
    throw new Error(`Invalid deck configuration: ${deckCheck.errors.join('; ')}`);
  }

  if (
    !isFinitePositiveInteger(config.match.minPlayers) ||
    !isFinitePositiveInteger(config.match.maxPlayers) ||
    config.match.minPlayers < 2 ||
    config.match.maxPlayers > 6 ||
    config.match.minPlayers > config.match.maxPlayers
  ) {
    throw new Error(
      `Invalid player bounds in config: min=${String(config.match.minPlayers)}, max=${String(config.match.maxPlayers)}`,
    );
  }

  if (!isFinitePositiveInteger(config.match.initialHandSize)) {
    throw new Error(`Invalid initialHandSize: ${String(config.match.initialHandSize)}`);
  }

  if (!isFiniteNonNegativeInteger(config.rules.missedNexusPenalty)) {
    throw new Error(`Invalid missedNexusPenalty: ${String(config.rules.missedNexusPenalty)}`);
  }

  if (!isFinitePositiveInteger(config.rules.drawCountWhenUnplayable)) {
    throw new Error(
      `Invalid drawCountWhenUnplayable: ${String(config.rules.drawCountWhenUnplayable)}`,
    );
  }

  const players = options.players;
  if (!Array.isArray(players)) {
    throw new Error('Players list must be an array');
  }

  if (players.length < config.match.minPlayers || players.length > config.match.maxPlayers) {
    throw new Error(
      `Invalid player count ${players.length}: expected between ${config.match.minPlayers} and ${config.match.maxPlayers}`,
    );
  }

  const seenIds = new Set<string>();
  const seenSeats = new Set<number>();
  const normalized: PlayerInitInput[] = [];

  for (let i = 0; i < players.length; i += 1) {
    const p = players[i];
    if (!p || typeof p.id !== 'string' || p.id.trim().length === 0) {
      throw new Error(`Invalid player id at index ${i}`);
    }
    if (seenIds.has(p.id)) {
      throw new Error(`Duplicate player id: ${p.id}`);
    }
    seenIds.add(p.id);

    if (typeof p.name !== 'string' || p.name.trim().length === 0) {
      throw new Error(`Invalid player name for player ${p.id}`);
    }

    if (p.type !== 'HUMAN' && p.type !== 'AI') {
      throw new Error(`Invalid player type for player ${p.id}: ${String(p.type)}`);
    }

    if (
      p.aiDifficulty !== undefined &&
      p.aiDifficulty !== 'FACILE' &&
      p.aiDifficulty !== 'NORMAL' &&
      p.aiDifficulty !== 'EXPERT'
    ) {
      throw new Error(`Invalid AI difficulty for player ${p.id}: ${String(p.aiDifficulty)}`);
    }

    const seatIndex = p.seatIndex ?? i;
    if (!isFiniteNonNegativeInteger(seatIndex) || seatIndex >= players.length) {
      throw new Error(`Invalid seatIndex ${String(seatIndex)} for player ${p.id}`);
    }
    if (seenSeats.has(seatIndex)) {
      throw new Error(`Duplicate seatIndex ${seatIndex}`);
    }
    seenSeats.add(seatIndex);

    normalized.push({
      id: p.id,
      name: p.name,
      type: p.type,
      aiDifficulty: p.type === 'AI' ? (p.aiDifficulty ?? 'NORMAL') : undefined,
      seatIndex,
      connected: p.connected ?? true,
    });
  }

  normalized.sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));

  const requiredCards = players.length * config.match.initialHandSize + 1;
  if (deckCheck.totalCards < requiredCards) {
    throw new Error(
      `Deck size (${deckCheck.totalCards}) is insufficient for ${players.length} players`,
    );
  }

  return { config, normalizedPlayers: normalized };
}

export function dealInitialCards(
  options: CreateGameOptions,
): InitialDealResult {
  const { config, normalizedPlayers } = validateSetupOptions(options);
  const rng = options.rng ?? Math.random;

  const baseDeck = buildDeck(config);
  let pool = shuffleCards(baseDeck, rng);

  const hands: CardInstance[][] = normalizedPlayers.map(() => []);
  let cursor = 0;

  for (let round = 0; round < config.match.initialHandSize; round += 1) {
    for (let pIndex = 0; pIndex < normalizedPlayers.length; pIndex += 1) {
      const card = pool[cursor];
      if (!card) {
        throw new Error('Deck exhausted prematurely during initial deal');
      }
      hands[pIndex].push(card);
      cursor += 1;
    }
  }

  let remainingPool = pool.slice(cursor);

  if (remainingPool.length === 0) {
    throw new Error('No card remaining for initial discard pile');
  }

  if (config.match.firstDiscardMustBeNumeric) {
    const hasNumericInRemaining = remainingPool.some(
      (c) => CARD_CATALOG_BY_ID[c.variantId].kind === 'NUMERIC',
    );

    if (!hasNumericInRemaining) {
      throw new Error(
        'No numeric card remaining after initial deal to start the discard pile',
      );
    }

    const maxReshuffles = remainingPool.length * 4;
    let attempts = 0;

    while (
      CARD_CATALOG_BY_ID[remainingPool[0].variantId].kind !== 'NUMERIC' &&
      attempts < maxReshuffles
    ) {
      const specialCard = remainingPool[0];
      const returnedToPool = [...remainingPool.slice(1), specialCard];
      remainingPool = shuffleCards(returnedToPool, rng);
      attempts += 1;
    }

    // Fallback deterministe si un RNG pathologique/constant maintient une carte speciale en tete
    if (CARD_CATALOG_BY_ID[remainingPool[0].variantId].kind !== 'NUMERIC') {
      const numericIndex = remainingPool.findIndex(
        (c) => CARD_CATALOG_BY_ID[c.variantId].kind === 'NUMERIC',
      );
      if (numericIndex === -1) {
        throw new Error('Unable to select numeric initial discard card');
      }
      const chosen = remainingPool[numericIndex];
      remainingPool = [
        chosen,
        ...remainingPool.slice(0, numericIndex),
        ...remainingPool.slice(numericIndex + 1),
      ];
    }
  }

  const initialDiscard = remainingPool[0];
  const drawPile = remainingPool.slice(1);
  const discardModel = CARD_CATALOG_BY_ID[initialDiscard.variantId];

  if (config.match.firstDiscardMustBeNumeric && discardModel.kind !== 'NUMERIC') {
    throw new Error('Initial discard card must be NUMERIC');
  }

  const activeFamily: FamilyId = discardModel.family ?? 'AUBE';

  const players: PlayerState[] = normalizedPlayers.map((p, idx) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    aiDifficulty: p.aiDifficulty,
    seatIndex: p.seatIndex ?? idx,
    hand: hands[idx],
    nexusPreDeclared: false,
    nexusDeclared: false,
    connected: p.connected ?? true,
  }));

  return {
    players,
    drawPile,
    discardPile: [initialDiscard],
    activeFamily,
  };
}
