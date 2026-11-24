import React, { useId, useState } from 'react';
import { getArtworkAsset } from './artworkRegistry';
import { CARD_GEOMETRY } from './graphicsTypes';
import type { NexusCardSize } from './NexusCard';

const SIZE_WIDTH_CLASSES: Readonly<Record<NexusCardSize, string>> = {
  xs: 'w-[68px]',
  sm: 'w-[96px]',
  md: 'w-[148px]',
  lg: 'w-[210px]',
  xl: 'w-[280px]',
  fill: 'w-full',
};

export interface NexusCardBackProps {
  readonly size?: NexusCardSize;
  readonly glowEnabled?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export function NexusCardBack({
  size = 'md',
  glowEnabled = true,
  className = '',
  ariaLabel = 'Dos de carte officiel NEXUS',
}: NexusCardBackProps): React.ReactElement {
  const artwork = getArtworkAsset('CARD_BACK');
  const [imageError, setImageError] = useState(false);
  const backGradId = `nexus-back-frame-${useId().replace(/:/g, '')}`;
  const g = CARD_GEOMETRY;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-card-back="true"
      data-glow-enabled={String(glowEnabled)}
      style={{
        boxShadow: glowEnabled
          ? '0 12px 28px rgba(2, 6, 23, 0.78), 0 0 18px rgba(56, 189, 248, 0.36)'
          : '0 8px 18px rgba(2, 6, 23, 0.65)',
      }}
      className={[
        'relative inline-block aspect-[2/3] select-none overflow-hidden rounded-[4%] bg-[#030712]',
        SIZE_WIDTH_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="absolute inset-[1.8%] overflow-hidden rounded-[3.2%]"
        style={{ background: artwork.fallbackGradient }}
      >
        {!imageError ? (
          <img
            src={artwork.publicPath}
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-center"
          />
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${g.viewBoxWidth} ${g.viewBoxHeight}`}
        className="pointer-events-none relative z-10 block h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={backGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3D58D" />
            <stop offset="35%" stopColor="#38BDF8" />
            <stop offset="65%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#F3D58D" />
          </linearGradient>
        </defs>

        <rect
          x="4"
          y="4"
          width="1016"
          height="1528"
          rx="44"
          fill="none"
          stroke="#020617"
          strokeWidth="12"
        />

        <path
          d="M 68,22 L 956,22 L 1002,68 L 1002,330 L 972,366 L 972,1170 L 1002,1206 L 1002,1468 L 956,1514 L 68,1514 L 22,1468 L 22,1206 L 52,1170 L 52,366 L 22,330 L 22,68 Z"
          fill="none"
          stroke={`url(#${backGradId})`}
          strokeWidth="18"
        />

        <path
          d="M 80,38 L 944,38 L 986,80 L 986,322 L 956,358 L 956,1178 L 986,1214 L 986,1456 L 944,1498 L 80,1498 L 38,1456 L 38,1214 L 68,1178 L 68,358 L 38,322 L 38,80 Z"
          fill="none"
          stroke="#7DD3FC"
          strokeWidth="4"
          strokeOpacity="0.85"
        />

        {/* Symmetrical top & bottom NEXUS cartouches (no private info leaked) */}
        <polygon
          points="326,44 698,44 670,110 354,110"
          fill="#060B18"
          stroke={`url(#${backGradId})`}
          strokeWidth="6"
        />
        <text
          x="512"
          y="89"
          textAnchor="middle"
          fill="#F8FAFC"
          fontSize="36"
          fontWeight="800"
          letterSpacing="6"
          fontFamily="'Outfit', 'Rajdhani', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
        >
          NEXUS
        </text>

        <polygon
          points="354,1426 670,1426 698,1492 326,1492"
          fill="#060B18"
          stroke={`url(#${backGradId})`}
          strokeWidth="6"
        />
        <text
          x="512"
          y="1471"
          textAnchor="middle"
          fill="#F8FAFC"
          fontSize="36"
          fontWeight="800"
          letterSpacing="6"
          fontFamily="'Outfit', 'Rajdhani', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
        >
          NEXUS
        </text>
      </svg>
    </div>
  );
}
