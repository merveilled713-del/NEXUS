import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { ACHIEVEMENTS, getPlayerLevelInfo } from '../progression/progressionStore';
import type { AppScreen, NexusProgressionStats } from '../types/app';
import { NavigationShell } from './NavigationShell';

export interface StatsScreenProps {
  readonly stats: NexusProgressionStats;
  readonly onNavigate: (screen: AppScreen) => void;
}

export function StatsScreen({ stats, onNavigate }: StatsScreenProps): React.ReactElement {
  const levelInfo = getPlayerLevelInfo(stats.xp);
  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const unlockedSet = new Set(stats.unlockedAchievements);

  return (
    <NavigationShell
      currentScreen="STATS"
      title="Statistiques et progression Solo"
      subtitle="Suivez vos victoires par difficulté, vos cartes jouées et vos défis débloqués."
      onNavigate={onNavigate}
    >
      <div className="space-y-8">
        {/* Niveau et XP */}
        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
                Rang actuel
              </div>
              <h2 className="mt-1 font-['Outfit'] text-2xl font-bold text-white tabular-nums">
                Niveau {levelInfo.level} — {levelInfo.title}
              </h2>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-lg font-bold text-white">{stats.xp} XP</div>
              <div className="text-xs text-slate-400">
                {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP vers le niveau suivant
              </div>
            </div>
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-all duration-300"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </section>

        {/* Indicateurs clés */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Parties jouées</div>
            <div className="mt-1 text-2xl font-bold text-white tabular-nums">
              {stats.gamesPlayed}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Victoires</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400 tabular-nums">
              {stats.gamesWon}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Taux de victoire</div>
            <div className="mt-1 text-2xl font-bold text-sky-400 tabular-nums">{winRate} %</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Cartes jouées</div>
            <div className="mt-1 text-2xl font-bold text-white tabular-nums">
              {stats.totalCardsPlayed}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Déclarations NEXUS</div>
            <div className="mt-1 text-2xl font-bold text-amber-400 tabular-nums">
              {stats.nexusDeclarations}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-4">
            <div className="text-xs text-slate-400">Record victoire</div>
            <div className="mt-1 text-2xl font-bold text-white tabular-nums">
              {stats.bestWinTurns !== null ? `${stats.bestWinTurns} tours` : '—'}
            </div>
          </div>
        </section>

        {/* Performances par difficulté */}
        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
          <h2 className="font-['Outfit'] text-lg font-bold text-white">
            Bilan par difficulté d’IA
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['FACILE', 'NORMAL', 'EXPERT'] as const).map((diff) => {
              const row = stats.byDifficulty[diff];
              const pct = row.games > 0 ? Math.round((row.wins / row.games) * 100) : 0;
              return (
                <div
                  key={diff}
                  className="rounded-lg border border-slate-800 bg-[#050814] p-4 tabular-nums"
                >
                  <div className="text-sm font-bold text-white">{diff}</div>
                  <div className="mt-2 flex items-baseline justify-between text-xs text-slate-300">
                    <span>
                      {row.wins} victoire(s) / {row.games} partie(s)
                    </span>
                    <span className="font-bold text-sky-400">{pct} %</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Succès et défis */}
        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              Défis et succès ({stats.unlockedAchievements.length} / {ACHIEVEMENTS.length})
            </h2>
            <Award className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedSet.has(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                    unlocked
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-slate-800 bg-[#050814] opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      {unlocked ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                      ) : null}
                      <span>{ach.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{ach.description}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-300 tabular-nums shrink-0">
                    +{ach.xpReward} XP
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div>
          <button
            type="button"
            onClick={() => onNavigate('SOLO_SETUP')}
            className="rounded-xl bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950"
          >
            Jouer une partie Solo
          </button>
        </div>
      </div>
    </NavigationShell>
  );
}
