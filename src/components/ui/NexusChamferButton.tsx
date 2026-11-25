import React from 'react';
import type { AnimationLevel } from '../../types/app';
import { useNexusUi } from './NexusUiContext';

export type NexusButtonVariant = 'primary' | 'champagne' | 'secondary' | 'ghost' | 'danger';

export interface NexusChamferButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: NexusButtonVariant;
  readonly animationLevel?: AnimationLevel;
  readonly fullWidth?: boolean;
}

export function NexusChamferButton({
  variant = 'secondary',
  animationLevel,
  fullWidth = false,
  className = '',
  disabled = false,
  type = 'button',
  children,
  ...rest
}: NexusChamferButtonProps): React.ReactElement {
  const ctx = useNexusUi();
  const activeAnim = animationLevel ?? ctx.animationLevel;
  const isOff = activeAnim === 'OFF';

  const outerBevelStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          background: 'linear-gradient(135deg, #E0F2FE 0%, #38BDF8 45%, #F5DEB3 100%)',
        }
      : variant === 'champagne'
        ? {
            background: 'linear-gradient(135deg, #FEF3C7 0%, #D4A656 50%, #926724 100%)',
          }
        : variant === 'danger'
          ? {
              background: 'linear-gradient(135deg, #FDA4AF 0%, #F43F5E 60%, #9F1239 100%)',
            }
          : variant === 'secondary'
            ? {
                background:
                  'linear-gradient(135deg, rgba(226,232,240,0.55) 0%, rgba(71,85,105,0.45) 55%, rgba(212,166,86,0.45) 100%)',
              }
            : {
                background: 'rgba(148,163,184,0.28)',
              };

  const innerSurfaceClass =
    variant === 'primary'
      ? 'bg-gradient-to-r from-[#38BDF8] via-[#22D3EE] to-[#0EA5E9] text-slate-950 font-extrabold hover:brightness-110'
      : variant === 'champagne'
        ? 'bg-gradient-to-r from-[#F5DEB3] via-[#E6BE73] to-[#C9963B] text-slate-950 font-extrabold hover:brightness-110'
        : variant === 'danger'
          ? 'bg-gradient-to-r from-[#F43F5E] to-[#E11D48] text-white font-bold hover:brightness-110'
          : variant === 'secondary'
            ? 'bg-[#081024]/95 text-slate-100 font-semibold hover:bg-[#0D1834] hover:text-white'
            : 'bg-[#050A18]/85 text-slate-300 font-semibold hover:bg-[#0B142C] hover:text-white';

  const motionClass = isOff
    ? ''
    : 'transition-all duration-150 active:scale-[0.99] hover:-translate-y-[1px]';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`group relative inline-flex min-h-[44px] items-stretch p-[1px] nexus-chamfer-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-45 ${
        fullWidth ? 'w-full' : 'shrink-0'
      } ${motionClass} ${className}`}
      style={{
        ...outerBevelStyle,
        boxShadow:
          !isOff && variant === 'primary'
            ? '0 8px 24px rgba(14, 165, 233, 0.25)'
            : undefined,
      }}
      {...rest}
    >
      <span
        className={`flex w-full items-center justify-center gap-2.5 px-5 py-2.5 text-sm nexus-chamfer-sm ${innerSurfaceClass}`}
      >
        {children}
      </span>
    </button>
  );
}
