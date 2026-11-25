import React, { useLayoutEffect, useRef } from 'react';
import { NexusCard, NexusCardBack } from '../../graphics';
import type { AnimationLevel } from '../../types/app';
import type { CardFlightSpec } from './specialAnimationCatalog';

export interface ActiveCardFlight {
  readonly spec: CardFlightSpec;
  readonly capturedSourceRect: DOMRect | null;
}

export interface CardFlightLayerProps {
  readonly activeFlight: ActiveCardFlight | null;
  readonly humanPlayerId: string;
  readonly level: AnimationLevel;
  readonly glowEnabled: boolean;
}

function resolveAnchorRect(anchorName: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-flight-anchor="${anchorName}"]`);
  return el ? el.getBoundingClientRect() : null;
}

export function CardFlightLayer({
  activeFlight,
  humanPlayerId,
  level,
  glowEnabled,
}: CardFlightLayerProps): React.ReactElement | null {
  const cardWrapperRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = cardWrapperRef.current;
    if (!node || !activeFlight || level === 'OFF') return;

    const { spec, capturedSourceRect } = activeFlight;
    const isHumanSource = spec.sourcePlayerId === humanPlayerId;
    const isHumanTarget = spec.targetPlayerId === humanPlayerId;

    const fallbackSource =
      spec.kind === 'DRAW'
        ? resolveAnchorRect('draw-pile')
        : capturedSourceRect ??
          resolveAnchorRect(
            isHumanSource ? 'human-dock' : `player-${spec.sourcePlayerId ?? ''}`,
          );

    const targetRect =
      spec.kind === 'PLAY'
        ? resolveAnchorRect('discard-pile')
        : resolveAnchorRect(
            isHumanTarget ? 'human-dock' : `player-${spec.targetPlayerId ?? ''}`,
          );

    if (!fallbackSource || !targetRect) {
      node.style.opacity = '0';
      return;
    }

    const cardWidth = targetRect.width > 40 ? Math.min(targetRect.width, 132) : 96;
    const cardHeight = cardWidth * 1.5;

    const startX = fallbackSource.left + fallbackSource.width / 2 - cardWidth / 2;
    const startY = fallbackSource.top + fallbackSource.height / 2 - cardHeight / 2;
    const endX = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    const endY = targetRect.top + targetRect.height / 2 - cardHeight / 2;

    const dx = endX - startX;
    const midX = startX + dx * 0.52;
    const midY = Math.min(startY, endY) - (level === 'FULL' ? 42 : 12);
    const tiltDeg = level === 'FULL' ? (dx >= 0 ? 6 : -6) : 0;
    const startScale = fallbackSource.width > 0 ? Math.max(0.55, Math.min(1.05, fallbackSource.width / cardWidth)) : 0.9;
    const endScale = targetRect.width > 0 ? Math.max(0.5, Math.min(1.05, targetRect.width / cardWidth)) : 1;

    node.style.width = `${cardWidth}px`;

    const keyframes: Keyframe[] =
      level === 'FULL'
        ? [
            {
              opacity: 0.96,
              transform: `translate3d(${startX}px, ${startY}px, 0) scale(${startScale}) rotate(${-tiltDeg * 0.5}deg)`,
            },
            {
              opacity: 1,
              offset: 0.48,
              transform: `translate3d(${midX}px, ${midY}px, 0) scale(${Math.max(startScale, endScale) * 1.1}) rotate(${tiltDeg}deg)`,
            },
            {
              opacity: 1,
              transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale}) rotate(0deg)`,
            },
          ]
        : [
            {
              opacity: 0.92,
              transform: `translate3d(${startX}px, ${startY}px, 0) scale(${startScale})`,
            },
            {
              opacity: 1,
              transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale})`,
            },
          ];

    const anim = node.animate(keyframes, {
      duration: spec.durationMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    });

    return () => {
      anim.cancel();
    };
  }, [activeFlight, humanPlayerId, level]);

  if (!activeFlight || level === 'OFF') {
    return null;
  }

  return (
    <div
      data-testid="card-flight-layer"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={cardWrapperRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: '112px' }}
      >
        {activeFlight.spec.variantId === 'CARD_BACK' ? (
          <NexusCardBack size="fill" glowEnabled={glowEnabled} />
        ) : (
          <NexusCard
            variantId={activeFlight.spec.variantId}
            size="fill"
            glowEnabled={glowEnabled}
            playable={level === 'FULL'}
          />
        )}
      </div>
    </div>
  );
}
