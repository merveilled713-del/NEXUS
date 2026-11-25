import React from 'react';
import { FAMILIES_BY_ID } from '../catalog/families';
import type { FamilyId, FamilySpecialCategory } from '../catalog/types';
import { ActiveSpecialChoreography } from '../components/table/specialAnimationCatalog';
import { FamilyEmblemGlyph, resolveCardVisualSpec } from '../graphics';
import type { AnimationLevel } from '../types/app';
import type { AnimationStep } from './animationTypes';

export interface FamilyEffectOverlayProps {
  readonly activeStep: AnimationStep | null;
  readonly specialChoreography?: ActiveSpecialChoreography | null;
  readonly targetPlayerName?: string | null;
  readonly level: AnimationLevel;
}

function renderFamilyPowerGeometry(
  family: FamilyId,
  power: FamilySpecialCategory,
  primary: string,
  secondary: string,
  accent: string,
  isReduced: boolean,
): React.ReactElement {
  const key = `${family}_${power}` as const;

  switch (key) {
    case 'AUBE_IMPULSION':
      return (
        <g className="nexus-special-vector" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="112" fill="none" stroke={primary} strokeWidth="2.5" strokeOpacity="0.65" />
          <polygon points="200,32 218,136 200,118 182,136" fill={accent} fillOpacity="0.92" />
          {!isReduced ? (
            <>
              <polygon points="122,74 176,144 156,148" fill={secondary} fillOpacity="0.82" />
              <polygon points="278,74 244,148 224,144" fill={secondary} fillOpacity="0.82" />
              <circle cx="200" cy="200" r="144" fill="none" stroke={secondary} strokeWidth="1.5" strokeDasharray="14 10" />
            </>
          ) : null}
        </g>
      );

    case 'AUBE_INVERSION':
      return (
        <g>
          <g className="nexus-anim-spin-cw" style={{ transformOrigin: '200px 200px' }}>
            <circle cx="200" cy="200" r="126" fill="none" stroke={primary} strokeWidth="3.5" strokeDasharray="34 14" />
            {[0, 90, 180, 270].map((deg) => (
              <polygon
                key={deg}
                points="200,56 212,78 188,78"
                fill={accent}
                transform={`rotate(${deg} 200 200)`}
              />
            ))}
          </g>
          {!isReduced ? (
            <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '200px 200px' }}>
              <circle cx="200" cy="200" r="94" fill="none" stroke={secondary} strokeWidth="2.5" strokeDasharray="20 12" />
            </g>
          ) : null}
        </g>
      );

    case 'AUBE_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <polygon
            points="200,54 314,109 342,232 263,332 137,332 58,232 86,109"
            fill={primary}
            fillOpacity="0.12"
            stroke={primary}
            strokeWidth="4"
          />
          <polygon
            points="200,82 292,126 314,224 250,304 150,304 86,224 108,126"
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
          {!isReduced ? (
            <circle cx="200" cy="200" r="56" fill="none" stroke={secondary} strokeWidth="2.5" strokeDasharray="8 8" />
          ) : null}
        </g>
      );

    case 'BRAISE_IMPULSION':
      return (
        <g>
          <g className="nexus-special-vector" style={{ transformOrigin: '200px 200px' }}>
            <polygon points="200,34 250,152 200,124 150,152" fill={primary} fillOpacity="0.72" stroke={accent} strokeWidth="2" />
            <circle cx="200" cy="200" r="106" fill="none" stroke={secondary} strokeWidth="3.5" />
          </g>
          {!isReduced ? (
            <g className="nexus-anim-ember" style={{ transformOrigin: '200px 200px' }}>
              {[78, 124, 168, 232, 276, 320].map((x, idx) => (
                <polygon
                  key={idx}
                  points={`${x},250 ${x + 6},264 ${x},278 ${x - 6},264`}
                  fill={idx % 2 === 0 ? primary : accent}
                />
              ))}
            </g>
          ) : null}
        </g>
      );

    case 'BRAISE_INVERSION':
      return (
        <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '200px 200px' }}>
          <path d="M 96,170 A 106,106 0 0,1 286,130" fill="none" stroke={primary} strokeWidth="6" strokeLinecap="round" />
          <polygon points="298,118 296,154 266,136" fill={accent} />
          <path d="M 304,230 A 106,106 0 0,1 114,270" fill="none" stroke={secondary} strokeWidth="6" strokeLinecap="round" />
          <polygon points="102,282 104,246 134,264" fill={primary} />
          {!isReduced ? (
            <circle cx="200" cy="200" r="138" fill="none" stroke={primary} strokeWidth="1.5" strokeDasharray="10 12" />
          ) : null}
        </g>
      );

    case 'BRAISE_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <path d="M 88,248 L 88,150 L 200,72 L 312,150 L 312,248 L 200,326 Z" fill={primary} fillOpacity="0.14" stroke={primary} strokeWidth="4.5" />
          <polyline points="122,162 200,108 278,162" fill="none" stroke={accent} strokeWidth="3.5" />
          <polyline points="122,238 200,292 278,238" fill="none" stroke={secondary} strokeWidth="3.5" />
        </g>
      );

    case 'ONDE_IMPULSION':
      return (
        <g className="nexus-special-vector" style={{ transformOrigin: '200px 200px' }}>
          <path d="M 52,216 Q 126,128 200,174 T 348,138" fill="none" stroke={accent} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 68,248 Q 134,166 200,206 T 332,174" fill="none" stroke={primary} strokeWidth="3.5" strokeLinecap="round" />
          {!isReduced ? (
            <path d="M 86,278 Q 144,204 200,238 T 314,210" fill="none" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" />
          ) : null}
        </g>
      );

    case 'ONDE_INVERSION':
      return (
        <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="118" fill="none" stroke={primary} strokeWidth="3" strokeDasharray="48 16" />
          <path d="M 96,200 C 128,136 168,136 200,200 C 232,264 272,264 304,200" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          {!isReduced ? (
            <path d="M 96,200 C 128,264 168,264 200,200 C 232,136 272,136 304,200" fill="none" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
          ) : null}
        </g>
      );

    case 'ONDE_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="134" fill="none" stroke={primary} strokeWidth="3.5" />
          <circle cx="200" cy="200" r="106" fill={primary} fillOpacity="0.1" stroke={secondary} strokeWidth="2.5" strokeDasharray="24 8" />
          {!isReduced ? (
            <circle cx="200" cy="200" r="78" fill="none" stroke={accent} strokeWidth="2" />
          ) : null}
        </g>
      );

    case 'OMBRE_IMPULSION':
      return (
        <g className="nexus-special-vector" style={{ transformOrigin: '200px 200px' }}>
          <path d="M 92,286 L 308,114" stroke={accent} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 226,104 A 96,96 0 1,0 226,296 A 70,82 0 1,1 226,104 Z" fill={primary} fillOpacity="0.34" stroke={secondary} strokeWidth="2.5" />
        </g>
      );

    case 'OMBRE_INVERSION':
      return (
        <g>
          <g className="nexus-anim-spin-ccw" style={{ transformOrigin: '200px 200px' }}>
            <path d="M 110,164 A 96,96 0 0,1 290,164" fill="none" stroke={primary} strokeWidth="5" strokeLinecap="round" />
            <path d="M 290,236 A 96,96 0 0,1 110,236" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          </g>
          {!isReduced ? (
            <g className="nexus-anim-spin-cw" style={{ transformOrigin: '200px 200px' }}>
              <circle cx="200" cy="200" r="128" fill="none" stroke={secondary} strokeWidth="2" strokeDasharray="18 14" />
            </g>
          ) : null}
        </g>
      );

    case 'OMBRE_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="126" fill={primary} fillOpacity="0.16" stroke={primary} strokeWidth="4" />
          <path d="M 218,116 A 84,84 0 1,0 218,284 A 62,72 0 1,1 218,116 Z" fill={primary} fillOpacity="0.42" stroke={accent} strokeWidth="2.2" />
        </g>
      );

    case 'ECLAIR_IMPULSION':
      return (
        <g className="nexus-anim-shock" style={{ transformOrigin: '200px 200px' }}>
          <polyline
            points="222,36 162,152 216,152 164,344 246,196 190,196"
            fill="none"
            stroke={accent}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {!isReduced ? (
            <>
              <polyline points="72,118 134,162 114,186 174,218" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round" />
              <polyline points="328,122 264,164 282,188 228,224" fill="none" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : null}
        </g>
      );

    case 'ECLAIR_INVERSION':
      return (
        <g className="nexus-anim-spin-cw" style={{ transformOrigin: '200px 200px' }}>
          <polyline points="104,138 158,86 242,86 296,138" fill="none" stroke={primary} strokeWidth="4" strokeLinejoin="round" />
          <polyline points="296,262 242,314 158,314 104,262" fill="none" stroke={accent} strokeWidth="4" strokeLinejoin="round" />
          <polygon points="308,148 282,146 296,120" fill={secondary} />
          <polygon points="92,252 118,254 104,280" fill={accent} />
        </g>
      );

    case 'ECLAIR_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <polygon points="200,56 322,128 322,272 200,344 78,272 78,128" fill={primary} fillOpacity="0.1" stroke={primary} strokeWidth="4" />
          <polyline points="104,146 200,92 296,146 296,254 200,308 104,254 104,146" fill="none" stroke={accent} strokeWidth="2.2" strokeDasharray="14 6" />
        </g>
      );

    case 'CRISTAL_IMPULSION':
      return (
        <g className="nexus-special-vector" style={{ transformOrigin: '200px 200px' }}>
          <polygon points="200,38 226,136 200,162 174,136" fill={primary} fillOpacity="0.55" stroke={accent} strokeWidth="2.5" />
          <polygon points="94,104 170,158 148,182 88,128" fill={secondary} fillOpacity="0.45" stroke={accent} strokeWidth="2" />
          <polygon points="306,104 252,182 230,158 312,128" fill={secondary} fillOpacity="0.45" stroke={accent} strokeWidth="2" />
        </g>
      );

    case 'CRISTAL_INVERSION':
      return (
        <g className="nexus-anim-spin-cw" style={{ transformOrigin: '200px 200px' }}>
          <polygon points="200,54 328,200 200,346 72,200" fill="none" stroke={primary} strokeWidth="3.5" />
          <polygon points="200,96 286,200 200,304 114,200" fill={primary} fillOpacity="0.16" stroke={accent} strokeWidth="2.5" />
          <line x1="200" y1="54" x2="200" y2="346" stroke={secondary} strokeWidth="2" />
          <line x1="72" y1="200" x2="328" y2="200" stroke={secondary} strokeWidth="2" />
        </g>
      );

    case 'CRISTAL_BOUCLIER':
      return (
        <g className="nexus-special-lock" style={{ transformOrigin: '200px 200px' }}>
          <polygon points="200,58 316,124 316,276 200,342 84,276 84,124" fill={primary} fillOpacity="0.14" stroke={primary} strokeWidth="4" />
          <polygon points="200,92 284,200 200,308 116,200" fill="none" stroke={accent} strokeWidth="2.5" />
          <line x1="84" y1="124" x2="316" y2="276" stroke={secondary} strokeWidth="1.6" strokeOpacity="0.7" />
          <line x1="316" y1="124" x2="84" y2="276" stroke={secondary} strokeWidth="1.6" strokeOpacity="0.7" />
        </g>
      );
  }
}

function renderSpecialScene(
  choreo: ActiveSpecialChoreography,
  targetPlayerName: string | null | undefined,
): React.ReactElement {
  const { signature, chosenFamily, level, penaltyCount } = choreo;
  const isReduced = level === 'REDUCED';
  const spec = resolveCardVisualSpec(signature.variantId);
  const chosenDef = chosenFamily ? FAMILIES_BY_ID[chosenFamily] : null;
  const accentColor =
    signature.id === 'UNIVERSAL_PORTAIL' && chosenDef
      ? chosenDef.primaryColor
      : signature.primaryColor;
  const secondaryColor =
    signature.id === 'UNIVERSAL_PORTAIL' && chosenDef
      ? chosenDef.secondaryColor
      : signature.secondaryColor;

  return (
    <div
      key={choreo.id}
      data-testid="animation-overlay"
      data-animation-kind={signature.id}
      data-animation-family={chosenFamily ?? signature.family ?? 'UNIVERSAL'}
      data-animation-level={level}
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4"
      style={{ '--nexus-dur': `${choreo.durationMs}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="nexus-special-stage relative flex flex-col items-center">
        {/* Scène SVG non obstruante autour du médaillon officiel */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 400 400"
            className="h-60 w-60 sm:h-80 sm:w-80"
            style={{ overflow: 'visible' }}
          >
            {signature.category === 'FAMILY_SPECIAL' && signature.family ? (
              renderFamilyPowerGeometry(
                signature.family,
                signature.power as FamilySpecialCategory,
                signature.primaryColor,
                signature.secondaryColor,
                signature.accentColor,
                isReduced,
              )
            ) : signature.id === 'UNIVERSAL_SURCHARGE' ? (
              <g className="nexus-anim-shock" style={{ transformOrigin: '200px 200px' }}>
                <circle cx="200" cy="200" r="136" fill="none" stroke="#F43F5E" strokeWidth="4" />
                <circle
                  cx="200"
                  cy="200"
                  r="98"
                  fill="none"
                  stroke="#F5DEB3"
                  strokeWidth="2.5"
                  strokeDasharray="16 8"
                />
                {/* 4 vecteurs énergétiques divergents */}
                <line x1="200" y1="34" x2="200" y2="112" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
                <line x1="200" y1="288" x2="200" y2="366" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" />
                <line x1="34" y1="200" x2="112" y2="200" stroke="#F43F5E" strokeWidth="5" strokeLinecap="round" />
                <line x1="288" y1="200" x2="366" y2="200" stroke="#34D399" strokeWidth="5" strokeLinecap="round" />
              </g>
            ) : (
              <g className="nexus-portal-gate" style={{ transformOrigin: '200px 200px' }}>
                <ellipse
                  cx="200"
                  cy="200"
                  rx="148"
                  ry="88"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3.5"
                  transform="rotate(-24 200 200)"
                />
                <ellipse
                  cx="200"
                  cy="200"
                  rx="148"
                  ry="88"
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth="3"
                  transform="rotate(24 200 200)"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="114"
                  fill="none"
                  stroke="#F5DEB3"
                  strokeWidth="2"
                  strokeDasharray="14 8"
                />
                <path
                  d="M 148,200 C 148,170 176,170 200,200 C 224,230 252,230 252,200 C 252,170 224,170 200,200 C 176,230 148,230 148,200 Z"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            )}
          </svg>

          {/* Médaillon central translucide mettant en valeur l'illustration et le symbole officiel */}
          <div
            className="absolute flex items-center gap-3 border bg-[#050A18]/88 px-3 py-2 shadow-2xl backdrop-blur-sm nexus-chamfer-sm"
            style={{ borderColor: accentColor }}
          >
            <img
              src={spec.artwork.publicPath}
              alt=""
              className="h-14 w-10 rounded-sm object-cover opacity-95 ring-1 ring-white/20"
            />
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                {signature.family || chosenFamily ? (
                  <svg viewBox="-46 -46 92 92" className="h-5 w-5 shrink-0">
                    <FamilyEmblemGlyph
                      family={(chosenFamily ?? signature.family)!}
                      color={accentColor}
                      accentColor={secondaryColor}
                    />
                  </svg>
                ) : null}
                <span className="font-['Outfit'] text-xs font-extrabold tracking-wide text-white uppercase sm:text-sm">
                  {signature.title}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-300">
                {signature.id === 'UNIVERSAL_PORTAIL' && chosenDef
                  ? `Nouvelle famille : ${chosenDef.displayName}`
                  : penaltyCount && targetPlayerName
                    ? `${targetPlayerName} : +${penaltyCount} cartes`
                    : signature.power === 'BOUCLIER' && targetPlayerName
                      ? `${targetPlayerName} bloqué`
                      : signature.power === 'INVERSION'
                        ? 'Sens de jeu inversé'
                        : spec.headerLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FamilyEffectOverlay({
  activeStep,
  specialChoreography,
  targetPlayerName,
  level,
}: FamilyEffectOverlayProps): React.ReactElement | null {
  if (level === 'OFF') {
    return null;
  }

  // Priorité aux 20 chorégraphies spéciales distinctives (18 familiales + 2 universelles)
  if (specialChoreography) {
    return renderSpecialScene(specialChoreography, targetPlayerName);
  }

  // Sobriété des cartes numériques (0 à 9) et non-duplication avec les 20 chorégraphies spéciales
  if (
    !activeStep ||
    activeStep.kind === 'CARD_PLAY_FAMILY' ||
    activeStep.kind === 'CARD_DRAW' ||
    activeStep.kind === 'IMPULSION_STRIKE' ||
    activeStep.kind === 'SURCHARGE_OVERLOAD' ||
    activeStep.kind === 'INVERSION_LOOP' ||
    activeStep.kind === 'BOUCLIER_LOCK' ||
    activeStep.kind === 'PORTAL_RESONANCE'
  ) {
    return null;
  }

  // Événements système discrets (Distribution, Déclaration NEXUS, Pénalité NEXUS, Fin de partie)
  const isReduced = level === 'REDUCED';
  const ringColor =
    activeStep.kind === 'NEXUS_PENALTY'
      ? '#F43F5E'
      : activeStep.kind === 'VICTORY_PULSE'
        ? '#10B981'
        : activeStep.kind === 'NEXUS_CALL'
          ? '#F5DEB3'
          : '#38BDF8';

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
        <svg viewBox="0 0 320 320" className="h-44 w-44 sm:h-56 sm:w-56" style={{ overflow: 'visible' }}>
          {activeStep.kind === 'DEAL_HAND' ? (
            <g className="nexus-anim-deal" style={{ transformOrigin: '160px 160px' }}>
              {(isReduced ? [0] : [-26, 0, 26]).map((offset, idx) => (
                <rect
                  key={idx}
                  x={136 + offset}
                  y={116 + Math.abs(offset) * 0.2}
                  width="48"
                  height="72"
                  rx="6"
                  fill="#070E22"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  transform={`rotate(${offset * 0.45} 160 160)`}
                />
              ))}
            </g>
          ) : (
            <g className="nexus-anim-burst" style={{ transformOrigin: '160px 160px' }}>
              <circle cx="160" cy="160" r="84" fill="none" stroke={ringColor} strokeWidth="3.5" />
              <circle cx="160" cy="160" r="56" fill="none" stroke="#F5DEB3" strokeWidth="1.5" strokeDasharray="10 8" />
            </g>
          )}
        </svg>
        <div className="nexus-anim-label -mt-4 border border-slate-700/80 bg-[#050A18]/92 px-3.5 py-1 text-xs font-bold tracking-wide text-slate-100 shadow-lg nexus-chamfer-sm">
          {activeStep.label}
        </div>
      </div>
    </div>
  );
}
