import React from 'react';
import { Award, CheckCircle2, Lock, Play, Shield } from 'lucide-react';
import { ACHIEVEMENTS, getPlayerLevelInfo } from '../progression/progressionStore';
import type { AppScreen, NexusProgressionStats } from '../types/app';
import { NavigationShell } from './NavigationShell';
import { NexusChamferButton, NexusChromePanel, useNexusUi } from './ui';

export interface StatsScreenProps {
  readonly stats: NexusProgressionStats;
  readonly onNavigate: (screen: AppScreen) => void;
}

export function StatsScreen({ stats, onNavigate }: StatsScreenProps): React.ReactElement {
  const { animationLevel } = useNexusUi();
  const isOff = animationLevel === 'OFF';
  const levelInfo = getPlayerLevelInfo(stats.xp);
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const unlockedSet = new Set(stats.unlockedAchievements);

  const kpis: ReadonlyArray<{
    readonly label: string;
    readonly value: string | number;
    readonly valueClass: string;
    readonly tone: 'chrome' | 'cyan' | 'champagne' | 'neutral';
  }> = [
    {
      label: 'Parties jouées',
      value: stats.gamesPlayed,
      valueClass: 'text-white',
      tone: 'chrome',
    },
    {
      label: 'Victoires',
      value: stats.gamesWon,
      valueClass: 'text-emerald-300',
      tone: 'cyan',
    },
    {
      label: 'Taux de victoire',
      value: `${winRate} %`,
      valueClass: 'text-sky-300',
      tone: 'cyan',
    },
    {
      label: 'Cartes jouées',
      value: stats.totalCardsPlayed,
      valueClass: 'text-white',
      tone: 'chrome',
    },
    {
      label: 'Déclarations NEXUS',
      value: stats.nexusDeclarations,
      valueClass: 'text-[#F5DEB3]',
      tone: 'champagne',
    },
    {
      label: 'Record victoire',
      value: stats.bestWinTurns !== null ? `${stats.bestWinTurns} tours` : '—',
      valueClass: 'text-white',
      tone: 'champagne',
    },
  ];

  return (
    <NavigationShell
      currentScreen="STATS"
      title="Statistiques et progression Solo"
      subtitle="Suivez vos victoires par difficulté, vos cartes jouées et vos défis débloqués."
      onNavigate={onNavigate}
    >
      <div className="space-y-7">
        {/* Niveau et XP réels */}
        <NexusChromePanel tone="champagne" chamfer="lg" innerClassName="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#F5DEB3]/50 bg-[#040917] nexus-chamfer-sm">
                <Shield className="h-6 w-6 text-[#F5DEB3]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-[0.18em] text-[#F5DEB3] uppercase">
                  Rang actuel
                </div>
                <h2 className="mt-0.5 font-['Outfit'] text-xl font-extrabold text-white tabular-nums sm:text-2xl">
                  Niveau {levelInfo.level} — {levelInfo.title}
                </h2>
              </div>
            </div>

            <div className="text-left tabular-nums sm:text-right">
              <div className="font-['Outfit'] text-xl font-extrabold text-white">
                {stats.xp} XP
              </div>
              <div className="text-xs text-slate-300">
                {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP vers le niveau suivant
              </div>
            </div>
          </div>

          <div className="mt-5 h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-[#030612]">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-[#38BDF8] via-[#22D3EE] to-[#F5DEB3] ${
                isOff ? '' : 'transition-all duration-300'
              }`}
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </NexusChromePanel>

        {/* Indicateurs clés */}
        <section
          aria-label="Indicateurs clés"
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6"
        >
          {kpis.map((item) => (
            <NexusChromePanel
              key={item.label}
              tone={item.tone}
              chamfer="sm"
              innerClassName="p-4"
            >
              <div className="text-xs font-medium text-slate-400">{item.label}</div>
              <div
                className={`mt-1.5 font-['Outfit'] text-2xl font-extrabold tabular-nums ${item.valueClass}`}
              >
                {item.value}
              </div>
            </NexusChromePanel>
          ))}
        </section>

        {/* Performances par difficulté */}
        <NexusChromePanel tone="chrome" chamfer="lg" innerClassName="p-5 sm:p-6">
          <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
            Bilan par difficulté d’IA
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['FACILE', 'NORMAL', 'EXPERT'] as const).map((diff) => {
              const row = stats.byDifficulty[diff];
              const pct = row.games > 0 ? Math.round((row.wins / row.games) * 100) : 0;
              return (
                <div
                  key={diff}
                  className="border border-slate-800/90 bg-[#040917]/95 p-4 tabular-nums nexus-chamfer-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-['Outfit'] text-sm font-extrabold tracking-wide text-white">
                      {diff}
                    </span>
                    <span className="font-['Outfit'] text-sm font-extrabold text-sky-300">
                      {pct} %
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-300">
                    {row.wins} victoire(s) / {row.games} partie(s)
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full bg-sky-400 ${
                        isOff ? '' : 'transition-all duration-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </NexusChromePanel>

        {/* Succès et défis */}
        <NexusChromePanel tone="chrome" chamfer="lg" innerClassName="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-['Outfit'] text-lg font-extrabold text-white tabular-nums">
              Défis et succès ({stats.unlockedAchievements.length} / {ACHIEVEMENTS.length})
            </h2>
            <Award className="h-5 w-5 shrink-0 text-[#F5DEB3]" aria-hidden="true" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedSet.has(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`flex items-start justify-between gap-4 border p-4 nexus-chamfer-sm ${
                    unlocked
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : 'border-slate-800/90 bg-[#040917]/90 opacity-80'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-['Outfit'] text-sm font-bold text-white">
                      {unlocked ? (
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-emerald-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      )}
                      <span>{ach.title}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {ach.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-extrabold tabular-nums ${
                      unlocked ? 'text-emerald-300' : 'text-[#F5DEB3]'
                    }`}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>
              );
            })}
          </div>
        </NexusChromePanel>

        <div>
          <NexusChamferButton
            variant="primary"
            onClick={() => onNavigate('SOLO_SETUP')}
            animationLevel={animationLevel}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Jouer une partie Solo</span>
          </NexusChamferButton>
        </div>
      </div>
    </NavigationShell>
  );
}
