import type { FamilyId } from '../catalog/types';
import type { AiDifficulty, RngFn } from '../engine/gameTypes';

/**
 * NEXUS — Pure AI Types (Étape 3)
 * Strictement isolé de GameState : consomme uniquement PlayerView et événements publics projetés.
 */

export interface AiPublicMemory {
  readonly lastStateVersion: number;
  readonly lastBatchIndex: number;
  readonly seenEventIdsAtLastVersion: readonly string[];
  readonly timedOutStateVersions: readonly number[];
  readonly trackedActiveFamily: FamilyId;
  readonly playedVariantsCount: Readonly<Record<string, number>>;
  readonly weakPlayabilityConfidence: Readonly<
    Record<string, Partial<Record<FamilyId, number>>>
  >;
}

export interface AiDecisionContext {
  readonly rng?: RngFn;
  readonly memory?: AiPublicMemory;
}

export interface AiScoredCard {
  readonly instanceId: string;
  readonly score: number;
}

export interface AiBenchmarkMetrics {
  readonly difficulty: AiDifficulty;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly winRate: number;
  readonly averageRank: number;
  readonly averageResidualPoints: number;
}

export interface AiBenchmarkSummary {
  readonly seedCount: number;
  readonly rotationsPerSeed: number;
  readonly totalGames: number;
  readonly byDifficulty: Readonly<Record<AiDifficulty, AiBenchmarkMetrics>>;
}
