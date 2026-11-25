import React from 'react';
import { Play, Users } from 'lucide-react';
import type { AiDifficulty } from '../engine/gameTypes';
import type { AppScreen, SoloMatchSetup } from '../types/app';
import { NavigationShell } from './NavigationShell';
import { NexusChamferButton, NexusChromePanel, useNexusUi } from './ui';

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
  {
    id: 'NORMAL',
    label: 'Normal',
    desc: 'Gestion tactique équilibrée des familles et pouvoirs.',
  },
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
  const { animationLevel } = useNexusUi();
  const isOff = animationLevel === 'OFF';

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
      opponents: setup.opponents.map((opp, idx) =>
        idx === index ? { ...opp, name } : opp,
      ),
    });
  };

  const activeOpponents = setup.opponents.slice(0, setup.opponentCount);
  const displayHumanName = setup.humanName.trim() || 'Commandant';

  return (
    <NavigationShell
      currentScreen="SOLO_SETUP"
      title="Mode Solo — Configuration de la table"
      subtitle="Partie locale contre l’intelligence artificielle NEXUS, sans adversaires humains connectés."
      onNavigate={onNavigate}
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        {/* Colonne gauche : Paramètres de table */}
        <div className="space-y-6 lg:col-span-7">
          {/* Profil du joueur humain */}
          <NexusChromePanel tone="chrome" chamfer="md" innerClassName="p-5 sm:p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              Votre profil de table
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              En partie, chaque participant est identifié uniquement par son nom, son nombre de
              cartes et son indicateur de tour.
            </p>
            <div className="mt-4">
              <label
                htmlFor="human-name-input"
                className="block text-xs font-semibold tracking-wide text-slate-300 uppercase"
              >
                Nom du joueur
              </label>
              <input
                id="human-name-input"
                type="text"
                maxLength={20}
                value={setup.humanName}
                onChange={(e) => onChangeSetup({ ...setup, humanName: e.target.value })}
                placeholder="Commandant"
                className="mt-2 min-h-[44px] w-full rounded-md border border-slate-700/90 bg-[#040917] px-3.5 py-2.5 text-sm text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </NexusChromePanel>

          {/* Nombre d'adversaires */}
          <NexusChromePanel tone="chrome" chamfer="md" innerClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-['Outfit'] text-lg font-bold text-white">
                  Nombre d’adversaires IA
                </h2>
                <p className="mt-1 text-xs text-slate-400 tabular-nums">
                  Table de {setup.opponentCount + 1} joueurs au total (2 à 6 autorisés)
                </p>
              </div>
              <Users className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((count) => {
                const selected = setup.opponentCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChangeSetup({ ...setup, opponentCount: count })}
                    className={`min-h-[44px] border py-2.5 text-sm font-bold tabular-nums nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                      isOff ? '' : 'transition-colors duration-150'
                    } ${
                      selected
                        ? 'border-sky-300 bg-sky-400 text-slate-950'
                        : 'border-slate-700/85 bg-[#040917] text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {count} IA
                  </button>
                );
              })}
            </div>
          </NexusChromePanel>

          {/* Difficulté globale */}
          <NexusChromePanel tone="chrome" chamfer="md" innerClassName="p-5 sm:p-6">
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
                    className={`min-h-[76px] border p-4 text-left nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                      isOff ? '' : 'transition-colors duration-150'
                    } ${
                      selected
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-800 bg-[#040917] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-['Outfit'] text-sm font-bold">{diff.label}</div>
                    <p className="mt-1 text-xs text-slate-400">{diff.desc}</p>
                  </button>
                );
              })}
            </div>
          </NexusChromePanel>
        </div>

        {/* Colonne droite : Aperçu de disposition de la table (sans avatar) + adversaires + lancement */}
        <div className="space-y-6 lg:col-span-5">
          {/* Aperçu schématique de la disposition sans avatar ni personnage */}
          <NexusChromePanel tone="champagne" chamfer="md" innerClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-['Outfit'] text-base font-bold text-white">
                Aperçu de la disposition de table
              </h2>
              <span className="text-[11px] font-bold tracking-wider text-[#F5DEB3] uppercase tabular-nums">
                {setup.opponentCount + 1} sièges
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-slate-800/90 bg-[#040815] p-4">
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {activeOpponents.map((opp, idx) => (
                  <div
                    key={opp.id}
                    className="border border-slate-700/80 bg-[#081126] px-3 py-1.5 text-center nexus-chamfer-sm"
                  >
                    <div className="text-[10px] font-semibold text-slate-400 tabular-nums">
                      Siège {idx + 2}
                    </div>
                    <div className="max-w-[110px] truncate text-xs font-bold text-white">
                      {opp.name.trim() || `IA ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex h-16 w-40 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/8 text-[11px] font-bold tracking-widest text-sky-300 uppercase">
                Arène Centrale
              </div>

              <div className="border border-sky-400/60 bg-sky-500/12 px-4 py-1.5 text-center nexus-chamfer-sm">
                <div className="text-[10px] font-semibold text-sky-300">Siège 1 · Vous</div>
                <div className="max-w-[140px] truncate text-xs font-extrabold text-white">
                  {displayHumanName}
                </div>
              </div>
            </div>
          </NexusChromePanel>

          {/* Liste des adversaires + lancement */}
          <NexusChromePanel tone="cyan" chamfer="md" innerClassName="p-5 sm:p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              Adversaires sur la table ({activeOpponents.length})
            </h2>
            <div className="mt-4 space-y-2.5">
              {activeOpponents.map((opp, idx) => (
                <div
                  key={opp.id}
                  className="flex flex-wrap items-center justify-between gap-2.5 border border-slate-800 bg-[#040917] p-3 nexus-chamfer-sm"
                >
                  <input
                    type="text"
                    maxLength={16}
                    aria-label={`Nom de l'adversaire ${idx + 1}`}
                    value={opp.name}
                    onChange={(e) => handleOpponentName(idx, e.target.value)}
                    className="min-h-[40px] w-32 rounded border border-slate-700 bg-[#060D1F] px-2.5 py-1.5 text-xs font-semibold text-white focus:border-sky-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    {(['FACILE', 'NORMAL', 'EXPERT'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleOpponentDifficulty(idx, lvl)}
                        className={`min-h-[38px] rounded px-2.5 py-1 text-xs font-semibold ${
                          isOff ? '' : 'transition-colors'
                        } ${
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
              <NexusChamferButton
                variant="primary"
                fullWidth
                data-start="true"
                onClick={onStartMatch}
                animationLevel={animationLevel}
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Lancer la partie Solo</span>
              </NexusChamferButton>
            </div>
          </NexusChromePanel>
        </div>
      </div>
    </NavigationShell>
  );
}
