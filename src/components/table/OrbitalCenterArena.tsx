import React from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { FAMILIES_BY_ID } from '../../catalog/families';
import type { CardVariantId, FamilyId } from '../../catalog/types';
import type { GamePhase as EngineGamePhase } from '../../engine/gameTypes';
import { FamilyEmblemGlyph, NexusCard, NexusCardBack } from '../../graphics';
import type { AnimationLevel } from '../../types/app';
import { NexusChromePanel } from '../ui';

export interface OrbitalCenterArenaProps {
  readonly activeFamily: FamilyId;
  readonly direction: 1 | -1;
  readonly phase: EngineGamePhase;
  readonly activePlayerName: string;
  readonly drawPileCount: number;
  readonly discardCount: number;
  readonly discardTopVariantId: CardVariantId;
  readonly mustDraw: boolean;
  readonly canConfirmSelectedPlay: boolean;
  readonly glowEnabled: boolean;
  readonly animationLevel: AnimationLevel;
  readonly numericPulseKey: string | null;
  readonly landingPulseKey: string | null;
  readonly statusFeedback: string | null;
  readonly latestActionText: string;
  readonly onDrawCard: () => void;
  readonly onConfirmSelectedToDiscard: () => void;
}

export function OrbitalCenterArena({
  activeFamily,
  direction,
  phase,
  activePlayerName,
  drawPileCount,
  discardCount,
  discardTopVariantId,
  mustDraw,
  canConfirmSelectedPlay,
  glowEnabled,
  animationLevel,
  numericPulseKey,
  landingPulseKey,
  statusFeedback,
  latestActionText,
  onDrawCard,
  onConfirmSelectedToDiscard,
}: OrbitalCenterArenaProps): React.ReactElement {
  const familyDef = FAMILIES_BY_ID[activeFamily];
  const isOff = animationLevel === 'OFF';
  const showAura = glowEnabled && !isOff;

  return (
    <section aria-label="Centre de la table" className="relative mx-auto w-full max-w-5xl">
      <NexusChromePanel
        tone="chrome"
        chamfer="lg"
        accentColor={showAura ? familyDef.primaryColor : undefined}
        innerClassName="relative overflow-hidden px-3 py-3 sm:px-8 sm:py-6"
      >
        {/* Disque énergétique orbital arrière-plan (calibré sur la famille active) */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 640 360"
            className="h-full w-full max-w-[640px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id={`arena-aura-${activeFamily}`} cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor={familyDef.primaryColor}
                  stopOpacity={showAura ? 0.22 : 0.05}
                />
                <stop
                  offset="55%"
                  stopColor={familyDef.secondaryColor}
                  stopOpacity={showAura ? 0.09 : 0.02}
                />
                <stop offset="100%" stopColor="#060B1B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="320" cy="185" rx="280" ry="155" fill={`url(#arena-aura-${activeFamily})`} />
            <circle
              cx="320"
              cy="185"
              r="164"
              fill="none"
              stroke="#475569"
              strokeOpacity="0.34"
              strokeWidth="1.2"
            />
            <circle
              cx="320"
              cy="185"
              r="142"
              fill="none"
              stroke={familyDef.primaryColor}
              strokeOpacity={showAura ? 0.55 : 0.24}
              strokeWidth="1.5"
              strokeDasharray="18 10"
            />
            <circle
              cx="320"
              cy="185"
              r="116"
              fill="none"
              stroke="#F5DEB3"
              strokeOpacity="0.28"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Bandeau d'état orbital : Famille active | Tour actuel | Sens de jeu */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/85 pb-2.5 sm:gap-3 sm:pb-4">
          {/* Famille active + réaction lumineuse sobre des cartes numériques */}
          <div
            data-testid="active-family-indicator"
            data-active-family={activeFamily}
            className="relative flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-[#040917]">
              {!isOff && numericPulseKey ? (
                <span
                  key={numericPulseKey}
                  className="nexus-emblem-shimmer pointer-events-none absolute inset-0 rounded-full border-2"
                  style={{ borderColor: familyDef.secondaryColor }}
                  aria-hidden="true"
                />
              ) : null}
              <svg viewBox="-46 -46 92 92" className="h-7 w-7 shrink-0" aria-hidden="true">
                <FamilyEmblemGlyph
                  family={activeFamily}
                  color={familyDef.primaryColor}
                  accentColor={familyDef.secondaryColor}
                />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Famille active
              </div>
              <div
                className="font-['Outfit'] text-sm font-extrabold tracking-wider uppercase"
                style={{ color: familyDef.secondaryColor }}
              >
                {familyDef.displayName}
              </div>
            </div>
          </div>

          {/* Tour actuel */}
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Tour actuel
            </div>
            <div className="font-['Outfit'] text-sm font-extrabold text-white sm:text-base">
              {phase === 'GAME_OVER'
                ? 'Partie terminée'
                : phase === 'CHOOSING_FAMILY'
                  ? `${activePlayerName} choisit la famille`
                  : activePlayerName}
            </div>
          </div>

          {/* Sens de jeu */}
          <div
            data-testid="direction-indicator"
            data-direction={String(direction)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700/80 bg-[#040917]/90 px-3 py-1.5 text-xs font-bold text-slate-200"
          >
            {direction === 1 ? (
              <RotateCw className="h-4 w-4 text-sky-400" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4 text-[#F5DEB3]" aria-hidden="true" />
            )}
            <span className="whitespace-nowrap">
              {direction === 1 ? 'Sens horaire' : 'Sens anti-horaire'}
            </span>
          </div>
        </div>

        {/* Socles distincts : Pioche & Défausse */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-6 py-2.5 sm:gap-16 sm:py-5">
          {/* Socle Pioche */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative">
              {/* Épaisseur visuelle de pile */}
              {drawPileCount > 1 ? (
                <div
                  className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-full w-full rounded-[5%] border border-slate-700/70 bg-[#050A18]"
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                data-testid="draw-pile-button"
                data-flight-anchor="draw-pile"
                disabled={!mustDraw}
                onClick={onDrawCard}
                aria-label={
                  mustDraw
                    ? `Piocher une carte (${drawPileCount} restantes)`
                    : `Pioche (${drawPileCount} cartes restantes)`
                }
                className={`relative block rounded-[5%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-transform duration-150'
                } ${
                  mustDraw
                    ? `cursor-pointer ring-2 ring-amber-400 ${isOff ? '' : 'hover:-translate-y-1'}`
                    : 'cursor-default opacity-95'
                }`}
              >
                <NexusCardBack
                  size="sm"
                  glowEnabled={glowEnabled}
                  className="sm:!w-[126px]"
                />
              </button>
            </div>
            <div className="text-center text-xs tabular-nums">
              <div className={mustDraw ? 'font-extrabold text-amber-300' : 'font-bold text-slate-200'}>
                {mustDraw ? 'Piocher 1 carte' : 'Pioche'}
              </div>
              <div className="text-slate-400">{drawPileCount} carte(s)</div>
            </div>
          </div>

          {/* Socle Défausse (cible d'atterrissage & confirmation optionnelle au clic) */}
          <div className="flex flex-col items-center gap-2.5">
            <div
              data-testid="discard-pile"
              data-flight-anchor="discard-pile"
              onClick={canConfirmSelectedPlay ? onConfirmSelectedToDiscard : undefined}
              role={canConfirmSelectedPlay ? 'button' : undefined}
              tabIndex={canConfirmSelectedPlay ? 0 : undefined}
              onKeyDown={
                canConfirmSelectedPlay
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onConfirmSelectedToDiscard();
                      }
                    }
                  : undefined
              }
              aria-label={
                canConfirmSelectedPlay ? 'Poser la carte sélectionnée sur la défausse' : undefined
              }
              className={`relative rounded-[5%] ${
                canConfirmSelectedPlay
                  ? 'cursor-pointer ring-2 ring-[#F5DEB3] focus-visible:outline-none focus-visible:ring-sky-300'
                  : ''
              }`}
            >
              {/* Halo discret de pose sur le socle */}
              {!isOff && landingPulseKey ? (
                <span
                  key={`ring-${landingPulseKey}`}
                  className="nexus-emblem-shimmer pointer-events-none absolute -inset-2 rounded-[8%] border-2"
                  style={{ borderColor: familyDef.primaryColor }}
                  aria-hidden="true"
                />
              ) : null}

              <div
                key={!isOff && landingPulseKey ? `card-${landingPulseKey}` : 'discard-static'}
                className={!isOff && landingPulseKey ? 'nexus-card-land' : ''}
              >
                <NexusCard
                  variantId={discardTopVariantId}
                  size="sm"
                  glowEnabled={glowEnabled}
                  className="sm:!w-[126px]"
                />
              </div>
            </div>
            <div className="text-center text-xs tabular-nums">
              <div
                className={
                  canConfirmSelectedPlay
                    ? 'font-extrabold text-[#F5DEB3]'
                    : 'font-bold text-slate-200'
                }
              >
                {canConfirmSelectedPlay ? 'Cliquer pour poser' : 'Défausse'}
              </div>
              <div className="text-slate-400">{discardCount} carte(s)</div>
            </div>
          </div>
        </div>

        {/* Bandeau sobre de dernière action publique */}
        <div className="relative z-10 border-t border-slate-800/80 pt-2 text-center sm:pt-3">
          {statusFeedback ? (
            <div role="status" className="mb-1 text-xs font-bold text-amber-300">
              {statusFeedback}
            </div>
          ) : null}
          <div
            data-testid="action-feed"
            className="truncate text-xs text-slate-300"
          >
            {latestActionText}
          </div>
        </div>
      </NexusChromePanel>
    </section>
  );
}
