import React, { useMemo, useState } from 'react';
import type { CardVariantId } from '../catalog/types';
import { resolveCardVisualSpec } from './cardSpecResolver';
import { CardFrameSvg } from './CardFrameSvg';
import type { CardRenderOptions } from './graphicsTypes';

export type NexusCardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fill';

const SIZE_WIDTH_CLASSES: Readonly<Record<NexusCardSize, string>> = {
  xs: 'w-[68px]',
  sm: 'w-[96px]',
  md: 'w-[148px]',
  lg: 'w-[210px]',
  xl: 'w-[280px]',
  fill: 'w-full',
};

export interface NexusCardProps extends CardRenderOptions {
  readonly variantId: CardVariantId;
  readonly size?: NexusCardSize;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
}

export function NexusCard({
  variantId,
  size = 'md',
  glowEnabled = true,
  playable = false,
  selected = false,
  dimmed = false,
  interactive = false,
  onClick,
  ariaLabel,
  className = '',
}: NexusCardProps): React.ReactElement {
  const spec = useMemo(() => resolveCardVisualSpec(variantId), [variantId]);
  const [imageError, setImageError] = useState(false);

  const uid = `${spec.variantId}-${glowEnabled ? 'glow' : 'flat'}`;
  const isActionable = Boolean(onClick) || interactive;

  const computedLabel =
    ariaLabel ??
    `${spec.theme.displayName} — ${spec.headerLabel} (${spec.topLeftInsert.label})`;

  const frameBoxShadow =
    selected
      ? `0 0 0 3px ${spec.theme.accentHighlight}, 0 12px 24px rgba(2, 6, 23, 0.82)`
      : playable && glowEnabled
        ? `0 0 0 2px ${spec.theme.primaryColor}, 0 10px 22px rgba(2, 6, 23, 0.78)`
        : '0 8px 18px rgba(2, 6, 23, 0.72)';

  const containerClasses = [
    'relative inline-block aspect-[2/3] select-none overflow-hidden rounded-[4%] bg-[#030712] text-left transition-transform duration-150',
    SIZE_WIDTH_CLASSES[size],
    isActionable
      ? 'cursor-pointer hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300'
      : '',
    selected ? '-translate-y-2.5' : '',
    dimmed ? 'opacity-50 saturate-75' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const innerContent = (
    <>
      <div
        className="absolute inset-[1.8%] overflow-hidden rounded-[3.2%]"
        style={{ background: spec.artwork.fallbackGradient }}
      >
        {!imageError ? (
          <img
            src={spec.artwork.publicPath}
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-center"
          />
        ) : null}

        {/* Measured top & bottom scrims preserving 5-zone legibility on bright artworks */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[24%]"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%]"
          style={{
            background:
              'linear-gradient(0deg, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0) 100%)',
          }}
        />
      </div>

      <CardFrameSvg
        spec={spec}
        glowEnabled={glowEnabled}
        uid={uid}
        className="pointer-events-none relative z-10 block h-full w-full"
      />
    </>
  );

  const sharedDataAttrs = {
    'data-variant-id': spec.variantId,
    'data-card-kind': spec.kind,
    'data-family': spec.family ?? 'UNIVERSAL',
    'data-header-label': spec.headerLabel,
    'data-corner-top-left': spec.topLeftInsert.contentKey,
    'data-corner-bottom-left': spec.bottomLeftInsert.contentKey,
    'data-corner-orientation': String(spec.topLeftInsert.orientationDeg),
    'data-glow-enabled': String(glowEnabled),
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={computedLabel}
        style={{ boxShadow: frameBoxShadow }}
        className={containerClasses}
        {...sharedDataAttrs}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div
      role="img"
      aria-label={computedLabel}
      style={{ boxShadow: frameBoxShadow }}
      className={containerClasses}
      {...sharedDataAttrs}
    >
      {innerContent}
    </div>
  );
}
