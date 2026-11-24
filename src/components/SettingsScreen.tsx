import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type {
  AiPacing,
  AnimationLevel,
  AppScreen,
  NexusSettings,
  TableThemeId,
} from '../types/app';
import { NavigationShell } from './NavigationShell';

export interface SettingsScreenProps {
  readonly settings: NexusSettings;
  readonly onUpdateSettings: (next: NexusSettings) => void;
  readonly onResetProgression: () => void;
  readonly onNavigate: (screen: AppScreen) => void;
  readonly returnToTableAvailable: boolean;
}

const ANIMATION_LEVELS: ReadonlyArray<{
  readonly id: AnimationLevel;
  readonly title: string;
  readonly desc: string;
}> = [
  {
    id: 'FULL',
    title: 'FULL — Complètes',
    desc: 'Toutes les animations de distribution, pioche, cartes spéciales et les 6 animations familiales dessinées par le code.',
  },
  {
    id: 'REDUCED',
    title: 'REDUCED — Allégées',
    desc: 'Effets simplifiés et plus courts pour privilégier la rapidité et le confort visuel.',
  },
  {
    id: 'OFF',
    title: 'OFF — Animations désactivées',
    desc: 'Désactive uniquement les animations et effets visuels sur la table. Ne modifie ni le mode Solo ni les règles.',
  },
];

const TABLE_THEMES: ReadonlyArray<{
  readonly id: TableThemeId;
  readonly label: string;
  readonly previewClass: string;
}> = [
  { id: 'VOID_STELLAR', label: 'Vide Stellaire', previewClass: 'bg-[#050814] border-sky-500/40' },
  { id: 'SOLAR_FORGE', label: 'Forge Solaire', previewClass: 'bg-[#120A07] border-amber-500/40' },
  {
    id: 'QUANTUM_ABYSS',
    label: 'Abysse Quantique',
    previewClass: 'bg-[#041214] border-emerald-500/40',
  },
];

export function SettingsScreen({
  settings,
  onUpdateSettings,
  onResetProgression,
  onNavigate,
  returnToTableAvailable,
}: SettingsScreenProps): React.ReactElement {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <NavigationShell
      currentScreen="SETTINGS"
      title="Paramètres d’affichage, d’animation et d’audio"
      subtitle="Personnalisez le niveau d’animation (FULL / REDUCED / OFF), le volume sonore et l’ambiance de table."
      onNavigate={onNavigate}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Animations */}
        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6 space-y-4">
          <h2 className="font-['Outfit'] text-lg font-bold text-white">
            Niveau d’animations et d’effets
          </h2>
          <div className="space-y-2.5">
            {ANIMATION_LEVELS.map((opt) => {
              const active = settings.animationLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, animationLevel: opt.id })}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-500/15 text-white'
                      : 'border-slate-800 bg-[#050814] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.title}</div>
                  <p className="mt-1 text-xs text-slate-400">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div>
              <div className="text-sm font-semibold text-white">Effets lumineux des cartes</div>
              <p className="text-xs text-slate-400">
                Désactivables sans affecter la reconnaissance des 6 familles.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, glowEnabled: !settings.glowEnabled })
              }
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                settings.glowEnabled
                  ? 'bg-sky-400 text-slate-950'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {settings.glowEnabled ? 'Activés' : 'Désactivés'}
            </button>
          </div>
        </section>

        {/* Audio & Rythme */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6 space-y-4">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">Audio et synthèse sonore</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {settings.soundMuted ? (
                  <VolumeX className="h-5 w-5 text-slate-400" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-5 w-5 text-sky-400" aria-hidden="true" />
                )}
                <div>
                  <div className="text-sm font-semibold text-white">Effets sonores</div>
                  <p className="text-xs text-slate-400 tabular-nums">
                    Volume actuel : {settings.soundMuted ? 'Muet' : `${Math.round(settings.soundVolume * 100)} %`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, soundMuted: !settings.soundMuted })
                }
                className={`rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${
                  settings.soundMuted
                    ? 'border border-slate-700 bg-slate-900 text-slate-300'
                    : 'bg-sky-400 text-slate-950'
                }`}
              >
                {settings.soundMuted ? 'Son coupé' : 'Son actif'}
              </button>
            </div>

            <div>
              <label
                htmlFor="sound-volume-slider"
                className="flex items-center justify-between text-xs font-semibold text-slate-300"
              >
                <span>Volume principal</span>
                <span className="tabular-nums">{Math.round(settings.soundVolume * 100)} %</span>
              </label>
              <input
                id="sound-volume-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.soundVolume * 100)}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    soundVolume: Number(e.target.value) / 100,
                    soundMuted: Number(e.target.value) === 0,
                  })
                }
                className="mt-2 w-full accent-sky-400"
              />
            </div>

            <div className="border-t border-slate-800 pt-4">
              <div className="text-sm font-semibold text-white">Cadence de l’IA en Solo</div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'NORMAL', label: 'Lisible (650 ms)' },
                    { id: 'FAST', label: 'Rapide (280 ms)' },
                  ] as ReadonlyArray<{ id: AiPacing; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, aiPacing: item.id })}
                    className={`rounded-lg border py-2 text-xs font-semibold ${
                      settings.aiPacing === item.id
                        ? 'border-sky-400 bg-sky-500/15 text-white'
                        : 'border-slate-700 bg-[#050814] text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6 space-y-4">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">Thème de table</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TABLE_THEMES.map((theme) => {
                const selected = settings.tableTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, tableTheme: theme.id })}
                    className={`rounded-lg border p-3 text-left transition-colors ${theme.previewClass} ${
                      selected ? 'ring-2 ring-sky-400 text-white' : 'text-slate-300 opacity-85'
                    }`}
                  >
                    <div className="text-xs font-bold">{theme.label}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                >
                  Réinitialiser les statistiques
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-rose-200">Confirmer la remise à zéro ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgression();
                      setConfirmReset(false);
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {returnToTableAvailable ? (
                <button
                  type="button"
                  onClick={() => onNavigate('TABLE')}
                  className="rounded-lg bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950"
                >
                  Retour à la table
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </NavigationShell>
  );
}
