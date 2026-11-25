import React, { useId } from 'react';
import type { AnimationLevel } from '../../types/app';
import { useNexusUi } from './NexusUiContext';

export interface NexusLogoSvgProps {
  readonly size?: 'compact' | 'hero';
  readonly glowEnabled?: boolean;
  readonly animationLevel?: AnimationLevel;
  readonly className?: string;
}

export function NexusLogoSvg({
  size = 'compact',
  glowEnabled,
  animationLevel,
  className = '',
}: NexusLogoSvgProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const ctx = useNexusUi();
  const activeGlow = (glowEnabled ?? ctx.glowEnabled) && (animationLevel ?? ctx.animationLevel) !== 'OFF';

  const dimensions = size === 'hero' ? 'h-14 w-24 sm:h-16 sm:w-28' : 'h-8 w-14';

  return (
    <svg
      viewBox="0 0 120 68"
      className={`${dimensions} shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`nx-chrome-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="45%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`nx-bronze-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B8863B" />
          <stop offset="50%" stopColor="#F5DEB3" />
          <stop offset="100%" stopColor="#B8863B" />
        </linearGradient>
        <linearGradient id={`nx-inf-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5DEB3" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id={`nx-glow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer octagonal chamfered chrome plate */}
      <polygon
        points="16,4 104,4 116,18 116,50 104,64 16,64 4,50 4,18"
        fill="#070E22"
        stroke={`url(#nx-chrome-${uid})`}
        strokeWidth="2.2"
      />
      {/* Inner champagne-bronze hairline */}
      <polygon
        points="20,9 100,9 110,20 110,48 100,59 20,59 10,48 10,20"
        fill="#040816"
        stroke={`url(#nx-bronze-${uid})`}
        strokeWidth="1.1"
        strokeOpacity="0.82"
      />

      {/* Side calibration notches matching V2 card frame */}
      <line x1="4" y1="34" x2="13" y2="34" stroke="#F5DEB3" strokeWidth="1.8" />
      <line x1="107" y1="34" x2="116" y2="34" stroke="#F5DEB3" strokeWidth="1.8" />

      {/* Luminous Infinity Emblem */}
      <path
        d="M 35,23 C 23,23 18,28 18,34 C 18,40 23,45 35,45 C 47,45 73,23 85,23 C 97,23 102,28 102,34 C 102,40 97,45 85,45 C 73,45 47,23 35,23 Z"
        fill="none"
        stroke={`url(#nx-inf-${uid})`}
        strokeWidth="5.4"
        strokeLinecap="round"
        filter={activeGlow ? `url(#nx-glow-${uid})` : undefined}
      />
      <path
        d="M 35,23 C 23,23 18,28 18,34 C 18,40 23,45 35,45 C 47,45 73,23 85,23 C 97,23 102,28 102,34 C 102,40 97,45 85,45 C 73,45 47,23 35,23 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
