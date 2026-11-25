import React from 'react';
import { useNexusUi } from './NexusUiContext';

export type NexusPanelTone = 'chrome' | 'champagne' | 'cyan' | 'neutral';

export interface NexusChromePanelProps {
  readonly tone?: NexusPanelTone;
  readonly chamfer?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly innerClassName?: string;
  readonly accentColor?: string;
  readonly children: React.ReactNode;
}

const FRAME_GRADIENTS: Readonly<Record<NexusPanelTone, string>> = {
  chrome: 'linear-gradient(135deg, rgba(226,232,240,0.48) 0%, rgba(100,116,139,0.28) 48%, rgba(212,166,86,0.42) 100%)',
  champagne: 'linear-gradient(135deg, rgba(245,222,179,0.68) 0%, rgba(184,134,59,0.34) 55%, rgba(226,232,240,0.38) 100%)',
  cyan: 'linear-gradient(135deg, rgba(56,189,248,0.72) 0%, rgba(148,163,184,0.32) 55%, rgba(245,222,179,0.48) 100%)',
  neutral: 'linear-gradient(135deg, rgba(148,163,184,0.32) 0%, rgba(51,65,85,0.28) 60%, rgba(148,163,184,0.22) 100%)',
};

export function NexusChromePanel({
  tone = 'chrome',
  chamfer = 'md',
  className = '',
  innerClassName = '',
  accentColor,
  children,
}: NexusChromePanelProps): React.ReactElement {
  const { glowEnabled, animationLevel } = useNexusUi();
  const chamferClass =
    chamfer === 'sm' ? 'nexus-chamfer-sm' : chamfer === 'lg' ? 'nexus-chamfer-lg' : 'nexus-chamfer-md';
  const showShadow = glowEnabled && animationLevel !== 'OFF';

  return (
    <div
      className={`relative p-[1px] ${chamferClass} ${className}`}
      style={{
        background: accentColor
          ? `linear-gradient(135deg, ${accentColor}99 0%, rgba(148,163,184,0.28) 55%, rgba(212,166,86,0.45) 100%)`
          : FRAME_GRADIENTS[tone],
        boxShadow: showShadow && tone === 'cyan'
          ? '0 0 28px rgba(56, 189, 248, 0.14)'
          : undefined,
      }}
    >
      <div
        className={`relative h-full w-full ${chamferClass} bg-[#060B1B]/92 backdrop-blur-md ${innerClassName}`}
      >
        {/* Subtle metallic top rim sheen */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-[1px] opacity-65"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(245,222,179,0.55) 50%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  );
}
