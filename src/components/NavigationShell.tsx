import React from 'react';
import { ArrowLeft, BookOpen, Grid, Play, Settings, Trophy } from 'lucide-react';
import type { AppScreen } from '../types/app';
import {
  NexusBackdrop,
  NexusChamferButton,
  NexusLogoSvg,
  useNexusUi,
} from './ui';

export interface NavigationShellProps {
  readonly currentScreen: Exclude<AppScreen, 'TITLE' | 'TABLE'>;
  readonly title: string;
  readonly subtitle: string;
  readonly onNavigate: (screen: AppScreen) => void;
  readonly children: React.ReactNode;
}

const NAV_ITEMS: ReadonlyArray<{
  readonly screen: Exclude<AppScreen, 'TITLE' | 'TABLE' | 'SOLO_SETUP'>;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}> = [
  { screen: 'COLLECTION', label: 'Collection', icon: Grid },
  { screen: 'RULES', label: 'Règles', icon: BookOpen },
  { screen: 'STATS', label: 'Progression', icon: Trophy },
  { screen: 'SETTINGS', label: 'Paramètres', icon: Settings },
];

export function NavigationShell({
  currentScreen,
  title,
  subtitle,
  onNavigate,
  children,
}: NavigationShellProps): React.ReactElement {
  const { animationLevel, glowEnabled, tableTheme } = useNexusUi();
  const isOff = animationLevel === 'OFF';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030612] text-slate-100">
      <NexusBackdrop
        variant="shell"
        tableTheme={tableTheme}
        glowEnabled={glowEnabled}
        animationLevel={animationLevel}
      />

      {/* Passerelle de navigation supérieure chanfreinée */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#050A19]/88 backdrop-blur-md">
        {/* Liseré métallique chrome / champagne-bronze */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.45) 20%, rgba(245,222,179,0.6) 50%, rgba(56,189,248,0.45) 80%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Zone gauche : Retour + Identité NEXUS (+ action Solo sur mobile) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('TITLE')}
                className={`inline-flex min-h-[44px] items-center gap-2 border border-slate-700/85 bg-[#091228]/90 px-3.5 py-2 text-xs font-semibold text-slate-200 nexus-chamfer-sm whitespace-nowrap shrink-0 hover:border-sky-400/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-colors duration-150'
                }`}
              >
                <ArrowLeft className="h-4 w-4 text-sky-400" aria-hidden="true" />
                <span>Accueil</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('TITLE')}
                className="inline-flex min-h-[44px] items-center gap-2.5 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 whitespace-nowrap shrink-0"
              >
                <NexusLogoSvg
                  size="compact"
                  glowEnabled={glowEnabled}
                  animationLevel={animationLevel}
                />
                <span className="font-['Outfit'] text-lg font-black tracking-[0.2em] nexus-title-metallic">
                  NEXUS
                </span>
              </button>
            </div>

            <div className="lg:hidden">
              <NexusChamferButton
                variant={currentScreen === 'SOLO_SETUP' ? 'champagne' : 'secondary'}
                onClick={() => onNavigate('SOLO_SETUP')}
                animationLevel={animationLevel}
                className="!min-h-[44px]"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Solo</span>
              </NexusChamferButton>
            </div>
          </div>

          {/* Zone centrale : Onglets des écrans */}
          <nav
            aria-label="Navigation principale"
            className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:gap-2"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.screen;
              return (
                <button
                  key={item.screen}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onNavigate(item.screen)}
                  className={`relative inline-flex min-h-[44px] items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold tracking-wide nexus-chamfer-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    isOff ? '' : 'transition-colors duration-150'
                  } ${
                    isActive
                      ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'border border-slate-800/90 bg-[#081024]/80 text-slate-300 hover:border-slate-600 hover:bg-[#0D1732] hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-sky-400'}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone droite desktop : Accès Mode Solo */}
          <div className="hidden lg:block shrink-0">
            <NexusChamferButton
              variant={currentScreen === 'SOLO_SETUP' ? 'champagne' : 'secondary'}
              onClick={() => onNavigate('SOLO_SETUP')}
              animationLevel={animationLevel}
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Mode Solo</span>
            </NexusChamferButton>
          </div>
        </div>
      </header>

      {/* En-tête architectural de page + contenu */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-8 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block h-2 w-6 bg-gradient-to-r from-[#F5DEB3] to-[#38BDF8] nexus-chamfer-sm"
              aria-hidden="true"
            />
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#F5DEB3] uppercase">
              Système NEXUS
            </span>
          </div>
          <h1 className="mt-2 font-['Outfit'] text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300/90">
            {subtitle}
          </p>
        </div>

        {children}
      </main>
    </div>
  );
}
