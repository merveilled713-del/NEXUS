import React from 'react';
import type { AnimationLevel, TableThemeId } from '../../types/app';
import { useNexusUi } from './NexusUiContext';

export interface NexusBackdropProps {
  readonly tableTheme?: TableThemeId;
  readonly glowEnabled?: boolean;
  readonly animationLevel?: AnimationLevel;
  readonly variant?: 'hero' | 'shell' | 'table';
}

const THEME_PALETTES: Readonly<
  Record<
    TableThemeId,
    {
      readonly base: string;
      readonly primaryGlow: string;
      readonly secondaryGlow: string;
      readonly ringStroke: string;
      readonly accentStroke: string;
    }
  >
> = {
  VOID_STELLAR: {
    base: '#030612',
    primaryGlow: '#0EA5E9',
    secondaryGlow: '#312E81',
    ringStroke: '#38BDF8',
    accentStroke: '#D4A656',
  },
  SOLAR_FORGE: {
    base: '#0E0705',
    primaryGlow: '#F59E0B',
    secondaryGlow: '#7C2D12',
    ringStroke: '#FBBF24',
    accentStroke: '#E2E8F0',
  },
  QUANTUM_ABYSS: {
    base: '#031013',
    primaryGlow: '#10B981',
    secondaryGlow: '#164E63',
    ringStroke: '#34D399',
    accentStroke: '#D4A656',
  },
};

export function NexusBackdrop({
  tableTheme,
  glowEnabled,
  animationLevel,
  variant = 'shell',
}: NexusBackdropProps): React.ReactElement {
  const ctx = useNexusUi();
  const activeTheme = tableTheme ?? ctx.tableTheme;
  const activeGlow = glowEnabled ?? ctx.glowEnabled;
  const activeAnim = animationLevel ?? ctx.animationLevel;

  const palette = THEME_PALETTES[activeTheme];
  const isOff = activeAnim === 'OFF';
  const showNebula = activeGlow && !isOff;
  const orbitCenter = variant === 'hero' ? { cx: 1020, cy: 430 } : { cx: 720, cy: 360 };

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ backgroundColor: palette.base }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 900"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient
            id={`nexus-bg-nebula-a-${variant}-${activeTheme}`}
            cx={variant === 'hero' ? '72%' : '50%'}
            cy={variant === 'hero' ? '46%' : '26%'}
            r="58%"
          >
            <stop
              offset="0%"
              stopColor={palette.primaryGlow}
              stopOpacity={showNebula ? 0.22 : 0.06}
            />
            <stop
              offset="48%"
              stopColor={palette.secondaryGlow}
              stopOpacity={showNebula ? 0.2 : 0.08}
            />
            <stop offset="100%" stopColor={palette.base} stopOpacity="0" />
          </radialGradient>

          <radialGradient
            id={`nexus-bg-nebula-b-${variant}-${activeTheme}`}
            cx="18%"
            cy="78%"
            r="46%"
          >
            <stop
              offset="0%"
              stopColor={palette.accentStroke}
              stopOpacity={showNebula ? 0.09 : 0.02}
            />
            <stop offset="100%" stopColor={palette.base} stopOpacity="0" />
          </radialGradient>

          <pattern
            id={`nexus-bg-grid-${variant}`}
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 72 0 L 0 0 0 72"
              fill="none"
              stroke="#94A3B8"
              strokeOpacity="0.035"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>

        <rect width="1440" height="900" fill={palette.base} />
        <rect width="1440" height="900" fill={`url(#nexus-bg-grid-${variant})`} />
        <rect
          width="1440"
          height="900"
          fill={`url(#nexus-bg-nebula-a-${variant}-${activeTheme})`}
        />
        <rect
          width="1440"
          height="900"
          fill={`url(#nexus-bg-nebula-b-${variant}-${activeTheme})`}
        />

        {/* Orbital structural rings inspired by NEXUS V2 dais */}
        <g
          className={activeAnim === 'FULL' ? 'nexus-orbit-slow' : undefined}
          style={{ transformOrigin: `${orbitCenter.cx}px ${orbitCenter.cy}px` }}
        >
          <circle
            cx={orbitCenter.cx}
            cy={orbitCenter.cy}
            r={variant === 'hero' ? 395 : 470}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeOpacity="0.38"
          />
          <circle
            cx={orbitCenter.cx}
            cy={orbitCenter.cy}
            r={variant === 'hero' ? 310 : 350}
            fill="none"
            stroke={palette.ringStroke}
            strokeWidth="1"
            strokeOpacity={isOff ? 0.14 : 0.24}
            strokeDasharray="14 16"
          />
          <circle
            cx={orbitCenter.cx}
            cy={orbitCenter.cy}
            r={variant === 'hero' ? 220 : 230}
            fill="none"
            stroke={palette.accentStroke}
            strokeWidth="0.9"
            strokeOpacity={isOff ? 0.12 : 0.22}
          />
        </g>

        {/* Subtle metallic horizon notches */}
        <line
          x1="0"
          y1="88"
          x2="1440"
          y2="88"
          stroke="#475569"
          strokeWidth="0.75"
          strokeOpacity="0.22"
        />
      </svg>
    </div>
  );
}
