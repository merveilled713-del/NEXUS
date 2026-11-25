import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AnimationStep } from '../animation/animationTypes';
import { FamilyEffectOverlay } from '../animation/FamilyEffectOverlay';
import { FAMILIES } from '../catalog/families';
import type { FamilyId } from '../catalog/types';
import type { PlayerView } from '../engine/gameTypes';
import { FamilyEmblemGlyph } from '../graphics';
import type {
  AchievementDefinition,
  AppScreen,
  NexusSettings,
} from '../types/app';
import { CardFlightLayer } from './table/CardFlightLayer';
import { OpponentPlate } from './table/OpponentPlate';
import { OrbitalCenterArena } from './table/OrbitalCenterArena';
import { PlayerCommandDock } from './table/PlayerCommandDock';
import type {
  ActiveSpecialChoreography,
  CardFlightSpec,
} from './table/specialAnimationCatalog';
import {
  NexusBackdrop,
  NexusChamferButton,
  NexusLogoSvg,
  NexusModalShell,
} from './ui';

export interface GameTableScreenProps {
  readonly view: PlayerView;
  readonly settings: NexusSettings;
  readonly paused: boolean;
  readonly activeAnimationStep: AnimationStep | null;
  readonly activeFlight?: CardFlightSpec | null;
  readonly activeSpecialChoreography?: ActiveSpecialChoreography | null;
  readonly numericPulseKey?: string | null;
  readonly landingPulseKey?: string | null;
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

export function GameTableScreen({
  view,
  settings,
  paused,
  activeAnimationStep,
  activeFlight = null,
  activeSpecialChoreography = null,
  numericPulseKey = null,
  landingPulseKey = null,
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const lastHumanSourceRectRef = useRef<DOMRect | null>(null);

  const isHumanTurn =
    view.phase === 'PLAYING' && view.activePlayerId === view.self.id && !paused;
  const playableSet = new Set(view.self.playableCardIds);
  const mustDraw = isHumanTurn && view.self.playableCardIds.length === 0;
  const isHumanWinner = view.winners.includes(view.self.id);
  const isOff = settings.animationLevel === 'OFF';

  useEffect(() => {
    if (!isHumanTurn || (selectedCardId && !playableSet.has(selectedCardId))) {
      setSelectedCardId(null);
    }
  }, [isHumanTurn, selectedCardId, view.self.playableCardIds]);

  const captureCardRectAndPlay = (cardInstanceId: string) => {
    if (typeof document !== 'undefined' && !isOff) {
      const cardEl = document.querySelector(
        `[data-flight-anchor="hand-card-${cardInstanceId}"]`,
      );
      lastHumanSourceRectRef.current = cardEl ? cardEl.getBoundingClientRect() : null;
    } else {
      lastHumanSourceRectRef.current = null;
    }
    setSelectedCardId(null);
    onPlayCard(cardInstanceId);
  };

  const handleDockCardClick = (cardInstanceId: string) => {
    if (!isHumanTurn || !playableSet.has(cardInstanceId)) return;
    if (isOff) {
      captureCardRectAndPlay(cardInstanceId);
      return;
    }
    if (selectedCardId === cardInstanceId) {
      captureCardRectAndPlay(cardInstanceId);
      return;
    }
    setSelectedCardId(cardInstanceId);
  };

  const activePlayerName =
    view.activePlayerId === view.self.id
      ? view.self.name
      : (view.opponents.find((o) => o.id === view.activePlayerId)?.name ?? '');

  const resolvePlayerName = (playerId: string | null): string | null => {
    if (!playerId) return null;
    if (playerId === view.self.id) return view.self.name;
    return view.opponents.find((o) => o.id === playerId)?.name ?? null;
  };

  const specialTargetName = resolvePlayerName(activeSpecialChoreography?.targetPlayerId ?? null);

  return (
    <div
      data-testid="game-table"
      data-phase={view.phase}
      data-animation-level={settings.animationLevel}
      className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#030612] text-slate-100"
    >
      <NexusBackdrop
        variant="table"
        tableTheme={settings.tableTheme}
        glowEnabled={settings.glowEnabled}
        animationLevel={settings.animationLevel}
      />

      {/* Calque de déplacement animé des cartes (synchro événements réels, zéro blocage moteur) */}
      <CardFlightLayer
        activeFlight={
          activeFlight
            ? {
                spec: activeFlight,
                capturedSourceRect:
                  activeFlight.sourcePlayerId === view.self.id
                    ? lastHumanSourceRectRef.current
                    : null,
              }
            : null
        }
        humanPlayerId={view.self.id}
        level={settings.animationLevel}
        glowEnabled={settings.glowEnabled}
      />

      {/* Calque des 20 signatures spéciales (18 familiales + 2 universelles) & événements système */}
      <FamilyEffectOverlay
        activeStep={activeAnimationStep}
        specialChoreography={activeSpecialChoreography}
        targetPlayerName={specialTargetName}
        level={settings.animationLevel}
      />

      {/* Rail supérieur métallique */}
      <header className="relative z-20 border-b border-slate-800/80 bg-[#050A19]/90 px-3 py-2.5 backdrop-blur-md sm:px-6">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.4) 25%, rgba(245,222,179,0.55) 50%, rgba(56,189,248,0.4) 75%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NexusLogoSvg
              size="compact"
              glowEnabled={settings.glowEnabled}
              animationLevel={settings.animationLevel}
            />
            <span className="shrink-0 font-['Outfit'] text-sm font-black tracking-[0.14em] nexus-title-metallic sm:text-lg sm:tracking-[0.18em]">
              NEXUS
            </span>
            <span className="hidden text-xs text-slate-300 tabular-nums md:inline whitespace-nowrap">
              Mode Solo · Tour {turnsPlayed + 1} · {view.drawPileCount} cartes en pioche
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={settings.soundMuted ? 'Réactiver le son' : 'Couper le son'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-700/85 bg-[#081024] text-slate-200 hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              {settings.soundMuted ? (
                <VolumeX className="h-4 w-4 text-slate-400" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('RULES')}
              aria-label="Ouvrir les règles"
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-slate-700/85 bg-[#081024] px-3 text-xs font-semibold text-slate-200 hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <BookOpen className="h-4 w-4 text-[#F5DEB3]" aria-hidden="true" />
              <span className="hidden sm:inline">Règles</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS')}
              aria-label="Ouvrir les paramètres"
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-slate-700/85 bg-[#081024] px-3 text-xs font-semibold text-slate-200 hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <Settings className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Reprendre la partie' : 'Mettre en pause'}
              className="inline-flex h-11 items-center gap-1.5 bg-slate-800/95 px-3 text-xs font-bold text-white nexus-chamfer-sm hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:px-3.5"
            >
              {paused ? (
                <Play className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
              ) : (
                <Pause className="h-3.5 w-3.5 text-[#F5DEB3]" aria-hidden="true" />
              )}
              <span>{paused ? 'Reprendre' : 'Pause'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Plateau principal */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between gap-2.5 px-2.5 py-2.5 sm:gap-4 sm:px-6 sm:py-5">
        {/* Couronne des adversaires : strictement nom, nombre de cartes et indicateur de tour */}
        <section aria-label="Adversaires" className="w-full">
          <div
            className={`mx-auto grid gap-2 sm:gap-2.5 ${
              view.opponents.length === 1
                ? 'max-w-md grid-cols-1'
                : view.opponents.length === 2
                  ? 'max-w-3xl grid-cols-2'
                  : view.opponents.length === 3
                    ? 'grid-cols-3'
                    : view.opponents.length === 4
                      ? 'grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-3 lg:grid-cols-5'
            }`}
          >
            {view.opponents.map((opp) => (
              <OpponentPlate
                key={opp.id}
                opponent={opp}
                isTurn={view.phase !== 'GAME_OVER' && view.activePlayerId === opp.id}
                animationLevel={settings.animationLevel}
              />
            ))}
          </div>
        </section>

        {/* Arène Centrale Orbitale */}
        <OrbitalCenterArena
          activeFamily={view.activeFamily}
          direction={view.direction}
          phase={view.phase}
          activePlayerName={activePlayerName}
          drawPileCount={view.drawPileCount}
          discardCount={view.discardCount}
          discardTopVariantId={view.discardTop.variantId}
          mustDraw={mustDraw}
          canConfirmSelectedPlay={
            !isOff && isHumanTurn && selectedCardId !== null && playableSet.has(selectedCardId)
          }
          glowEnabled={settings.glowEnabled}
          animationLevel={settings.animationLevel}
          numericPulseKey={numericPulseKey}
          landingPulseKey={landingPulseKey}
          statusFeedback={statusFeedback}
          latestActionText={
            actionLog[0] ?? 'Sélectionnez une carte compatible surlignée pour jouer.'
          }
          onDrawCard={onDrawCard}
          onConfirmSelectedToDiscard={() => {
            if (selectedCardId && playableSet.has(selectedCardId)) {
              captureCardRectAndPlay(selectedCardId);
            }
          }}
        />

        {/* Dock du joueur humain */}
        <PlayerCommandDock
          playerId={view.self.id}
          playerName={view.self.name}
          hand={view.self.hand}
          playableCardIds={view.self.playableCardIds}
          isHumanTurn={isHumanTurn}
          mustDraw={mustDraw}
          mustChooseFamily={view.mustChooseFamily}
          selectedCardId={selectedCardId}
          canDeclareNexus={view.canDeclareNexus}
          canReportMissedNexus={view.canReportMissedNexus}
          glowEnabled={settings.glowEnabled}
          animationLevel={settings.animationLevel}
          onCardClick={handleDockCardClick}
          onConfirmSelected={() => {
            if (selectedCardId && playableSet.has(selectedCardId)) {
              captureCardRectAndPlay(selectedCardId);
            }
          }}
          onCancelSelection={() => setSelectedCardId(null)}
          onDeclareNexus={onDeclareNexus}
          onReportMissedNexus={onReportMissedNexus}
        />
      </main>

      {/* Modale 1 : Choix de famille pour PORTAIL / SURCHARGE */}
      <NexusModalShell
        open={view.mustChooseFamily && !paused}
        titleId="family-picker-title"
        eyebrow="Résonance Stratégique"
        title="Choisissez la nouvelle famille active"
        subtitle="Cette famille devient immédiatement active pour le reste de la manche."
        tone="champagne"
        maxWidthClass="max-w-xl"
        animationLevel={settings.animationLevel}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FAMILIES.map((family) => (
            <button
              key={family.id}
              type="button"
              onClick={() => onChooseFamily(family.id)}
              className={`group flex min-h-[64px] items-center gap-3 border bg-[#040917] p-3.5 text-left nexus-chamfer-sm hover:bg-[#0B1530] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                isOff ? '' : 'transition-all duration-150 hover:-translate-y-0.5'
              }`}
              style={{ borderColor: `${family.primaryColor}70` }}
            >
              <svg viewBox="-46 -46 92 92" className="h-9 w-9 shrink-0" aria-hidden="true">
                <FamilyEmblemGlyph
                  family={family.id}
                  color={family.primaryColor}
                  accentColor={family.secondaryColor}
                />
              </svg>
              <span className="font-['Outfit'] text-sm font-extrabold tracking-wide text-white">
                {family.displayName}
              </span>
            </button>
          ))}
        </div>
      </NexusModalShell>

      {/* Modale 2 : Pause */}
      <NexusModalShell
        open={paused && view.phase !== 'GAME_OVER'}
        titleId="pause-modal-title"
        eyebrow="Système en attente"
        title="Partie en pause"
        subtitle="La simulation des tours est suspendue."
        tone="chrome"
        maxWidthClass="max-w-sm"
        onClose={onTogglePause}
        closeLabel="Reprendre la partie"
        animationLevel={settings.animationLevel}
      >
        <div className="space-y-3">
          <NexusChamferButton
            variant="primary"
            fullWidth
            onClick={onTogglePause}
            animationLevel={settings.animationLevel}
          >
            Reprendre la partie
          </NexusChamferButton>
          <NexusChamferButton
            variant="secondary"
            fullWidth
            onClick={onRestartMatch}
            animationLevel={settings.animationLevel}
          >
            Recommencer la manche
          </NexusChamferButton>
          <NexusChamferButton
            variant="secondary"
            fullWidth
            onClick={() => onNavigate('SETTINGS')}
            animationLevel={settings.animationLevel}
          >
            Paramètres (Animations / Son)
          </NexusChamferButton>
          <NexusChamferButton
            variant="ghost"
            fullWidth
            onClick={() => onNavigate('TITLE')}
            animationLevel={settings.animationLevel}
          >
            Quitter vers le menu principal
          </NexusChamferButton>
        </div>
      </NexusModalShell>

      {/* Modale 3 : Fin de partie */}
      <NexusModalShell
        open={view.phase === 'GAME_OVER'}
        titleId="gameover-modal-title"
        eyebrow={
          view.endReason === 'EMPTY_HAND'
            ? 'Victoire par main vidée'
            : 'Fin par épuisement du paquet'
        }
        title={isHumanWinner ? 'Victoire en mode Solo !' : 'Manche terminée'}
        tone={isHumanWinner ? 'champagne' : 'chrome'}
        maxWidthClass="max-w-lg"
        animationLevel={settings.animationLevel}
      >
        <div className="space-y-5">
          <div className="overflow-hidden border border-slate-800/90 bg-[#040815] nexus-chamfer-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#070E22] text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Rang</th>
                  <th className="px-3.5 py-2.5">Joueur</th>
                  <th className="px-3.5 py-2.5 text-right">Cartes</th>
                  <th className="px-3.5 py-2.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 tabular-nums">
                {view.standings.map((row) => (
                  <tr
                    key={row.playerId}
                    className={row.isWinner ? 'bg-emerald-500/12 text-white' : 'text-slate-300'}
                  >
                    <td className="px-3.5 py-2.5 font-extrabold">#{row.rank}</td>
                    <td className="px-3.5 py-2.5 font-semibold">
                      {row.name}
                      {row.playerId === view.self.id ? ' (Vous)' : ''}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">{row.cardCount}</td>
                    <td className="px-3.5 py-2.5 text-right">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {newlyUnlockedAchievements.length > 0 ? (
            <div className="border border-amber-500/45 bg-amber-500/10 p-3.5 text-xs text-amber-200 nexus-chamfer-sm">
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
            <NexusChamferButton
              variant="primary"
              data-start="true"
              onClick={onRestartMatch}
              animationLevel={settings.animationLevel}
              className="flex-1"
            >
              Rejouer
            </NexusChamferButton>
            <NexusChamferButton
              variant="secondary"
              onClick={() => onNavigate('SOLO_SETUP')}
              animationLevel={settings.animationLevel}
            >
              Configurer
            </NexusChamferButton>
            <NexusChamferButton
              variant="ghost"
              onClick={() => onNavigate('TITLE')}
              animationLevel={settings.animationLevel}
            >
              Menu principal
            </NexusChamferButton>
          </div>
        </div>
      </NexusModalShell>
    </div>
  );
}
