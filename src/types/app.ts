import type { FamilyId } from '../catalog/types';
import type { AiDifficulty } from '../engine/gameTypes';

export type AppScreen =
  | 'TITLE'
  | 'SOLO_SETUP'
  | 'TABLE'
  | 'SETTINGS'
  | 'RULES'
  | 'COLLECTION'
  | 'STATS';

export type AnimationLevel = 'FULL' | 'REDUCED' | 'OFF';

export type AiPacing = 'FAST' | 'NORMAL';

export type TableThemeId = 'VOID_STELLAR' | 'SOLAR_FORGE' | 'QUANTUM_ABYSS';

export interface NexusSettings {
  readonly animationLevel: AnimationLevel;
  readonly glowEnabled: boolean;
  readonly soundMuted: boolean;
  readonly soundVolume: number; // 0 to 1
  readonly aiPacing: AiPacing;
  readonly tableTheme: TableThemeId;
}

export const DEFAULT_SETTINGS: NexusSettings = Object.freeze({
  animationLevel: 'FULL',
  glowEnabled: true,
  soundMuted: false,
  soundVolume: 0.65,
  aiPacing: 'NORMAL',
  tableTheme: 'VOID_STELLAR',
});

export interface SoloOpponentSetup {
  readonly id: string;
  readonly name: string;
  readonly difficulty: AiDifficulty;
}

export interface SoloMatchSetup {
  readonly humanName: string;
  readonly opponentCount: number; // 1..5 (total players 2..6)
  readonly defaultDifficulty: AiDifficulty;
  readonly opponents: readonly SoloOpponentSetup[];
}

export type AchievementId =
  | 'FIRST_MATCH'
  | 'FIRST_SOLO_WIN'
  | 'EXPERT_VICTORY'
  | 'NEXUS_MASTER'
  | 'CATCH_OPPONENT'
  | 'PORTAL_WEAVER'
  | 'ALL_FAMILIES_PLAYED'
  | 'FIVE_WINS';

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly xpReward: number;
}

export interface DifficultyStats {
  readonly games: number;
  readonly wins: number;
}

export interface NexusProgressionStats {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly totalTurnsPlayed: number;
  readonly totalCardsPlayed: number;
  readonly specialCardsPlayed: number;
  readonly nexusDeclarations: number;
  readonly missedNexusCaught: number;
  readonly bestWinTurns: number | null;
  readonly xp: number;
  readonly familiesPlayed: readonly FamilyId[];
  readonly variantsDiscovered: readonly string[];
  readonly byDifficulty: Readonly<Record<AiDifficulty, DifficultyStats>>;
  readonly unlockedAchievements: readonly AchievementId[];
}
