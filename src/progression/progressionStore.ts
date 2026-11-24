import { FAMILY_IDS, type FamilyId } from '../catalog/types';
import type { AiDifficulty, EndReason } from '../engine/gameTypes';
import {
  DEFAULT_SETTINGS,
  type AchievementDefinition,
  type AchievementId,
  type NexusProgressionStats,
  type NexusSettings,
} from '../types/app';

const SETTINGS_STORAGE_KEY = 'nexus.settings.v1';
const PROGRESSION_STORAGE_KEY = 'nexus.progression.v1';

export const ACHIEVEMENTS: readonly AchievementDefinition[] = Object.freeze([
  {
    id: 'FIRST_MATCH',
    title: 'Première Convergence',
    description: 'Terminer une première partie complète en mode Solo.',
    xpReward: 50,
  },
  {
    id: 'FIRST_SOLO_WIN',
    title: 'Maître de Table',
    description: 'Remporter une victoire en mode Solo contre l’IA.',
    xpReward: 120,
  },
  {
    id: 'EXPERT_VICTORY',
    title: 'Stratège Suprême',
    description: 'Battre une table contenant au moins un adversaire IA Expert.',
    xpReward: 250,
  },
  {
    id: 'NEXUS_MASTER',
    title: 'Appel du Nexus',
    description: 'Déclarer NEXUS avec succès lors d’une partie.',
    xpReward: 100,
  },
  {
    id: 'CATCH_OPPONENT',
    title: 'Vigilance Cosmique',
    description: 'Signaler un adversaire ayant oublié de déclarer NEXUS.',
    xpReward: 130,
  },
  {
    id: 'PORTAL_WEAVER',
    title: 'Tisseur de Portail',
    description: 'Jouer au moins 10 cartes spéciales en partie Solo.',
    xpReward: 110,
  },
  {
    id: 'ALL_FAMILIES_PLAYED',
    title: 'Harmonie des Six Familles',
    description: 'Jouer au moins une carte de chacune des 6 familles officielles.',
    xpReward: 150,
  },
  {
    id: 'FIVE_WINS',
    title: 'Vétéran du Noyau',
    description: 'Cumuler 5 victoires en mode Solo.',
    xpReward: 300,
  },
]);

export function createInitialProgressionStats(): NexusProgressionStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    totalTurnsPlayed: 0,
    totalCardsPlayed: 0,
    specialCardsPlayed: 0,
    nexusDeclarations: 0,
    missedNexusCaught: 0,
    bestWinTurns: null,
    xp: 0,
    familiesPlayed: [],
    variantsDiscovered: [],
    byDifficulty: {
      FACILE: { games: 0, wins: 0 },
      NORMAL: { games: 0, wins: 0 },
      EXPERT: { games: 0, wins: 0 },
    },
    unlockedAchievements: [],
  };
}

export interface SoloMatchOutcomeSummary {
  readonly won: boolean;
  readonly difficulty: AiDifficulty;
  readonly turnsPlayed: number;
  readonly humanCardsPlayed: number;
  readonly humanSpecialCardsPlayed: number;
  readonly humanNexusDeclarations: number;
  readonly humanMissedNexusCaught: number;
  readonly familiesUsed: readonly FamilyId[];
  readonly variantsUsed: readonly string[];
  readonly endReason: EndReason | null;
}

export function applyMatchOutcomeToProgression(
  current: NexusProgressionStats,
  outcome: SoloMatchOutcomeSummary,
): {
  readonly next: NexusProgressionStats;
  readonly newlyUnlocked: readonly AchievementDefinition[];
} {
  const familiesSet = new Set<FamilyId>(current.familiesPlayed);
  for (const f of outcome.familiesUsed) {
    familiesSet.add(f);
  }

  const variantsSet = new Set<string>(current.variantsDiscovered);
  for (const v of outcome.variantsUsed) {
    variantsSet.add(v);
  }

  const prevDiff = current.byDifficulty[outcome.difficulty];
  const nextByDifficulty = {
    ...current.byDifficulty,
    [outcome.difficulty]: {
      games: prevDiff.games + 1,
      wins: prevDiff.wins + (outcome.won ? 1 : 0),
    },
  };

  const nextBestWinTurns =
    outcome.won && (current.bestWinTurns === null || outcome.turnsPlayed < current.bestWinTurns)
      ? outcome.turnsPlayed
      : current.bestWinTurns;

  const baseXpGain =
    (outcome.won ? 90 : 35) +
    outcome.humanCardsPlayed * 4 +
    (outcome.difficulty === 'EXPERT' && outcome.won ? 60 : 0);

  const candidate: NexusProgressionStats = {
    gamesPlayed: current.gamesPlayed + 1,
    gamesWon: current.gamesWon + (outcome.won ? 1 : 0),
    totalTurnsPlayed: current.totalTurnsPlayed + outcome.turnsPlayed,
    totalCardsPlayed: current.totalCardsPlayed + outcome.humanCardsPlayed,
    specialCardsPlayed: current.specialCardsPlayed + outcome.humanSpecialCardsPlayed,
    nexusDeclarations: current.nexusDeclarations + outcome.humanNexusDeclarations,
    missedNexusCaught: current.missedNexusCaught + outcome.humanMissedNexusCaught,
    bestWinTurns: nextBestWinTurns,
    xp: current.xp + baseXpGain,
    familiesPlayed: [...familiesSet],
    variantsDiscovered: [...variantsSet],
    byDifficulty: nextByDifficulty,
    unlockedAchievements: [...current.unlockedAchievements],
  };

  const unlockedSet = new Set<AchievementId>(candidate.unlockedAchievements);
  const newlyUnlocked: AchievementDefinition[] = [];

  const checkUnlock = (id: AchievementId, condition: boolean) => {
    if (condition && !unlockedSet.has(id)) {
      unlockedSet.add(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newlyUnlocked.push(def);
    }
  };

  checkUnlock('FIRST_MATCH', candidate.gamesPlayed >= 1);
  checkUnlock('FIRST_SOLO_WIN', candidate.gamesWon >= 1);
  checkUnlock('EXPERT_VICTORY', outcome.won && outcome.difficulty === 'EXPERT');
  checkUnlock('NEXUS_MASTER', candidate.nexusDeclarations >= 1);
  checkUnlock('CATCH_OPPONENT', candidate.missedNexusCaught >= 1);
  checkUnlock('PORTAL_WEAVER', candidate.specialCardsPlayed >= 10);
  checkUnlock(
    'ALL_FAMILIES_PLAYED',
    FAMILY_IDS.every((fid) => familiesSet.has(fid)),
  );
  checkUnlock('FIVE_WINS', candidate.gamesWon >= 5);

  const achievementXp = newlyUnlocked.reduce((sum, a) => sum + a.xpReward, 0);

  return {
    next: {
      ...candidate,
      xp: candidate.xp + achievementXp,
      unlockedAchievements: [...unlockedSet],
    },
    newlyUnlocked,
  };
}

export function getPlayerLevelInfo(xp: number): {
  readonly level: number;
  readonly title: string;
  readonly currentLevelXp: number;
  readonly nextLevelXp: number;
  readonly progressPct: number;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(safeXp / 250) + 1;
  const currentLevelXp = safeXp % 250;
  const nextLevelXp = 250;
  const titles = [
    'Initié du Noyau',
    'Navigateur Astral',
    'Tisseur d’Ondes',
    'Gardien des Familles',
    'Architecte du Portail',
    'Maître du Nexus',
  ];
  const title = titles[Math.min(titles.length - 1, level - 1)];
  return {
    level,
    title,
    currentLevelXp,
    nextLevelXp,
    progressPct: Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100)),
  };
}

export function loadSettings(): NexusSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NexusSettings>;
    const animationLevel =
      parsed.animationLevel === 'FULL' ||
      parsed.animationLevel === 'REDUCED' ||
      parsed.animationLevel === 'OFF'
        ? parsed.animationLevel
        : DEFAULT_SETTINGS.animationLevel;
    const aiPacing =
      parsed.aiPacing === 'FAST' || parsed.aiPacing === 'NORMAL'
        ? parsed.aiPacing
        : DEFAULT_SETTINGS.aiPacing;
    const tableTheme =
      parsed.tableTheme === 'VOID_STELLAR' ||
      parsed.tableTheme === 'SOLAR_FORGE' ||
      parsed.tableTheme === 'QUANTUM_ABYSS'
        ? parsed.tableTheme
        : DEFAULT_SETTINGS.tableTheme;

    return {
      animationLevel,
      glowEnabled:
        typeof parsed.glowEnabled === 'boolean'
          ? parsed.glowEnabled
          : DEFAULT_SETTINGS.glowEnabled,
      soundMuted:
        typeof parsed.soundMuted === 'boolean'
          ? parsed.soundMuted
          : DEFAULT_SETTINGS.soundMuted,
      soundVolume:
        typeof parsed.soundVolume === 'number' &&
        Number.isFinite(parsed.soundVolume) &&
        parsed.soundVolume >= 0 &&
        parsed.soundVolume <= 1
          ? parsed.soundVolume
          : DEFAULT_SETTINGS.soundVolume,
      aiPacing,
      tableTheme,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: NexusSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadProgressionStats(): NexusProgressionStats {
  if (typeof window === 'undefined') {
    return createInitialProgressionStats();
  }
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return createInitialProgressionStats();
    const parsed = JSON.parse(raw) as Partial<NexusProgressionStats>;
    const base = createInitialProgressionStats();
    return {
      ...base,
      ...parsed,
      byDifficulty: {
        FACILE: parsed.byDifficulty?.FACILE ?? base.byDifficulty.FACILE,
        NORMAL: parsed.byDifficulty?.NORMAL ?? base.byDifficulty.NORMAL,
        EXPERT: parsed.byDifficulty?.EXPERT ?? base.byDifficulty.EXPERT,
      },
      familiesPlayed: Array.isArray(parsed.familiesPlayed) ? parsed.familiesPlayed : [],
      variantsDiscovered: Array.isArray(parsed.variantsDiscovered)
        ? parsed.variantsDiscovered
        : [],
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
    };
  } catch {
    return createInitialProgressionStats();
  }
}

export function saveProgressionStats(stats: NexusProgressionStats): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
