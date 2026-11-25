import React from 'react';
import type { OpponentPublicView } from '../../engine/gameTypes';
import type { AnimationLevel } from '../../types/app';
import { NexusChromePanel } from '../ui';

export interface OpponentPlateProps {
  readonly opponent: OpponentPublicView;
  readonly isTurn: boolean;
  readonly animationLevel: AnimationLevel;
}

/**
 * Plaque adverse stricte (Cahier des charges §4) :
 * Identifie le joueur uniquement par :
 * 1. Son nom
 * 2. Son nombre de cartes
 * 3. Son indicateur de tour
 * Aucun avatar, portrait, badge de difficulté, badge NEXUS ou éventail de dos de cartes.
 */
export function OpponentPlate({
  opponent,
  isTurn,
  animationLevel,
}: OpponentPlateProps): React.ReactElement {
  const isOff = animationLevel === 'OFF';

  return (
    <div
      data-opponent-id={opponent.id}
      data-flight-anchor={`player-${opponent.id}`}
      data-active-turn={String(isTurn)}
      className={isOff ? '' : 'transition-transform duration-200'}
    >
      <NexusChromePanel
        tone={isTurn ? 'cyan' : 'neutral'}
        chamfer="sm"
        innerClassName={`flex flex-col items-start gap-1 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-2.5 ${
          isTurn ? 'bg-[#0A1734]/95' : 'bg-[#060C1D]/88'
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="truncate font-['Outfit'] text-xs font-bold tracking-wide text-white sm:text-sm">
            {opponent.name}
          </div>
          <div className="text-[11px] text-slate-300 tabular-nums sm:text-xs">
            {opponent.cardCount} {opponent.cardCount > 1 ? 'cartes' : 'carte'}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap sm:px-2 sm:py-1 sm:text-[11px] ${
              isTurn
                ? 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/60'
                : 'bg-slate-900/80 text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${
                isTurn ? 'bg-sky-300' : 'bg-slate-600'
              }`}
              aria-hidden="true"
            />
            <span>{isTurn ? 'Tour actif' : 'En attente'}</span>
          </span>
        </div>
      </NexusChromePanel>
    </div>
  );
}
