import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Cpu, Palette, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react';
import type {
  AiPacing,
  AnimationLevel,
  AppScreen,
  NexusSettings,
  TableThemeId,
} from '../types/app';
import { NavigationShell } from './NavigationShell';
import { NexusChamferButton, NexusChromePanel, NexusModalShell } from './ui';

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
  readonly swatchBg: string;
  readonly swatchAccent: string;
}> = [
  {
    id: 'VOID_STELLAR',
    label: 'Vide Stellaire',
    swatchBg: '#030612',
    swatchAccent: '#38BDF8',
  },
  {
    id: 'SOLAR_FORGE',
    label: 'Forge Solaire',
    swatchBg: '#0E0705',
    swatchAccent: '#F59E0B',
  },
  {
    id: 'QUANTUM_ABYSS',
    label: 'Abysse Quantique',
    swatchBg: '#031013',
    swatchAccent: '#10B981',
  },
];

export function SettingsScreen({
  settings,
  onUpdateSettings,
  onResetProgression,
  onNavigate,
  returnToTableAvailable,
}: SettingsScreenProps): React.ReactElement {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const isOff = settings.animationLevel === 'OFF';

  useEffect(() => {
    if (!confirmResetOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmResetOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmResetOpen]);

  return (
    <NavigationShell
      currentScreen="SETTINGS"
      title="Paramètres d’affichage, d’animation et d’audio"
      subtitle="Personnalisez le niveau d’animation (FULL / REDUCED / OFF), le volume sonore et l’ambiance de table."
      onNavigate={onNavigate}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Colonne gauche : Animations et lueur */}
        <NexusChromePanel tone="chrome" chamfer="lg" innerClassName="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
            <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
              Niveau d’animations et d’effets
            </h2>
          </div>

          <div className="space-y-3">
            {ANIMATION_LEVELS.map((opt) => {
              const active = settings.animationLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, animationLevel: opt.id })}
                  className={`min-h-[68px] w-full border p-4 text-left nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    isOff ? '' : 'transition-colors duration-150'
                  } ${
                    active
                      ? 'border-sky-400 bg-sky-500/15 text-white'
                      : 'border-slate-800 bg-[#040917]/90 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-['Outfit'] text-sm font-extrabold">{opt.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 pt-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Effets lumineux des cartes</div>
              <p className="text-xs text-slate-400">
                Désactivables sans affecter la reconnaissance des 6 familles.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, glowEnabled: !settings.glowEnabled })
              }
              className={`min-h-[44px] shrink-0 border px-4 py-2 text-xs font-extrabold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                isOff ? '' : 'transition-colors duration-150'
              } ${
                settings.glowEnabled
                  ? 'border-sky-300 bg-sky-400 text-slate-950'
                  : 'border-slate-700 bg-[#040917] text-slate-300 hover:border-slate-500'
              }`}
            >
              {settings.glowEnabled ? 'Activés' : 'Désactivés'}
            </button>
          </div>
        </NexusChromePanel>

        {/* Colonne droite : Audio, Cadence IA, Thème de table & Réinitialisation */}
        <div className="space-y-6">
          <NexusChromePanel tone="cyan" chamfer="lg" innerClassName="p-5 sm:p-6 space-y-5">
            <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
              Audio et synthèse sonore
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-700/80 bg-[#040917] nexus-chamfer-sm">
                  {settings.soundMuted ? (
                    <VolumeX className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-sky-400" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Effets sonores</div>
                  <p className="text-xs text-slate-400 tabular-nums">
                    Volume actuel :{' '}
                    {settings.soundMuted ? 'Muet' : `${Math.round(settings.soundVolume * 100)} %`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, soundMuted: !settings.soundMuted })
                }
                className={`min-h-[44px] shrink-0 border px-4 py-2 text-xs font-extrabold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-colors duration-150'
                } ${
                  settings.soundMuted
                    ? 'border-slate-700 bg-[#040917] text-slate-300 hover:border-slate-500'
                    : 'border-sky-300 bg-sky-400 text-slate-950'
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
                <span className="font-bold text-sky-300 tabular-nums">
                  {Math.round(settings.soundVolume * 100)} %
                </span>
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
                className="mt-2.5 h-3 w-full cursor-pointer accent-sky-400"
              />
            </div>

            <div className="border-t border-slate-800/90 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Cpu className="h-4 w-4 text-[#F5DEB3]" aria-hidden="true" />
                <span>Cadence de l’IA en Solo</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'NORMAL', label: 'Lisible (650 ms)' },
                    { id: 'FAST', label: 'Rapide (280 ms)' },
                  ] as ReadonlyArray<{ id: AiPacing; label: string }>
                ).map((item) => {
                  const selected = settings.aiPacing === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, aiPacing: item.id })}
                      className={`min-h-[44px] border px-3 py-2 text-xs font-bold nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                        isOff ? '' : 'transition-colors duration-150'
                      } ${
                        selected
                          ? 'border-sky-400 bg-sky-500/15 text-white'
                          : 'border-slate-700/85 bg-[#040917] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </NexusChromePanel>

          <NexusChromePanel tone="champagne" chamfer="lg" innerClassName="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <Palette className="h-5 w-5 shrink-0 text-[#F5DEB3]" aria-hidden="true" />
              <h2 className="font-['Outfit'] text-lg font-extrabold text-white">Thème de table</h2>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {TABLE_THEMES.map((theme) => {
                const selected = settings.tableTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onUpdateSettings({ ...settings, tableTheme: theme.id })}
                    className={`min-h-[64px] border p-3.5 text-left nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                      isOff ? '' : 'transition-colors duration-150'
                    } ${
                      selected
                        ? 'border-sky-300 text-white ring-1 ring-sky-400/70'
                        : 'border-slate-700/80 text-slate-300 opacity-90 hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: theme.swatchBg }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/25"
                        style={{ backgroundColor: theme.swatchAccent }}
                        aria-hidden="true"
                      />
                      <span className="font-['Outfit'] text-xs font-extrabold">
                        {theme.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 pt-4">
              <NexusChamferButton
                variant="danger"
                onClick={() => setConfirmResetOpen(true)}
                animationLevel={settings.animationLevel}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Réinitialiser les statistiques</span>
              </NexusChamferButton>

              {returnToTableAvailable ? (
                <NexusChamferButton
                  variant="primary"
                  onClick={() => onNavigate('TABLE')}
                  animationLevel={settings.animationLevel}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Retour à la table</span>
                </NexusChamferButton>
              ) : null}
            </div>
          </NexusChromePanel>
        </div>
      </div>

      {/* Modale de confirmation de réinitialisation des statistiques */}
      {typeof document !== 'undefined'
        ? createPortal(
            <NexusModalShell
              open={confirmResetOpen}
              titleId="reset-stats-modal-title"
              eyebrow="Confirmation requise"
              title="Confirmer la remise à zéro ?"
              subtitle="Vos victoires, XP, variantes jouées et succès locaux seront réinitialisés à zéro."
              tone="chrome"
              maxWidthClass="max-w-md"
              onClose={() => setConfirmResetOpen(false)}
              closeLabel="Annuler la réinitialisation"
              animationLevel={settings.animationLevel}
            >
              <div className="flex flex-wrap gap-3">
                <NexusChamferButton
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    onResetProgression();
                    setConfirmResetOpen(false);
                  }}
                  animationLevel={settings.animationLevel}
                >
                  Confirmer
                </NexusChamferButton>
                <NexusChamferButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirmResetOpen(false)}
                  animationLevel={settings.animationLevel}
                >
                  Annuler
                </NexusChamferButton>
              </div>
            </NexusModalShell>,
            document.body,
          )
        : null}
    </NavigationShell>
  );
}
