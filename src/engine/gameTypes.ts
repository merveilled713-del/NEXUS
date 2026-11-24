import type {
  CardInstance,
  CardVariantId,
  FamilyId,
  NumericValue,
  UniversalSpecialCategory,
} from '../catalog/types';
import type { NexusGameConfig } from '../config/nexus.config';

/**
 * NEXUS — Pure Engine Types (Étape 2 - Lot 1)
 * Zero dependency on DOM, React, AI, animations, or network transport.
 */

export type RngFn = () => number;

export type PlayerType = 'HUMAN' | 'AI';

export type AiDifficulty = 'FACILE' | 'NORMAL' | 'EXPERT';

export type GamePhase = 'PLAYING' | 'CHOOSING_FAMILY' | 'GAME_OVER';

export type TurnDirection = 1 | -1;

export type EndReason = 'EMPTY_HAND' | 'DECK_EXHAUSTED';

export interface PlayerInitInput {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly aiDifficulty?: AiDifficulty;
  readonly seatIndex?: number;
  readonly connected?: boolean;
}

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly aiDifficulty?: AiDifficulty;
  readonly seatIndex: number;
  readonly hand: readonly CardInstance[];
  readonly nexusPreDeclared: boolean;
  readonly nexusDeclared: boolean;
  readonly connected: boolean;
}

export interface PendingFamilyChoice {
  readonly playerId: string;
  readonly cardInstanceId: string;
  readonly sourceCategory: UniversalSpecialCategory;
  readonly variantId: Extract<CardVariantId, 'UNIVERSAL_PORTAIL' | 'UNIVERSAL_SURCHARGE'>;
  readonly pendingAttackDrawCount: 0 | 4;
}

export interface PlayerStanding {
  readonly playerId: string;
  readonly name: string;
  readonly seatIndex: number;
  readonly cardCount: number;
  readonly points: number;
  readonly rank: number;
  readonly isWinner: boolean;
}

export type GameEventType =
  | 'GAME_STARTED'
  | 'CARD_PLAYED'
  | 'CARD_DRAWN'
  | 'DISCARD_RECYCLED'
  | 'DIRECTION_REVERSED'
  | 'PLAYER_SKIPPED'
  | 'ATTACK_PENALTY_APPLIED'
  | 'FAMILY_CHOICE_REQUIRED'
  | 'FAMILY_CHANGED'
  | 'PORTAL_RESONANCE'
  | 'NEXUS_DECLARED'
  | 'NEXUS_PENALTY_REPORTED'
  | 'TURN_CHANGED'
  | 'TURN_TIMED_OUT'
  | 'GAME_OVER';

export interface GameEventPayloadMap {
  readonly GAME_STARTED: {
    readonly playerCount: number;
    readonly activePlayerId: string;
    readonly activeFamily: FamilyId;
    readonly initialDiscard: CardInstance;
    readonly initialHandSize: number;
  };
  readonly CARD_PLAYED: {
    readonly playerId: string;
    readonly card: CardInstance;
    readonly newHandCount: number;
  };
  readonly CARD_DRAWN: {
    readonly playerId: string;
    readonly count: number;
    readonly drawnCards?: readonly CardInstance[];
    readonly isPenalty: boolean;
    readonly penaltySource?: 'IMPULSION' | 'SURCHARGE' | 'MISSED_NEXUS';
    readonly drawPileRemaining: number;
  };
  readonly DISCARD_RECYCLED: {
    readonly recycledCount: number;
    readonly newDrawPileCount: number;
  };
  readonly DIRECTION_REVERSED: {
    readonly direction: TurnDirection;
    readonly actedAsSkipTwoPlayers: boolean;
  };
  readonly PLAYER_SKIPPED: {
    readonly skippedPlayerId: string;
    readonly reason: 'BOUCLIER' | 'INVERSION_2P' | 'IMPULSION' | 'SURCHARGE';
  };
  readonly ATTACK_PENALTY_APPLIED: {
    readonly sourcePlayerId: string;
    readonly targetPlayerId: string;
    readonly requestedCount: number;
    readonly actualCount: number;
    readonly source: 'IMPULSION' | 'SURCHARGE';
    readonly insufficientDeck: boolean;
  };
  readonly FAMILY_CHOICE_REQUIRED: {
    readonly playerId: string;
    readonly sourceCategory: UniversalSpecialCategory;
  };
  readonly FAMILY_CHANGED: {
    readonly playerId: string;
    readonly previousFamily: FamilyId;
    readonly newFamily: FamilyId;
    readonly source: UniversalSpecialCategory;
  };
  readonly PORTAL_RESONANCE: {
    readonly playerId: string;
    readonly chosenFamily: FamilyId;
    readonly cosmeticOnly: true;
  };
  readonly NEXUS_DECLARED: {
    readonly playerId: string;
    readonly mode: 'PRE_DECLARATION' | 'DIRECT_DECLARATION';
  };
  readonly NEXUS_PENALTY_REPORTED: {
    readonly reporterId: string;
    readonly targetPlayerId: string;
    readonly requestedCount: number;
    readonly actualCount: number;
    readonly insufficientDeck: boolean;
  };
  readonly TURN_CHANGED: {
    readonly previousPlayerId: string | null;
    readonly activePlayerId: string;
    readonly direction: TurnDirection;
  };
  readonly TURN_TIMED_OUT: {
    readonly playerId: string;
    readonly duringPhase: Exclude<GamePhase, 'GAME_OVER'>;
    readonly autoDrawnCount: number;
    readonly autoChosenFamily?: FamilyId;
  };
  readonly GAME_OVER: {
    readonly endReason: EndReason;
    readonly winners: readonly string[];
    readonly standings: readonly PlayerStanding[];
  };
}

export type GameEvent<TType extends GameEventType = GameEventType> = {
  readonly [K in TType]: {
    readonly eventId: string;
    readonly stateVersion: number;
    readonly batchIndex: number;
    readonly batchTotal: number;
    readonly timestamp: number;
    readonly type: K;
    readonly payload: GameEventPayloadMap[K];
  };
}[TType];

export interface GameState {
  readonly gameId: string;
  readonly stateVersion: number;
  readonly phase: GamePhase;
  readonly config: NexusGameConfig;
  readonly players: readonly PlayerState[];
  readonly activePlayerIndex: number;
  readonly direction: TurnDirection;
  readonly drawPile: readonly CardInstance[];
  readonly discardPile: readonly CardInstance[];
  readonly activeFamily: FamilyId;
  readonly lastNumericValue: NumericValue | null;
  readonly pendingFamilyChoice: PendingFamilyChoice | null;
  readonly nexusVulnerable: boolean;
  readonly pendingNexusDeclarationBy: string | null;
  readonly endReason: EndReason | null;
  readonly winners: readonly string[];
  readonly standings: readonly PlayerStanding[];
  readonly eventSequence: number;
  readonly turnStartedAt: number;
}

export type GameAction =
  | {
      readonly type: 'PLAY_CARD';
      readonly playerId: string;
      readonly cardInstanceId: string;
      readonly timestamp?: number;
    }
  | {
      readonly type: 'DRAW_CARD';
      readonly playerId: string;
      readonly timestamp?: number;
    }
  | {
      readonly type: 'CHOOSE_FAMILY';
      readonly playerId: string;
      readonly family: FamilyId;
      readonly timestamp?: number;
    }
  | {
      readonly type: 'DECLARE_NEXUS';
      readonly playerId: string;
      readonly timestamp?: number;
    }
  | {
      readonly type: 'REPORT_MISSED_NEXUS';
      readonly reporterId: string;
      readonly targetPlayerId?: string;
      readonly timestamp?: number;
    }
  | {
      readonly type: 'TURN_TIMEOUT';
      readonly playerId: string;
      readonly timestamp?: number;
    };

export type EngineErrorCode =
  | 'GAME_ALREADY_OVER'
  | 'INVALID_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'INVALID_PHASE'
  | 'CARD_NOT_IN_HAND'
  | 'CARD_NOT_PLAYABLE'
  | 'INVALID_FAMILY'
  | 'VOLUNTARY_DRAW_FORBIDDEN'
  | 'NEXUS_DECLARATION_NOT_ALLOWED'
  | 'NEXUS_REPORT_NOT_APPLICABLE'
  | 'INVALID_CONFIG';

export type EngineTransitionResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly events: readonly [];
      readonly errorCode: EngineErrorCode;
      readonly errorMessage: string;
    };

export interface CreateGameOptions {
  readonly gameId?: string;
  readonly players: readonly PlayerInitInput[];
  readonly config?: NexusGameConfig;
  readonly rng?: RngFn;
  readonly timestamp?: number;
}

export interface EngineActionContext {
  readonly rng?: RngFn;
  readonly timestamp?: number;
}

export interface OpponentPublicView {
  readonly id: string;
  readonly name: string;
  readonly type: PlayerType;
  readonly aiDifficulty?: AiDifficulty;
  readonly seatIndex: number;
  readonly cardCount: number;
  readonly nexusDeclared: boolean;
  readonly connected: boolean;
}

export interface SelfPlayerView {
  readonly id: string;
  readonly name: string;
  readonly seatIndex: number;
  readonly hand: readonly CardInstance[];
  readonly playableCardIds: readonly string[];
  readonly nexusPreDeclared: boolean;
  readonly nexusDeclared: boolean;
  readonly connected: boolean;
}

export interface PlayerView {
  readonly gameId: string;
  readonly stateVersion: number;
  readonly phase: GamePhase;
  readonly viewerId: string;
  readonly self: SelfPlayerView;
  readonly opponents: readonly OpponentPublicView[];
  readonly activePlayerId: string;
  readonly direction: TurnDirection;
  readonly drawPileCount: number;
  readonly discardTop: CardInstance;
  readonly discardCount: number;
  readonly activeFamily: FamilyId;
  readonly mustChooseFamily: boolean;
  readonly nexusVulnerable: boolean;
  readonly pendingNexusDeclarationBy: string | null;
  readonly canDeclareNexus: boolean;
  readonly canReportMissedNexus: boolean;
  readonly endReason: EndReason | null;
  readonly winners: readonly string[];
  readonly standings: readonly PlayerStanding[];
}
