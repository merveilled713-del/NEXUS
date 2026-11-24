import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AnimationStep } from '../animation/animationTypes';
import { FamilyEffectOverlay } from '../animation/FamilyEffectOverlay';
import { FAMILIES, FAMILIES_BY_ID } from '../catalog/families';
import type { FamilyId } from '../catalog/types';
import type { PlayerView } from '../engine/gameTypes';
import { FamilyEmblemGlyph, NexusCard, NexusCardBack } from '../graphics';
import type {
  AchievementDefinition,
  AppScreen,
  NexusSettings,
  TableThemeId,
} from '../types/app';

export interface GameTableScreenProps {
  readonly view: PlayerView;
  readonly settings: NexusSettings;
  readonly paused: boolean;
  readonly activeAnimationStep: AnimationStep | null;
  readonly actionLog: readonly string[];
  readonly statusFeedback: string | null;
  readonly newlyUnlockedAchievements: readonly AchievementDefinition[];
  readonly turnsPlayed: number;
  readonly onPlayCard: (cardInstanceId: string) => void;
  readonly onDrawCard: () => void;
  readonly onChooseFamily: (family: FamilyId) => void;
  readonly onDeclareNexus: () => void;
  readonly onReportMissedNexus: () => void;
  readonly onTogglePause: () => void;
  readonly onRestartMatch: () => void;
  readonly onToggleMute: () => void;
  readonly onNavigate: (screen: AppScreen) => void;
}

const THEME_CLASSES: Readonly<Record<TableThemeId, string>> = {
  VOID_STELLAR: 'bg-[#050814]',
  SOLAR_FORGE: 'bg-[#120A07]',
  QUANTUM_ABYSS: 'bg-[#041214]',
};

export function GameTableScreen({
  view,
  settings,
  paused,
  activeAnimationStep,
  actionLog,
  statusFeedback,
  newlyUnlockedAchievements,
  turnsPlayed,
  onPlayCard,
  onDrawCard,
  onChooseFamily,
  onDeclareNexus,
  onReportMissedNexus,
  onTogglePause,
  onRestartMatch,
  onToggleMute,
  onNavigate,
}: GameTableScreenProps): React.ReactElement {
  const activeFamilyDef = FAMILIES_BY_ID[view.activeFamily];
  const isHumanTurn =
    view.phase === 'PLAYING' && view.activePlayerId === view.self.id && !paused;
  const playableSet = new Set(view.self.playableCardIds);
  const mustDraw = isHumanTurn && view.self.playableCardIds.length === 0;
  const isHumanWinner = view.winners.includes(view.self.id);

  const activePlayerName =
    view.activePlayerId === view.self.id
      ? view.self.name
      : (view.opponents.find((o) => o.id === view.activePlayerId)?.name ?? '');

  return (
    <div
      data-testid="game-table"
      data-phase={view.phase}
      data-animation-level={settings.animationLevel}
      className={`relative flex min-h-screen flex-col justify-between overflow-x-hidden text-slate-100 ${THEME_CLASSES[settings.tableTheme]}`}
    >
      {/* Overlay d'animations programmatiques (6 animations familiales + effets spéciaux) */}
      <FamilyEffectOverlay activeStep={activeAnimationStep} level={settings.animationLevel} />

      {/* Top HUD Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#070C1C]/95 px-3 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-['Outfit'] text-lg font-extrabold tracking-[0.16em] text-white shrink-0">
              NEXUS
            </span>
            <span className="hidden text-xs text-slate-400 sm:inline whitespace-nowrap">
              Mode Solo · Tour {turnsPlayed + 1} · {view.drawPileCount} cartes en pioche
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={settings.soundMuted ? 'Réactiver le son' : 'Couper le son'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400"
            >
              {settings.soundMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('RULES')}
              aria-label="Ouvrir les règles"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-semibold text-slate-200 hover:border-sky-400"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Règles</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS')}
              aria-label="Ouvrir les paramètres"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-semibold text-slate-200 hover:border-sky-400"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Reprendre la partie' : 'Mettre en pause'}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700"
            >
              {paused ? (
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{paused ? 'Reprendre' : 'Pause'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2D Table Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between gap-4 px-3 py-4 sm:px-6 sm:py-5">
        {/* Zone Adversaires : strictement nom, nombre de cartes et indicateur de tour (zéro avatar/portrait) */}
        <section aria-label="Adversaires" className="w-full">
          <div
            className={`mx-auto grid gap-2.5 ${
              view.opponents.length === 1
                ? 'max-w-md grid-cols-1'
                : view.opponents.length === 2
                  ? 'max-w-3xl grid-cols-2'
                  : view.opponents.length === 3
                    ? 'grid-cols-2 sm:grid-cols-3'
                    : view.opponents.length === 4
                      ? 'grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            }`}
          >
            {view.opponents.map((opp) => {
              const isTurn = view.phase !== 'GAME_OVER' && view.activePlayerId === opp.id;
              const visibleBacks = Math.min(4, opp.cardCount);
              return (
                <div
                  key={opp.id}
                  data-opponent-id={opp.id}
                  data-active-turn={String(isTurn)}
                  className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                    isTurn
                      ? 'border-sky-400 bg-sky-500/15'
                      : 'border-slate-800 bg-[#090F22]/90'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-white">{opp.name}</span>
                      {opp.nexusDeclared ? (
                        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950 shrink-0">
                          NEXUS
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-300 tabular-nums">
                      <span className="whitespace-nowrap">{opp.cardCount} carte(s)</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`whitespace-nowrap ${
                          isTurn ? 'font-bold text-sky-300' : 'text-slate-400'
                        }`}
                      >
                        {isTurn ? 'Tour actif' : `IA ${opp.aiDifficulty ?? 'NORMAL'}`}
                      </span>
                    </div>
                  </div>

                  {/* Dos des cartes adverses (aucune identité révélée) */}
                  <div className="flex items-center shrink-0" aria-hidden="true">
                    {Array.from({ length: visibleBacks }, (_, idx) => (
                      <div key={idx} className={idx > 0 ? '-ml-6' : ''}>
                        <NexusCardBack
                          size="xs"
                          glowEnabled={settings.glowEnabled}
                          className="!w-[32px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Arène Centrale : Famille active + Sens + Pioche + Défausse */}
        <section
          aria-label="Centre de la table"
          className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 rounded-2xl border border-slate-800/90 bg-[#080E20]/85 px-4 py-5 sm:px-8 sm:py-6"
        >
          {/* Indicateurs de table */}
          <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div
              data-testid="active-family-indicator"
              data-active-family={view.activeFamily}
              className="flex items-center gap-2.5"
            >
              <svg viewBox="-46 -46 92 92" className="h-8 w-8 shrink-0" aria-hidden="true">
                <FamilyEmblemGlyph
                  family={view.activeFamily}
                  color={activeFamilyDef.primaryColor}
                  accentColor={activeFamilyDef.secondaryColor}
                />
              </svg>
              <div>
                <div className="text-[11px] font-medium text-slate-400">Famille active</div>
                <div
                  className="text-sm font-extrabold tracking-wide"
                  style={{ color: activeFamilyDef.secondaryColor }}
                >
                  {activeFamilyDef.displayName}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-[11px] text-slate-400">Tour actuel</div>
              <div className="text-sm font-bold text-white">
                {view.phase === 'GAME_OVER'
                  ? 'Partie terminée'
                  : view.phase === 'CHOOSING_FAMILY'
                    ? `${activePlayerName} choisit la famille`
                    : activePlayerName}
              </div>
            </div>

            <div
              data-testid="direction-indicator"
              data-direction={String(view.direction)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-200"
            >
              {view.direction === 1 ? (
                <RotateCw className="h-4 w-4 text-sky-400" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4 text-amber-400" aria-hidden="true" />
              )}
              <span>{view.direction === 1 ? 'Sens horaire' : 'Sens anti-horaire'}</span>
            </div>
          </div>

          {/* Pioche & Défausse côte à côte */}
          <div className="flex flex-wrap items-center justify-center gap-8 py-1 sm:gap-14">
            {/* Pioche */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                data-testid="draw-pile-button"
                disabled={!mustDraw}
                onClick={onDrawCard}
                aria-label={
                  mustDraw
                    ? `Piocher une carte (${view.drawPileCount} restantes)`
                    : `Pioche (${view.drawPileCount} cartes restantes)`
                }
                className={`group relative rounded-[6%] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  mustDraw
                    ? 'cursor-pointer ring-2 ring-amber-400 hover:-translate-y-1'
                    : 'cursor-default opacity-90'
                }`}
              >
                <NexusCardBack
                  size="sm"
                  glowEnabled={settings.glowEnabled}
                  className="sm:w-[132px]"
                />
              </button>
              <div className="text-center text-xs tabular-nums">
                <div className={mustDraw ? 'font-bold text-amber-300' : 'font-semibold text-slate-300'}>
                  {mustDraw ? 'Piocher 1 carte' : 'Pioche'}
                </div>
                <div className="text-slate-400">{view.drawPileCount} carte(s)</div>
              </div>
            </div>

            {/* Défausse */}
            <div className="flex flex-col items-center gap-2" data-testid="discard-pile">
              <NexusCard
                variantId={view.discardTop.variantId}
                size="sm"
                glowEnabled={settings.glowEnabled}
                className="sm:w-[132px]"
              />
              <div className="text-center text-xs tabular-nums">
                <div className="font-semibold text-slate-200">Défausse</div>
                <div className="text-slate-400">{view.discardCount} carte(s)</div>
              </div>
            </div>
          </div>

          {/* Dernière action / retour clair */}
          <div className="w-full space-y-1 text-center">
            {statusFeedback ? (
              <div
                role="status"
                className="text-xs font-semibold text-amber-300"
              >
                {statusFeedback}
              </div>
            ) : null}
            <div
              data-testid="action-feed"
              className="truncate text-xs text-slate-300"
            >
              {actionLog[0] ?? 'Sélectionnez une carte compatible surlignée pour jouer.'}
            </div>
          </div>
        </section>

        {/* Zone Joueur Humain : Contrôles NEXUS + Main du joueur */}
        <section
          aria-label="Votre main"
          className="rounded-2xl border border-slate-800/90 bg-[#070D1F]/95 px-3 py-3.5 sm:px-6 sm:py-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{view.self.name}</span>
                  {view.self.nexusDeclared || view.self.nexusPreDeclared ? (
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      NEXUS
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-400 tabular-nums">
                  {view.self.hand.length} carte(s) en main ·{' '}
                  <span className={isHumanTurn ? 'font-bold text-emerald-300' : 'text-slate-400'}>
                    {isHumanTurn
                      ? mustDraw
                        ? 'Aucune carte jouable : piochez 1 carte'
                        : 'À vous de jouer'
                      : view.mustChooseFamily
                        ? 'Choisissez la famille active'
                        : 'Tour adverse en cours'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {view.canDeclareNexus ? (
                <button
                  type="button"
                  onClick={onDeclareNexus}
                  className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-md transition-colors hover:bg-amber-300"
                >
                  Déclarer NEXUS !
                </button>
              ) : null}
              {view.canReportMissedNexus ? (
                <button
                  type="button"
                  onClick={onReportMissedNexus}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-400"
                >
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Signaler oubli NEXUS (+2)</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Main du joueur : défilement horizontal interne propre sans déborder sur mobile */}
          <div
            data-testid="player-hand"
            className="flex w-full items-end gap-2 overflow-x-auto pb-2 pt-3 sm:justify-center sm:gap-2.5"
          >
            {view.self.hand.map((card) => {
              const isPlayable = isHumanTurn && playableSet.has(card.instanceId);
              return (
                <div key={card.instanceId} className="shrink-0">
                  <NexusCard
                    variantId={card.variantId}
                    size="sm"
                    glowEnabled={settings.glowEnabled}
                    playable={isPlayable}
                    dimmed={isHumanTurn && !isPlayable}
                    className="sm:w-[114px]"
                    onClick={isPlayable ? () => onPlayCard(card.instanceId) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modale 1 : Choix de famille pour PORTAIL / SURCHARGE */}
      {view.mustChooseFamily && !paused ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="family-picker-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0A1022] p-6 shadow-2xl">
            <h2 id="family-picker-title" className="font-['Outfit'] text-xl font-bold text-white">
              Choisissez la nouvelle famille active
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Cette famille devient immédiatement active pour le reste de la manche.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FAMILIES.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => onChooseFamily(family.id)}
                  className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#050814] p-3.5 text-left transition-colors hover:border-sky-400 hover:bg-slate-900"
                >
                  <svg viewBox="-46 -46 92 92" className="h-8 w-8 shrink-0" aria-hidden="true">
                    <FamilyEmblemGlyph
                      family={family.id}
                      color={family.primaryColor}
                      accentColor={family.secondaryColor}
                    />
                  </svg>
                  <span className="text-sm font-bold text-white">{family.displayName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Modale 2 : Pause */}
      {paused && view.phase !== 'GAME_OVER' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-[#0A1022] p-6 shadow-2xl space-y-5">
            <div>
              <h2 id="pause-modal-title" className="font-['Outfit'] text-xl font-bold text-white">
                Partie en pause
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                La simulation des tours est suspendue.
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="w-full rounded-xl bg-sky-400 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-300"
              >
                Reprendre la partie
              </button>
              <button
                type="button"
                onClick={onRestartMatch}
                className="w-full rounded-xl border border-slate-700 bg-[#050814] py-2.5 text-sm font-semibold text-white hover:border-sky-400"
              >
                Recommencer la manche
              </button>
              <button
                type="button"
                onClick={() => onNavigate('SETTINGS')}
                className="w-full rounded-xl border border-slate-700 bg-[#050814] py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500"
              >
                Paramètres (Animations / Son)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('TITLE')}
                className="w-full rounded-xl border border-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Quitter vers le menu principal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modale 3 : Fin de partie (Victoire / Défaite) */}
      {view.phase === 'GAME_OVER' ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0A1022] p-6 shadow-2xl space-y-5">
            <div>
              <div
                className={`text-xs font-bold uppercase tracking-wider ${
                  isHumanWinner ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {view.endReason === 'EMPTY_HAND'
                  ? 'Victoire par main vidée'
                  : 'Fin par épuisement du paquet'}
              </div>
              <h2
                id="gameover-modal-title"
                className="mt-1 font-['Outfit'] text-2xl font-extrabold text-white"
              >
                {isHumanWinner ? 'Victoire en mode Solo !' : 'Manche terminée'}
              </h2>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050814] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Rang</th>
                    <th className="px-3 py-2">Joueur</th>
                    <th className="px-3 py-2 text-right">Cartes</th>
                    <th className="px-3 py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 tabular-nums">
                  {view.standings.map((row) => (
                    <tr
                      key={row.playerId}
                      className={row.isWinner ? 'bg-emerald-500/10 text-white' : 'text-slate-300'}
                    >
                      <td className="px-3 py-2 font-bold">#{row.rank}</td>
                      <td className="px-3 py-2 font-semibold">
                        {row.name}
                        {row.playerId === view.self.id ? ' (Vous)' : ''}
                      </td>
                      <td className="px-3 py-2 text-right">{row.cardCount}</td>
                      <td className="px-3 py-2 text-right">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {newlyUnlockedAchievements.length > 0 ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="font-bold">Nouveau(x) succès débloqué(s) :</div>
                <ul className="mt-1 space-y-0.5">
                  {newlyUnlockedAchievements.map((ach) => (
                    <li key={ach.id}>
                      {ach.title} (+{ach.xpReward} XP)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onRestartMatch}
                className="flex-1 rounded-xl bg-sky-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-sky-300"
              >
                Rejouer
              </button>
              <button
                type="button"
                onClick={() => onNavigate('SOLO_SETUP')}
                className="rounded-xl border border-slate-700 bg-[#050814] px-4 py-3 text-sm font-semibold text-white hover:border-sky-400"
              >
                Configurer
              </button>
              <button
                type="button"
                onClick={() => onNavigate('TITLE')}
                className="rounded-xl border border-slate-800 px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Menu principal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
