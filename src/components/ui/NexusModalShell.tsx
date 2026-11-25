import React from 'react';
import { X } from 'lucide-react';
import type { AnimationLevel } from '../../types/app';
import { NexusChromePanel } from './NexusChromePanel';
import { useNexusUi } from './NexusUiContext';

export interface NexusModalShellProps {
  readonly open: boolean;
  readonly titleId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly eyebrow?: string;
  readonly tone?: 'chrome' | 'champagne' | 'cyan';
  readonly maxWidthClass?: string;
  readonly onClose?: () => void;
  readonly closeLabel?: string;
  readonly animationLevel?: AnimationLevel;
  readonly children: React.ReactNode;
}

export function NexusModalShell({
  open,
  titleId,
  title,
  subtitle,
  eyebrow,
  tone = 'chrome',
  maxWidthClass = 'max-w-lg',
  onClose,
  closeLabel = 'Fermer',
  animationLevel,
  children,
}: NexusModalShellProps): React.ReactElement | null {
  const ctx = useNexusUi();
  if (!open) return null;

  const activeAnim = animationLevel ?? ctx.animationLevel;
  const enterClass =
    activeAnim === 'FULL'
      ? 'nexus-screen-transition-full'
      : activeAnim === 'REDUCED'
        ? 'nexus-screen-transition-reduced'
        : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050E]/82 p-4 backdrop-blur-sm"
    >
      <div className={`w-full ${maxWidthClass} ${enterClass}`}>
        <NexusChromePanel
          tone={tone}
          chamfer="lg"
          innerClassName="max-h-[90vh] overflow-y-auto p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/90 pb-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="text-[11px] font-bold tracking-[0.18em] text-[#F5DEB3] uppercase">
                  {eyebrow}
                </div>
              ) : null}
              <h2
                id={titleId}
                className="mt-0.5 font-['Outfit'] text-xl font-extrabold tracking-tight text-white sm:text-2xl"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{subtitle}</p>
              ) : null}
            </div>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/90 text-slate-300 transition-colors hover:border-sky-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mt-5">{children}</div>
        </NexusChromePanel>
      </div>
    </div>
  );
}
