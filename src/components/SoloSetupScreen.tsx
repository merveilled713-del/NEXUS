import React from 'react';
import { Play, Users } from 'lucide-react';
import type { AiDifficulty } from '../engine/gameTypes';
import type { AppScreen, SoloMatchSetup } from '../types/app';
import { NavigationShell } from './NavigationShell';

export interface SoloSetupScreenProps {
  readonly setup: SoloMatchSetup;
  readonly onChangeSetup: (next: SoloMatchSetup) => void;
  readonly onStartMatch: () => void;
  readonly onNavigate: (screen: AppScreen) => void;
}

const DIFFICULTIES: ReadonlyArray<{
  readonly id: AiDifficulty;
  readonly label: string;
  readonly desc: string;
}> = [
  { id: 'FACILE', label: 'Facile', desc: 'Décisions simples, idéal pour découvrir NEXUS.' },
  { id: 'NORMAL', label: 'Normal', desc: 'Gestion tactique équilibrée des familles et pouvoirs.' },
  {
    id: 'EXPERT',
    label: 'Expert',
    desc: 'Mémoire publique, optimisation des attaques et contrôle de table.',
  },
];

export function SoloSetupScreen({
  setup,
  onChangeSetup,
  onStartMatch,
  onNavigate,
}: SoloSetupScreenProps): React.ReactElement {
  const handleGlobalDifficulty = (difficulty: AiDifficulty) => {
    onChangeSetup({
      ...setup,
      defaultDifficulty: difficulty,
      opponents: setup.opponents.map((opp) => ({ ...opp, difficulty })),
    });
  };

  const handleOpponentDifficulty = (index: number, difficulty: AiDifficulty) => {
    onChangeSetup({
      ...setup,
      opponents: setup.opponents.map((opp, idx) =>
        idx === index ? { ...opp, difficulty } : opp,
      ),
    });
  };

  const handleOpponentName = (index: number, name: string) => {
    onChangeSetup({
      ...setup,
      opponents: setup.opponents.map((opp, idx) => (idx === index ? { ...opp, name } : opp)),
    });
  };

  const activeOpponents = setup.opponents.slice(0, setup.opponentCount);

  return (
    <NavigationShell
      currentScreen="SOLO_SETUP"
      title="Mode Solo — Configuration de la table"
      subtitle="Partie locale contre l’intelligence artificielle NEXUS, sans adversaires humains connectés."
      onNavigate={onNavigate}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Joueur humain */}
          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">Votre profil de table</h2>
            <p className="mt-1 text-xs text-slate-400">
              En partie, chaque participant est identifié uniquement par son nom, son nombre de
              cartes et son indicateur de tour.
            </p>
            <div className="mt-4">
              <label htmlFor="human-name-input" className="block text-xs font-semibold text-slate-300">
                Nom du joueur
              </label>
              <input
                id="human-name-input"
                type="text"
                maxLength={20}
                value={setup.humanName}
                onChange={(e) => onChangeSetup({ ...setup, humanName: e.target.value })}
                placeholder="Commandant"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050814] px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </section>

          {/* Nombre d'adversaires */}
          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-['Outfit'] text-lg font-bold text-white">
                  Nombre d’adversaires IA
                </h2>
                <p className="mt-1 text-xs text-slate-400 tabular-nums">
                  Table de {setup.opponentCount + 1} joueurs au total (2 à 6 autorisés)
                </p>
              </div>
              <Users className="h-5 w-5 text-sky-400 shrink-0" aria-hidden="true" />
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((count) => {
                const selected = setup.opponentCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChangeSetup({ ...setup, opponentCount: count })}
                    className={`rounded-lg border py-2.5 text-sm font-bold tabular-nums transition-colors ${
                      selected
                        ? 'border-sky-400 bg-sky-500 text-slate-950'
                        : 'border-slate-700 bg-[#050814] text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {count} IA
                  </button>
                );
              })}
            </div>
          </section>

          {/* Difficulté globale */}
          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              Niveau d’intelligence artificielle
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Applique la difficulté à l’ensemble de la table (personnalisable par adversaire à
              droite).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DIFFICULTIES.map((diff) => {
                const selected = setup.defaultDifficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => handleGlobalDifficulty(diff.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#050814] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-bold">{diff.label}</div>
                    <p className="mt-1 text-xs text-slate-400">{diff.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Liste des adversaires + lancement */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              Adversaires sur la table ({activeOpponents.length})
            </h2>
            <div className="mt-4 space-y-3">
              {activeOpponents.map((opp, idx) => (
                <div
                  key={opp.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#060B18] p-3"
                >
                  <input
                    type="text"
                    maxLength={16}
                    aria-label={`Nom de l'adversaire ${idx + 1}`}
                    value={opp.name}
                    onChange={(e) => handleOpponentName(idx, e.target.value)}
                    className="w-32 rounded border border-slate-700 bg-[#050814] px-2.5 py-1.5 text-xs font-semibold text-white focus:border-sky-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {(['FACILE', 'NORMAL', 'EXPERT'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleOpponentDifficulty(idx, lvl)}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                          opp.difficulty === lvl
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        {lvl === 'FACILE' ? 'Facile' : lvl === 'NORMAL' ? 'Normal' : 'Expert'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <button
                type="button"
                data-start="true"
                onClick={onStartMatch}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-300"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Lancer la partie Solo</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </NavigationShell>
  );
}
