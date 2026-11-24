import React from 'react';
import type { FamilyId } from '../catalog/types';
import type { AnimationLevel } from '../types/app';
import type { AnimationStep, FamilyAnimationVisualSpec } from './animationTypes';

export interface FamilyEffectOverlayProps {
  readonly activeStep: AnimationStep | null;
  readonly level: AnimationLevel;
}

/**
 * NEXUS — 6 animations familiales dessinées par le code + effets spéciaux (Étape 5).
 * Strictement pointer-events: none. Retourne null quand level === 'OFF' ou sans animation active.
 */
function renderFamilyPatternSvg(
  family: FamilyId,
  spec: FamilyAnimationVisualSpec,
  isReduced: boolean,
): React.ReactElement {
  const particleCount = isReduced ? spec.particleCountReduced : spec.particleCountFull;
  const rays = Array.from({ length: particleCount }, (_, i) => i);

  switch (family) {
    case 'AUBE':
      // Rayons solaires radiaux + double anneau doré
      return (
        <g className="nexus-anim-burst" style={{ transformOrigin: '160px 160px' }}>
          <circle
            cx="160"
            cy="160"
            r="68"
            fill="none"
            stroke={spec.primaryColor}
            strokeWidth="3.5"
            strokeOpacity="0.85"
          />
          {!isReduced ? (
            <circle
              cx="160"
              cy="160"
              r="104"
              fill="none"
              stroke={spec.secondaryColor}
              strokeWidth="2"
              strokeDasharray="10 8"
              strokeOpacity="0.7"
            />
          ) : null}
          {rays.map((i) => {
            const angle = (i * 360) / particleCount;
            return (
              <g key={i} transform={`rotate(${angle} 160 160)`}>
                <line
                  x1="160"
                  y1="38"
                  x2="160"
                  y2="84"
                  stroke={i % 2 === 0 ? spec.primaryColor : spec.accentColor}
                  strokeWidth={i % 2 === 0 ? '4' : '2.2'}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>
      );

    case 'BRAISE':
      // Braises ascendantes + anneau thermique ardent
      return (
        <g>
          <g className="nexus-anim-shock" style={{ transformOrigin: '160px 160px' }}>
            <circle
              cx="160"
              cy="160"
              r="76"
              fill="none"
              stroke={spec.primaryColor}
              strokeWidth="5"
              strokeOpacity="0.88"
            />
            <polygon
              points="160,64 236,214 84,214"
              fill="none"
              stroke={spec.secondaryColor}
              strokeWidth="2.5"
              strokeOpacity="0.72"
            />
          </g>
          <g className="nexus-anim-ember" style={{ transformOrigin: '160px 160px' }}>
            {rays.map((i) => {
              const x = 68 + ((i * 37) % 184);
              const y = 78 + ((i * 53) % 148);
              const r = i % 3 === 0 ? 5.5 : 3.2;
              return (
                <polygon
                  key={i}
                  points={`${x},${y - r * 1.8} ${x + r},${y} ${x},${y + r * 1.4} ${x - r},${y}`}
                  fill={i % 2 === 0 ? spec.primaryColor : spec.accentColor}
                />
              );
            })}
          </g>
        </g>
      );

    case 'ONDE':
      // Ondes harmoniques concentriques fluides
      return (
        <g className="nexus-anim-burst" style={{ transformOrigin: '160px 160px' }}>
          {Array.from(
            { length: isReduced ? spec.ringCountReduced : spec.ringCountFull },
            (_, ring) => (
              <circle
                key={ring}
                cx="160"
                cy="160"
                r={46 + ring * 26}
                fill="none"
                stroke={ring % 2 === 0 ? spec.primaryColor : spec.secondaryColor}
                strokeWidth={4 - ring * 0.6}
                strokeOpacity={0.92 - ring * 0.16}
              />
            ),
          )}
          <path
            d="M 42,160 Q 100,118 160,160 T 278,160"
            fill="none"
            stroke={spec.accentColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {!isReduced ? (
            <path
              d="M 52,182 Q 106,144 160,182 T 268,182"
              fill="none"
              stroke={spec.primaryColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.8"
            />
          ) : null}
        </g>
      );

    case 'OMBRE':
      // Vortex gravitationnel en rotation + croissant d'éclipse
      return (
        <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '160px 160px' }}>
          <circle
            cx="160"
            cy="160"
            r="96"
            fill="none"
            stroke={spec.primaryColor}
            strokeWidth="3.5"
            strokeDasharray="28 14"
            strokeOpacity="0.85"
          />
          <circle
            cx="160"
            cy="160"
            r="64"
            fill="none"
            stroke={spec.secondaryColor}
            strokeWidth="3"
            strokeDasharray="16 10"
          />
          <path
            d="M 176,104 A 58,58 0 1,0 176,216 A 42,48 0 1,1 176,104 Z"
            fill={spec.primaryColor}
            fillOpacity="0.48"
            stroke={spec.accentColor}
            strokeWidth="2"
          />
        </g>
      );

    case 'ECLAIR':
      // Arcs électriques haute tension ramifiés
      return (
        <g className="nexus-anim-shock" style={{ transformOrigin: '160px 160px' }}>
          <circle
            cx="160"
            cy="160"
            r="84"
            fill="none"
            stroke={spec.primaryColor}
            strokeWidth="2.5"
            strokeOpacity="0.7"
          />
          <polyline
            points="174,40 132,126 172,126 138,278 192,164 150,164"
            fill="none"
            stroke={spec.accentColor}
            strokeWidth="4.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {!isReduced ? (
            <>
              <polyline
                points="66,96 116,134 98,154 146,184"
                fill="none"
                stroke={spec.primaryColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <polyline
                points="254,104 206,138 224,158 182,194"
                fill="none"
                stroke={spec.secondaryColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          ) : null}
        </g>
      );

    case 'CRISTAL':
      // Facettes géométriques d'octaèdre rotatives
      return (
        <g className="nexus-anim-spin-cw" style={{ transformOrigin: '160px 160px' }}>
          <polygon
            points="160,44 252,160 160,276 68,160"
            fill="none"
            stroke={spec.primaryColor}
            strokeWidth="4"
          />
          <polygon
            points="160,78 220,160 160,242 100,160"
            fill={spec.primaryColor}
            fillOpacity="0.18"
            stroke={spec.accentColor}
            strokeWidth="2.5"
          />
          <line x1="160" y1="44" x2="160" y2="276" stroke={spec.secondaryColor} strokeWidth="2" />
          <line x1="68" y1="160" x2="252" y2="160" stroke={spec.secondaryColor} strokeWidth="2" />
        </g>
      );
  }
}

function renderEffectGeometry(
  step: AnimationStep,
  isReduced: boolean,
): React.ReactElement {
  if (step.kind === 'CARD_PLAY_FAMILY' && step.family && step.familyVisual) {
    return renderFamilyPatternSvg(step.family, step.familyVisual, isReduced);
  }

  switch (step.kind) {
    case 'DEAL_HAND':
      return (
        <g className="nexus-anim-deal" style={{ transformOrigin: '160px 160px' }}>
          {[-28, 0, 28].map((offset, idx) => (
            <rect
              key={idx}
              x={134 + offset}
              y={114 + Math.abs(offset) * 0.2}
              width="52"
              height="78"
              rx="6"
              fill="#0B132B"
              stroke="#38BDF8"
              strokeWidth="2.5"
              transform={`rotate(${offset * 0.45} 160 160)`}
            />
          ))}
        </g>
      );

    case 'CARD_DRAW':
      return (
        <g className="nexus-anim-burst" style={{ transformOrigin: '160px 160px' }}>
          <rect
            x="130"
            y="112"
            width="60"
            height="90"
            rx="7"
            fill="none"
            stroke="#7DD3FC"
            strokeWidth="3"
          />
          <path
            d="M 160,136 L 160,184 M 142,166 L 160,186 L 178,166"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'IMPULSION_STRIKE':
    case 'SURCHARGE_OVERLOAD': {
      const isSurcharge = step.kind === 'SURCHARGE_OVERLOAD';
      const stroke = isSurcharge ? '#F43F5E' : '#FB923C';
      return (
        <g className="nexus-anim-shock" style={{ transformOrigin: '160px 160px' }}>
          <circle cx="160" cy="160" r="88" fill="none" stroke={stroke} strokeWidth="5" />
          <circle
            cx="160"
            cy="160"
            r="56"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="3"
            strokeDasharray="12 6"
          />
          <text
            x="160"
            y="174"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="44"
            fontWeight="800"
            fontFamily="'Outfit', sans-serif"
          >
            {isSurcharge ? '+4' : '+2'}
          </text>
        </g>
      );
    }

    case 'INVERSION_LOOP':
      return (
        <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '160px 160px' }}>
          <path
            d="M 92,140 A 72,72 0 0,1 224,124"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <polygon points="234,112 232,146 204,130" fill="#38BDF8" />
          <path
            d="M 228,180 A 72,72 0 0,1 96,196"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <polygon points="86,208 88,174 116,190" fill="#F59E0B" />
        </g>
      );

    case 'BOUCLIER_LOCK':
      return (
        <g className="nexus-anim-shock" style={{ transformOrigin: '160px 160px' }}>
          <polygon
            points="160,58 242,102 242,202 160,262 78,202 78,102"
            fill="#0EA5E9"
            fillOpacity="0.16"
            stroke="#38BDF8"
            strokeWidth="4.5"
          />
          <rect x="136" y="148" width="48" height="38" rx="6" fill="#E0F2FE" />
          <path
            d="M 144,148 L 144,132 A 16,16 0 0,1 176,132 L 176,148"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="6.5"
          />
        </g>
      );

    case 'PORTAL_RESONANCE': {
      const color = step.familyVisual?.primaryColor ?? '#38BDF8';
      const secondary = step.familyVisual?.secondaryColor ?? '#F3D58D';
      return (
        <g className="nexus-anim-spin-cw" style={{ transformOrigin: '160px 160px' }}>
          <circle cx="160" cy="160" r="108" fill="none" stroke={color} strokeWidth="4" />
          <circle
            cx="160"
            cy="160"
            r="74"
            fill="none"
            stroke={secondary}
            strokeWidth="3.5"
            strokeDasharray="14 8"
          />
          <path
            d="M 118,160 C 118,136 142,136 160,160 C 178,184 202,184 202,160 C 202,136 178,136 160,160 C 142,184 118,184 118,160 Z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      );
    }

    case 'NEXUS_CALL':
    case 'NEXUS_PENALTY':
    case 'VICTORY_PULSE': {
      const ringColor =
        step.kind === 'NEXUS_PENALTY'
          ? '#EF4444'
          : step.kind === 'VICTORY_PULSE'
            ? '#10B981'
            : '#F59E0B';
      return (
        <g className="nexus-anim-burst" style={{ transformOrigin: '160px 160px' }}>
          <circle cx="160" cy="160" r="96" fill="none" stroke={ringColor} strokeWidth="4.5" />
          <polygon
            points="160,72 182,138 248,160 182,182 160,248 138,182 72,160 138,138"
            fill={ringColor}
            fillOpacity="0.24"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
        </g>
      );
    }

    default:
      return <g />;
  }
}

export function FamilyEffectOverlay({
  activeStep,
  level,
}: FamilyEffectOverlayProps): React.ReactElement | null {
  if (level === 'OFF' || activeStep === null) {
    return null;
  }

  const isReduced = level === 'REDUCED';

  return (
    <div
      key={activeStep.id}
      data-testid="animation-overlay"
      data-animation-kind={activeStep.kind}
      data-animation-family={activeStep.family ?? 'NONE'}
      data-animation-level={level}
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
      style={{ '--nexus-dur': `${activeStep.durationMs}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="relative flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 320 320"
          className="h-56 w-56 sm:h-72 sm:w-72"
          style={{ overflow: 'visible' }}
        >
          {renderEffectGeometry(activeStep, isReduced)}
        </svg>
        <div className="nexus-anim-label -mt-6 rounded-md border border-slate-700/80 bg-[#050A18]/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-100 shadow-lg">
          {activeStep.label}
        </div>
      </div>
    </div>
  );
}
