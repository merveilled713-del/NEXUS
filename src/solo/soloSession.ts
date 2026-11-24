import { decideAiAction } from '../ai/aiEngine';
import { createAiPublicMemory, updateAiPublicMemory } from '../ai/aiMemory';
import type { AiPublicMemory } from '../ai/aiTypes';
import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import type { FamilyId } from '../catalog/types';
import { NEXUS_DEFAULT_CONFIG, type NexusGameConfig } from '../config/nexus.config';
import { createInitialGame, dispatchGameAction } from '../engine/gameEngine';
import type {
  AiDifficulty,
  EngineTransitionResult,
  GameAction,
  GameEvent,
  GameState,
  PlayerInitInput,
  PlayerView,
  RngFn,
} from '../engine/gameTypes';
import { projectEventsForRecipient, projectPlayerView } from '../engine/projection';
import type { SoloMatchSetup } from '../types/app';

/**
 * NEXUS — Solo Session Host (Étape 5)
 * Encapsule GameState côté session et n'expose à l'interface UI que PlayerView
 * et les événements filtrés par projectEventsForRecipient().
 * L'IA utilise exclusivement decideAiAction(PlayerView) + AiPublicMemory publique.
 */

export const HUMAN_PLAYER_ID = 'human-1';

export const DEFAULT_AI_NAMES: readonly string[] = [
  'Vega',
  'Orion',
  'Lyra',
  'Sirius',
  'Kael',
];

export function createDefaultSoloSetup(): SoloMatchSetup {
  return {
    humanName: 'Commandant',
    opponentCount: 3,
    defaultDifficulty: 'NORMAL',
    opponents: DEFAULT_AI_NAMES.map((name, idx) => ({
      id: `ai-${idx + 1}`,
      name,
      difficulty: 'NORMAL',
    })),
  };
}

export interface SoloActionOutcome {
  readonly ok: boolean;
  readonly errorMessage?: string;
  readonly view: PlayerView;
  readonly publicEventsForHuman: readonly GameEvent[];
}

export interface SoloSessionMetricsSnapshot {
  readonly turnsPlayed: number;
  readonly humanCardsPlayed: number;
  readonly humanSpecialCardsPlayed: number;
  readonly humanNexusDeclarations: number;
  readonly humanMissedNexusCaught: number;
  readonly familiesUsed: readonly FamilyId[];
  readonly variantsUsed: readonly string[];
  readonly primaryDifficulty: AiDifficulty;
}

export class SoloSessionHost {
  private state: GameState;
  private readonly humanId: string;
  private readonly aiMemories: Map<string, AiPublicMemory>;
  private readonly rng: RngFn;
  private readonly primaryDifficulty: AiDifficulty;
  private turnsPlayed = 0;
  private humanCardsPlayed = 0;
  private humanSpecialCardsPlayed = 0;
  private humanNexusDeclarations = 0;
  private humanMissedNexusCaught = 0;
  private readonly familiesUsed = new Set<FamilyId>();
  private readonly variantsUsed = new Set<string>();
  private initialEvents: readonly GameEvent[];

  constructor(
    setup: SoloMatchSetup,
    options?: {
      readonly config?: NexusGameConfig;
      readonly rng?: RngFn;
      readonly gameId?: string;
      readonly timestamp?: number;
    },
  ) {
    this.rng = options?.rng ?? Math.random;
    this.humanId = HUMAN_PLAYER_ID;
    this.primaryDifficulty = setup.defaultDifficulty;

    const cleanHumanName = setup.humanName.trim() || 'Commandant';
    const clampedOpponents = Math.max(1, Math.min(5, setup.opponentCount));

    const players: PlayerInitInput[] = [
      {
        id: this.humanId,
        name: cleanHumanName,
        type: 'HUMAN',
        seatIndex: 0,
        connected: true,
      },
    ];

    for (let i = 0; i < clampedOpponents; i += 1) {
      const opp = setup.opponents[i] ?? {
        id: `ai-${i + 1}`,
        name: DEFAULT_AI_NAMES[i] ?? `Unité ${i + 1}`,
        difficulty: setup.defaultDifficulty,
      };
      players.push({
        id: opp.id,
        name: opp.name.trim() || `Unité ${i + 1}`,
        type: 'AI',
        aiDifficulty: opp.difficulty,
        seatIndex: i + 1,
        connected: true,
      });
    }

    const initial = createInitialGame({
      gameId: options?.gameId ?? `solo-${Date.now()}`,
      players,
      config: options?.config ?? NEXUS_DEFAULT_CONFIG,
      rng: this.rng,
      timestamp: options?.timestamp ?? Date.now(),
    });

    this.state = initial.state;
    this.initialEvents = projectEventsForRecipient(initial.events, this.humanId);
    this.aiMemories = new Map<string, AiPublicMemory>();

    for (const player of this.state.players) {
      if (player.type === 'AI') {
        const aiEvents = projectEventsForRecipient(initial.events, player.id);
        const mem = updateAiPublicMemory(
          createAiPublicMemory(this.state.activeFamily),
          aiEvents,
          projectPlayerView(this.state, player.id),
        );
        this.aiMemories.set(player.id, mem);
      }
    }
  }

  public getHumanView(): PlayerView {
    return projectPlayerView(this.state, this.humanId);
  }

  public consumeInitialEvents(): readonly GameEvent[] {
    const out = this.initialEvents;
    this.initialEvents = [];
    return out;
  }

  public getMetricsSnapshot(): SoloSessionMetricsSnapshot {
    return {
      turnsPlayed: this.turnsPlayed,
      humanCardsPlayed: this.humanCardsPlayed,
      humanSpecialCardsPlayed: this.humanSpecialCardsPlayed,
      humanNexusDeclarations: this.humanNexusDeclarations,
      humanMissedNexusCaught: this.humanMissedNexusCaught,
      familiesUsed: [...this.familiesUsed],
      variantsUsed: [...this.variantsUsed],
      primaryDifficulty: this.primaryDifficulty,
    };
  }

  private applyEngineTransition(result: EngineTransitionResult): SoloActionOutcome {
    if (!result.ok) {
      return {
        ok: false,
        errorMessage: result.errorMessage,
        view: this.getHumanView(),
        publicEventsForHuman: [],
      };
    }

    this.state = result.state;

    for (const ev of result.events) {
      if (ev.type === 'TURN_CHANGED') {
        this.turnsPlayed += 1;
      } else if (ev.type === 'CARD_PLAYED' && ev.payload.playerId === this.humanId) {
        this.humanCardsPlayed += 1;
        const model = CARD_CATALOG_BY_ID[ev.payload.card.variantId];
        this.variantsUsed.add(model.variantId);
        if (model.family) {
          this.familiesUsed.add(model.family);
        }
        if (model.kind !== 'NUMERIC') {
          this.humanSpecialCardsPlayed += 1;
        }
      } else if (ev.type === 'NEXUS_DECLARED' && ev.payload.playerId === this.humanId) {
        this.humanNexusDeclarations += 1;
      } else if (
        ev.type === 'NEXUS_PENALTY_REPORTED' &&
        ev.payload.reporterId === this.humanId
      ) {
        this.humanMissedNexusCaught += 1;
      }
    }

    for (const player of this.state.players) {
      if (player.type === 'AI') {
        const aiEvents = projectEventsForRecipient(result.events, player.id);
        const prevMem =
          this.aiMemories.get(player.id) ?? createAiPublicMemory(this.state.activeFamily);
        const aiView = projectPlayerView(this.state, player.id);
        this.aiMemories.set(player.id, updateAiPublicMemory(prevMem, aiEvents, aiView));
      }
    }

    return {
      ok: true,
      view: this.getHumanView(),
      publicEventsForHuman: projectEventsForRecipient(result.events, this.humanId),
    };
  }

  public dispatchHumanAction(action: GameAction): SoloActionOutcome {
    const result = dispatchGameAction(this.state, action, {
      rng: this.rng,
      timestamp: Date.now(),
    });
    return this.applyEngineTransition(result);
  }

  /**
   * Détermine et exécute la prochaine action d'une IA si une IA doit agir
   * (déclaration/signalement NEXUS prioritaire ou tour actif / choix de famille).
   */
  public stepNextAiAction(): SoloActionOutcome | null {
    if (this.state.phase === 'GAME_OVER') {
      return null;
    }

    // 1. Vérifier d'abord les IA ayant une opportunité immédiate de déclaration ou de signalement NEXUS
    for (const player of this.state.players) {
      if (player.type !== 'AI') continue;
      const aiView = projectPlayerView(this.state, player.id);
      if (aiView.canDeclareNexus || aiView.canReportMissedNexus) {
        const action = decideAiAction(aiView, player.aiDifficulty ?? 'NORMAL', {
          rng: this.rng,
          memory: this.aiMemories.get(player.id),
        });
        if (action && (action.type === 'DECLARE_NEXUS' || action.type === 'REPORT_MISSED_NEXUS')) {
          const res = dispatchGameAction(this.state, action, {
            rng: this.rng,
            timestamp: Date.now(),
          });
          if (res.ok) {
            return this.applyEngineTransition(res);
          }
        }
      }
    }

    // 2. Sinon, vérifier le joueur actif (en PLAYING ou CHOOSING_FAMILY)
    const activePlayer = this.state.players[this.state.activePlayerIndex];
    if (!activePlayer || activePlayer.type !== 'AI') {
      return null;
    }

    const aiView = projectPlayerView(this.state, activePlayer.id);
    const action = decideAiAction(aiView, activePlayer.aiDifficulty ?? 'NORMAL', {
      rng: this.rng,
      memory: this.aiMemories.get(activePlayer.id),
    });

    if (!action) {
      return null;
    }

    const res = dispatchGameAction(this.state, action, {
      rng: this.rng,
      timestamp: Date.now(),
    });
    return this.applyEngineTransition(res);
  }
}
