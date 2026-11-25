import React from 'react';
import { BookOpen, Grid, Play, Settings, SlidersHorizontal, Trophy } from 'lucide-react';
import { NexusCard } from '../graphics';
import { getPlayerLevelInfo } from '../progression/progressionStore';
import type { AppScreen, NexusProgressionStats } from '../types/app';
import {
  NexusBackdrop,
  NexusChamferButton,
  NexusChromePanel,
  NexusLogoSvg,
  useNexusUi,
} from './ui';

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
  const { animationLevel, tableTheme } = useNexusUi();
  const levelInfo = getPlayerLevelInfo(stats.xp);
  const isOff = animationLevel === 'OFF';
  const showDaisGlow = glowEnabled && !isOff;

  const secondaryLinks: ReadonlyArray<{
    readonly screen: AppScreen;
    readonly label: string;
    readonly detail: string;
    readonly accent: string;
    readonly icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      screen: 'COLLECTION',
      label: 'Collection',
      detail: '80 variantes',
      accent: '#38BDF8',
      icon: Grid,
    },
    {
      screen: 'RULES',
      label: 'Règles',
      detail: 'Système & pouvoirs',
      accent: '#F59E0B',
      icon: BookOpen,
    },
    {
      screen: 'STATS',
      label: 'Statistiques',
      detail: `Niveau ${levelInfo.level} · Bilan`,
      accent: '#10B981',
      icon: Trophy,
    },
    {
      screen: 'SETTINGS',
      label: 'Paramètres',
      detail: 'Audio & effets',
      accent: '#A78BFA',
      icon: Settings,
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#030612] text-slate-100">
      <NexusBackdrop
        variant="hero"
        tableTheme={tableTheme}
        glowEnabled={glowEnabled}
        animationLevel={animationLevel}
      />

      {/* Rail supérieur discret d'identité et de progression réelle */}
      <header className="relative z-10 border-b border-slate-800/70 bg-[#040816]/75 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <NexusLogoSvg
              size="compact"
              glowEnabled={glowEnabled}
              animationLevel={animationLevel}
            />
            <span className="text-[11px] font-bold tracking-[0.22em] text-[#F5DEB3] uppercase">
              Édition Solo Officielle
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 tabular-nums">
            <span className="font-semibold text-sky-300">
              Niveau {levelInfo.level} · {levelInfo.title}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              /
            </span>
            <span>{stats.gamesWon} victoire(s) Solo</span>
          </div>
        </div>
      </header>

      {/* Scène principale asymétrique */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Colonne gauche : Identité, commandes principales et accès secondaires */}
          <div className="space-y-7 lg:col-span-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <NexusLogoSvg
                  size="hero"
                  glowEnabled={glowEnabled}
                  animationLevel={animationLevel}
                />
                <div className="space-y-1">
                  <div className="text-[11px] font-bold tracking-[0.24em] text-sky-300 uppercase">
                    6 Familles · Valeurs 0–9 · Cartes Spéciales
                  </div>
                  <div className="h-[2px] w-28 bg-gradient-to-r from-[#F5DEB3] via-sky-400 to-transparent" />
                </div>
              </div>

              <h1 className="font-['Outfit'] text-5xl font-extrabold tracking-[0.16em] nexus-title-metallic sm:text-6xl lg:text-7xl">
                NEXUS
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Maîtrisez les six familles cosmiques, enchaînez valeurs numériques de 0 à 9 et
                cartes spéciales rares, et déjouez l’intelligence artificielle en mode Solo.
              </p>
            </div>

            {/* Commandes principales */}
            <div className="flex flex-wrap items-center gap-3.5">
              <NexusChamferButton
                variant="primary"
                data-start="true"
                onClick={onQuickStartSolo}
                animationLevel={animationLevel}
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Jouer en Solo</span>
              </NexusChamferButton>

              <NexusChamferButton
                variant="secondary"
                onClick={() => onNavigate('SOLO_SETUP')}
                animationLevel={animationLevel}
              >
                <SlidersHorizontal className="h-4 w-4 text-[#F5DEB3]" aria-hidden="true" />
                <span>Configurer la table</span>
              </NexusChamferButton>
            </div>

            {/* Grille d'accès aux écrans secondaires */}
            <nav aria-label="Menu secondaire" className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              {secondaryLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.screen}
                    type="button"
                    onClick={() => onNavigate(item.screen)}
                    className={`group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                      isOff ? '' : 'transition-transform duration-150 hover:-translate-y-0.5'
                    }`}
                  >
                    <NexusChromePanel
                      tone="chrome"
                      chamfer="sm"
                      accentColor={item.accent}
                      innerClassName="flex min-h-[60px] items-center gap-2.5 px-3 py-3 sm:gap-3 sm:px-4 group-hover:bg-[#0B142C]/95"
                    >
                      <span
                        className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-md border border-slate-700/80 bg-[#040917]"
                        style={{ color: item.accent }}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-['Outfit'] text-sm font-bold tracking-wide text-white">
                          {item.label}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {item.detail}
                        </span>
                      </span>
                    </NexusChromePanel>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Colonne droite : Vitrine orbitale des 3 cartes officielles V2 */}
          <div className="flex items-center justify-center lg:col-span-6">
            <div className="relative flex w-full max-w-[500px] flex-col items-center justify-center py-4 sm:py-6">
              {/* Socle énergétique orbital en perspective sous les cartes */}
              <svg
                viewBox="0 0 460 220"
                className="pointer-events-none absolute bottom-0 w-full max-w-[440px]"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="nexus-dais-glow" cx="50%" cy="55%" r="50%">
                    <stop
                      offset="0%"
                      stopColor="#38BDF8"
                      stopOpacity={showDaisGlow ? 0.34 : 0.08}
                    />
                    <stop
                      offset="55%"
                      stopColor="#D4A656"
                      stopOpacity={showDaisGlow ? 0.16 : 0.04}
                    />
                    <stop offset="100%" stopColor="#030612" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="230" cy="148" rx="215" ry="62" fill="url(#nexus-dais-glow)" />
                <ellipse
                  cx="230"
                  cy="148"
                  rx="202"
                  ry="52"
                  fill="none"
                  stroke="#94A3B8"
                  strokeOpacity="0.34"
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="230"
                  cy="148"
                  rx="164"
                  ry="40"
                  fill="none"
                  stroke="#38BDF8"
                  strokeOpacity={showDaisGlow ? 0.65 : 0.25}
                  strokeWidth="1.4"
                  strokeDasharray="16 10"
                />
                <ellipse
                  cx="230"
                  cy="148"
                  rx="118"
                  ry="26"
                  fill="none"
                  stroke="#F5DEB3"
                  strokeOpacity={showDaisGlow ? 0.55 : 0.22}
                  strokeWidth="1.2"
                />
              </svg>

              {/* Éventail maîtrisé de 3 véritables cartes officielles V2 */}
              <div className="relative z-10 flex items-end justify-center pb-8 pt-2">
                <div className="-mr-10 origin-bottom -rotate-12 translate-y-3 opacity-95 sm:-mr-12">
                  <NexusCard
                    variantId="BRAISE_IMPULSION"
                    size="md"
                    glowEnabled={glowEnabled}
                    className="!w-[104px] sm:!w-[150px]"
                  />
                </div>
                <div className="z-20 -translate-y-3">
                  <NexusCard
                    variantId="UNIVERSAL_PORTAIL"
                    size="lg"
                    glowEnabled={glowEnabled}
                    playable={!isOff}
                    className="!w-[144px] sm:!w-[208px]"
                  />
                </div>
                <div className="-ml-10 origin-bottom rotate-12 translate-y-3 opacity-95 sm:-ml-12">
                  <NexusCard
                    variantId="ONDE_7"
                    size="md"
                    glowEnabled={glowEnabled}
                    className="!w-[104px] sm:!w-[150px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pied de scène sobre */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-3.5 text-xs text-slate-400">
          <span>
            Entrée / Espace : Lancer la partie Solo · Échap / P : Pause en jeu · M : Couper le son
          </span>
          <span className="text-[11px] tracking-wider text-slate-500 uppercase">
            Cartes officielles NEXUS V2
          </span>
        </div>
      </footer>
    </div>
  );
}
