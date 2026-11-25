import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { PlayerView } from '../../engine/gameTypes';
import { NexusCard, resolveCardVisualSpec } from '../../graphics';
import type { AnimationLevel } from '../../types/app';
import { NexusChamferButton, NexusChromePanel } from '../ui';

export interface PlayerCommandDockProps {
  readonly playerId: string;
  readonly playerName: string;
  readonly hand: PlayerView['self']['hand'];
  readonly playableCardIds: readonly string[];
  readonly isHumanTurn: boolean;
  readonly mustDraw: boolean;
  readonly mustChooseFamily: boolean;
  readonly selectedCardId: string | null;
  readonly canDeclareNexus: boolean;
  readonly canReportMissedNexus: boolean;
  readonly glowEnabled: boolean;
  readonly animationLevel: AnimationLevel;
  readonly onCardClick: (cardInstanceId: string) => void;
  readonly onConfirmSelected: () => void;
  readonly onCancelSelection: () => void;
  readonly onDeclareNexus: () => void;
  readonly onReportMissedNexus: () => void;
}

export function PlayerCommandDock({
  playerId,
  playerName,
  hand,
  playableCardIds,
  isHumanTurn,
  mustDraw,
  mustChooseFamily,
  selectedCardId,
  canDeclareNexus,
  canReportMissedNexus,
  glowEnabled,
  animationLevel,
  onCardClick,
  onConfirmSelected,
  onCancelSelection,
  onDeclareNexus,
  onReportMissedNexus,
}: PlayerCommandDockProps): React.ReactElement {
  const playableSet = new Set(playableCardIds);
  const isOff = animationLevel === 'OFF';
  const selectedCard = selectedCardId ? hand.find((c) => c.instanceId === selectedCardId) ?? null : null;
  const selectedSpec = selectedCard ? resolveCardVisualSpec(selectedCard.variantId) : null;

  const turnStatusText = isHumanTurn
    ? mustDraw
      ? 'Aucune carte compatible : piochez 1 carte'
      : selectedCard
        ? 'Carte sélectionnée : confirmez le coup'
        : isOff
          ? 'Tour actif — cliquez sur une carte jouable'
          : 'Tour actif — sélectionnez une carte jouable'
    : mustChooseFamily
      ? 'Choisissez la famille active'
      : 'En attente du tour adverse';

  return (
    <section aria-label="Votre main" data-flight-anchor="human-dock" data-player-id={playerId}>
      <NexusChromePanel
        tone={isHumanTurn ? 'cyan' : 'chrome'}
        chamfer="lg"
        innerClassName="px-3 py-2.5 sm:px-6 sm:py-4"
      >
        {/* Barre d'identité stricte (nom, nombre de cartes, indicateur de tour) + actions contextuelles */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2.5">
              <span className="font-['Outfit'] text-base font-extrabold tracking-wide text-white">
                {playerName}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold ${
                  isHumanTurn
                    ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/90 text-slate-400'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isHumanTurn ? 'bg-emerald-300' : 'bg-slate-600'
                  }`}
                  aria-hidden="true"
                />
                <span>{isHumanTurn ? 'À vous' : 'En attente'}</span>
              </span>
            </div>

            <div className="text-xs text-slate-300 tabular-nums">
              {hand.length} {hand.length > 1 ? 'cartes' : 'carte'} en main ·{' '}
              <span className={isHumanTurn ? 'font-semibold text-sky-300' : 'text-slate-400'}>
                {turnStatusText}
              </span>
            </div>
          </div>

          {/* Barre de confirmation de sélection et actions NEXUS */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedCard && selectedSpec && isHumanTurn && !isOff ? (
              <div className="flex flex-wrap items-center gap-2">
                <NexusChamferButton
                  variant="primary"
                  onClick={onConfirmSelected}
                  animationLevel={animationLevel}
                  data-testid="confirm-play-button"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Jouer {selectedSpec.theme.displayName} ({selectedSpec.topLeftInsert.label})
                  </span>
                </NexusChamferButton>
                <button
                  type="button"
                  onClick={onCancelSelection}
                  aria-label="Annuler la sélection"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-slate-300 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {canDeclareNexus ? (
              <NexusChamferButton
                variant="champagne"
                onClick={onDeclareNexus}
                animationLevel={animationLevel}
              >
                <span>Déclarer NEXUS !</span>
              </NexusChamferButton>
            ) : null}

            {canReportMissedNexus ? (
              <NexusChamferButton
                variant="danger"
                onClick={onReportMissedNexus}
                animationLevel={animationLevel}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Signaler oubli NEXUS (+2)</span>
              </NexusChamferButton>
            ) : null}
          </div>
        </div>

        {/* Main du joueur : soulèvement fluide à la sélection et défilement horizontal interne propre */}
        <div
          data-testid="player-hand"
          className="flex w-full items-end gap-2 overflow-x-auto pb-1.5 pt-3.5 sm:justify-center sm:gap-2.5 sm:pb-2 sm:pt-5"
        >
          {hand.map((card) => {
            const isPlayable = isHumanTurn && playableSet.has(card.instanceId);
            const isSelected = isPlayable && selectedCardId === card.instanceId;
            return (
              <div
                key={card.instanceId}
                data-flight-anchor={`hand-card-${card.instanceId}`}
                className={`shrink-0 ${
                  isOff ? '' : 'transition-all duration-200 ease-out'
                } ${isSelected ? '-translate-y-3 scale-[1.04] z-10' : ''}`}
              >
                <NexusCard
                  variantId={card.variantId}
                  size="sm"
                  glowEnabled={glowEnabled && !isOff}
                  playable={isPlayable}
                  selected={isSelected}
                  dimmed={isHumanTurn && !isPlayable}
                  className="sm:!w-[114px]"
                  onClick={isPlayable ? () => onCardClick(card.instanceId) : undefined}
                />
              </div>
            );
          })}
        </div>
      </NexusChromePanel>
    </section>
  );
}
