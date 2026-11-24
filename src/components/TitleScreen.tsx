import React from 'react';
import { BookOpen, Grid, Play, Settings, SlidersHorizontal, Trophy } from 'lucide-react';
import { NexusCard } from '../graphics';
import { getPlayerLevelInfo } from '../progression/progressionStore';
import type { AppScreen, NexusProgressionStats } from '../types/app';

export interface TitleScreenProps {
  readonly glowEnabled: boolean;
  readonly stats: NexusProgressionStats;
  readonly onQuickStartSolo: () => void;
  readonly onNavigate: (screen: AppScreen) => void;
}

export function TitleScreen({
  glowEnabled,
  stats,
  onQuickStartSolo,
  onNavigate,
}: TitleScreenProps): React.ReactElement {
  const levelInfo = getPlayerLevelInfo(stats.xp);

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#050814] text-slate-100">
      {/* Orbital background geometry */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 1440 900"
          className="h-full w-full opacity-35"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="nexus-title-glow" cx="65%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.22" />
              <stop offset="48%" stopColor="#1E1B4B" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#050814" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#nexus-title-glow)" />
          <circle cx="960" cy="430" r="340" fill="none" stroke="#1E293B" strokeWidth="1.2" />
          <circle
            cx="960"
            cy="430"
            r="250"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1"
            strokeOpacity="0.28"
            strokeDasharray="10 12"
          />
          <circle
            cx="960"
            cy="430"
            r="430"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="0.9"
            strokeOpacity="0.18"
          />
        </svg>
      </div>

      {/* Main Title Stage */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 lg:py-14">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Negative-Space Lockup + Primary CTAs */}
          <div className="space-y-8 lg:col-span-6">
            <div className="space-y-4">
              {/* Bespoke inline SVG Title Lockup featuring the Infinity Nexus emblem */}
              <div className="flex items-center gap-4">
                <svg
                  viewBox="0 0 96 56"
                  className="h-11 w-20 shrink-0"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="nexus-inf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="14,6 82,6 92,28 82,50 14,50 4,28"
                    fill="#091128"
                    stroke="#334155"
                    strokeWidth="2"
                  />
                  <path
                    d="M 28,20 C 18,20 14,24 14,28 C 14,32 18,36 28,36 C 38,36 58,20 68,20 C 78,20 82,24 82,28 C 82,32 78,36 68,36 C 58,36 38,20 28,20 Z"
                    fill="none"
                    stroke="url(#nexus-inf-grad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-semibold tracking-[0.22em] text-sky-300 uppercase">
                  Jeu de cartes néo-futuriste
                </span>
              </div>

              <h1 className="font-['Outfit'] text-5xl font-extrabold tracking-[0.12em] text-white sm:text-6xl">
                NEXUS
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300">
                Maîtrisez les six familles cosmiques, enchaînez valeurs numériques et cartes
                spéciales rares, et déjouez l’intelligence artificielle en mode Solo.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 tabular-nums">
                <span>6 familles</span>
                <span aria-hidden="true">·</span>
                <span>80 variantes officielles</span>
                <span aria-hidden="true">·</span>
                <span>
                  Niveau {levelInfo.level} · {levelInfo.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>{stats.gamesWon} victoire(s) Solo</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-start="true"
                onClick={onQuickStartSolo}
                className="inline-flex items-center gap-2.5 rounded-xl bg-sky-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Jouer en Solo</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('SOLO_SETUP')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0B1226] px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-sky-400/60 hover:text-white whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>Configurer la table</span>
              </button>
            </div>

            <nav aria-label="Menu secondaire" className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => onNavigate('COLLECTION')}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0A1022] px-4 py-3 text-left text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-[#0E1630]"
              >
                <Grid className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
                <span>Collection</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('RULES')}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0A1022] px-4 py-3 text-left text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-[#0E1630]"
              >
                <BookOpen className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Règles</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('STATS')}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0A1022] px-4 py-3 text-left text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-[#0E1630]"
              >
                <Trophy className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Statistiques</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('SETTINGS')}
                className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0A1022] px-4 py-3 text-left text-xs font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-[#0E1630]"
              >
                <Settings className="h-4 w-4 text-violet-400 shrink-0" aria-hidden="true" />
                <span>Paramètres</span>
              </button>
            </nav>
          </div>

          {/* Right Centerpiece Showcase: Fanned official V2 cards */}
          <div className="flex items-center justify-center lg:col-span-6">
            <div className="relative flex items-end justify-center py-6">
              <div className="-mr-12 origin-bottom -rotate-12 translate-y-4 opacity-90 sm:-mr-10">
                <NexusCard variantId="BRAISE_IMPULSION" size="md" glowEnabled={glowEnabled} />
              </div>
              <div className="z-20 -translate-y-2">
                <NexusCard
                  variantId="UNIVERSAL_PORTAIL"
                  size="lg"
                  glowEnabled={glowEnabled}
                  playable
                />
              </div>
              <div className="-ml-12 origin-bottom rotate-12 translate-y-4 opacity-90 sm:-ml-10">
                <NexusCard variantId="ONDE_7" size="md" glowEnabled={glowEnabled} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Single flat control hint line */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-6">
        <p className="text-xs text-slate-500">
          Entrée / Espace : Lancer la partie Solo · Échap / P : Pause en jeu · M : Couper le son
        </p>
      </footer>
    </div>
  );
}
