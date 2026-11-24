import React from 'react';
import { ArrowLeft, BookOpen, Grid, Settings, Trophy } from 'lucide-react';
import type { AppScreen } from '../types/app';

export interface NavigationShellProps {
  readonly currentScreen: Exclude<AppScreen, 'TITLE' | 'TABLE'>;
  readonly title: string;
  readonly subtitle: string;
  readonly onNavigate: (screen: AppScreen) => void;
  readonly children: React.ReactNode;
}

const NAV_ITEMS: ReadonlyArray<{
  readonly screen: AppScreen;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
}> = [
  { screen: 'SOLO_SETUP', label: 'Solo', icon: ArrowLeft },
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
  return (
    <div className="min-h-screen bg-[#050814] text-slate-100">
      <header className="border-b border-slate-800/80 bg-[#070C1C]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('TITLE')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/60 hover:text-white whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Accueil</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('TITLE')}
              className="font-['Outfit'] text-xl font-extrabold tracking-[0.18em] text-white whitespace-nowrap shrink-0"
            >
              NEXUS
            </button>
          </div>

          <nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-1.5">
            {NAV_ITEMS.filter((item) => item.screen !== 'SOLO_SETUP').map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.screen;
              return (
                <button
                  key={item.screen}
                  type="button"
                  onClick={() => onNavigate(item.screen)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigate('SOLO_SETUP')}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentScreen === 'SOLO_SETUP'
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-sky-400/50 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
              }`}
            >
              Mode Solo
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 border-b border-slate-800/70 pb-5">
          <h1 className="font-['Outfit'] text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
