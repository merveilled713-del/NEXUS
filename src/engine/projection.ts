import type {
  GameEvent,
  GameState,
  OpponentPublicView,
  PlayerView,
  SelfPlayerView,
} from './gameTypes';
import { getDiscardTop, getPlayableCardIds } from './rules';

/**
 * NEXUS — Privacy-Safe Engine Projection (Étape 2 - Lot 7)
 * Empêche toute fuite des mains adverses, de la pioche, de nexusPreDeclared adverse
 * ou des cartes piochées dans les événements destinés aux autres joueurs.
 */

export function projectPlayerView(state: GameState, viewerId: string): PlayerView {
  const viewerIndex = state.players.findIndex((p) => p.id === viewerId);
  if (viewerIndex === -1) {
    throw new Error(`Unknown viewerId: ${viewerId}`);
  }

  const viewer = state.players[viewerIndex];
  const activePlayer = state.players[state.activePlayerIndex];

  const self: SelfPlayerView = {
    id: viewer.id,
    name: viewer.name,
    seatIndex: viewer.seatIndex,
    hand: [...viewer.hand],
    playableCardIds: state.phase === 'PLAYING' ? getPlayableCardIds(state, viewer.id) : [],
    nexusPreDeclared: viewer.nexusPreDeclared,
    nexusDeclared: viewer.nexusDeclared,
    connected: viewer.connected,
  };

  const opponents: OpponentPublicView[] = [];
  const totalPlayers = state.players.length;
  for (let offset = 1; offset < totalPlayers; offset += 1) {
    const idx = (viewerIndex + offset) % totalPlayers;
    const opp = state.players[idx];
    opponents.push({
      id: opp.id,
      name: opp.name,
      type: opp.type,
      aiDifficulty: opp.aiDifficulty,
      seatIndex: opp.seatIndex,
      cardCount: opp.hand.length,
      nexusDeclared: opp.nexusDeclared,
      connected: opp.connected,
    });
  }

  const canDirectDeclareNexus =
    state.phase !== 'GAME_OVER' &&
    state.nexusVulnerable &&
    state.pendingNexusDeclarationBy === viewer.id &&
    viewer.hand.length === 1 &&
    !viewer.nexusDeclared;

  const canPreDeclareNexus =
    state.phase === 'PLAYING' &&
    activePlayer?.id === viewer.id &&
    viewer.hand.length === 2 &&
    !viewer.nexusPreDeclared &&
    state.config.rules.requireNexusDeclaration;

  const pendingTarget =
    state.pendingNexusDeclarationBy !== null
      ? state.players.find((p) => p.id === state.pendingNexusDeclarationBy)
      : undefined;

  const canReportMissedNexus =
    (state.phase === 'PLAYING' || state.phase === 'CHOOSING_FAMILY') &&
    state.nexusVulnerable &&
    state.pendingNexusDeclarationBy !== null &&
    state.pendingNexusDeclarationBy !== viewer.id &&
    pendingTarget !== undefined &&
    pendingTarget.hand.length === 1 &&
    !pendingTarget.nexusDeclared;

  return {
    gameId: state.gameId,
    stateVersion: state.stateVersion,
    phase: state.phase,
    viewerId: viewer.id,
    self,
    opponents,
    activePlayerId: activePlayer.id,
    direction: state.direction,
    drawPileCount: state.drawPile.length,
    discardTop: getDiscardTop(state),
    discardCount: state.discardPile.length,
    activeFamily: state.activeFamily,
    mustChooseFamily:
      state.phase === 'CHOOSING_FAMILY' &&
      state.pendingFamilyChoice?.playerId === viewer.id,
    nexusVulnerable: state.nexusVulnerable,
    pendingNexusDeclarationBy: state.pendingNexusDeclarationBy,
    canDeclareNexus: canDirectDeclareNexus || canPreDeclareNexus,
    canReportMissedNexus,
    endReason: state.endReason,
    winners: [...state.winners],
    standings: state.standings.map((s) => ({ ...s })),
  };
}

export function projectEventsForRecipient(
  events: readonly GameEvent[],
  viewerId: string,
): readonly GameEvent[] {
  if (events.length === 0) {
    return [];
  }

  const batchTotal = events.length;
  return events.map((event, batchIndex): GameEvent => {
    if (event.type === 'CARD_DRAWN' && event.payload.playerId !== viewerId) {
      const { drawnCards: _redacted, ...publicPayload } = event.payload;
      return {
        ...event,
        batchIndex,
        batchTotal,
        payload: publicPayload,
      };
    }

    if (event.batchIndex === batchIndex && event.batchTotal === batchTotal) {
      return event;
    }

    return {
      ...event,
      batchIndex,
      batchTotal,
    } as GameEvent;
  });
}
