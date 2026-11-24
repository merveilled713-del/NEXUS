import React from 'react';
import type {
  BottomRightMedallion,
  FamilyId,
  SpecialCornerSymbol,
  TopRightMedallion,
} from '../catalog/types';

export interface EmblemRenderProps {
  readonly color?: string;
  readonly accentColor?: string;
  readonly glowEnabled?: boolean;
}

/**
 * Pure vector family emblems centered at (0, 0) in a [-42, 42] local box.
 * Geometries are strictly distinct two-by-two even without color or glow.
 */
export function FamilyEmblemGlyph({
  family,
  color = '#FFFFFF',
  accentColor = '#93C5FD',
}: {
  readonly family: FamilyId;
  readonly color?: string;
  readonly accentColor?: string;
}): React.ReactElement {
  switch (family) {
    case 'AUBE':
      // 8-point radial solar star
      return (
        <g>
          <polygon
            points="0,-38 7,-12 27,-27 12,-7 38,0 12,7 27,27 7,12 0,38 -7,12 -27,27 -12,7 -38,0 -12,-7 -27,-27 -7,-12"
            fill={color}
          />
          <circle cx="0" cy="0" r="10" fill="#050914" stroke={accentColor} strokeWidth="3.5" />
          <circle cx="0" cy="0" r="4.5" fill={accentColor} />
        </g>
      );

    case 'BRAISE':
      // Triple geometric flame blades
      return (
        <g>
          <path
            d="M 0,-38 C 12,-20 18,-6 14,12 C 12,24 6,32 0,35 C -6,32 -12,24 -14,12 C -18,-6 -12,-20 0,-38 Z"
            fill={color}
          />
          <path
            d="M -22,-8 C -28,6 -27,22 -13,32 C -18,20 -18,8 -13,-4 Z"
            fill={accentColor}
          />
          <path
            d="M 22,-8 C 28,6 27,22 13,32 C 18,20 18,8 13,-4 Z"
            fill={accentColor}
          />
          <path
            d="M 0,-11 C 5,-1 7,10 0,21 C -7,10 -5,-1 0,-11 Z"
            fill="#050914"
          />
        </g>
      );

    case 'ONDE':
      // Triple stacked sinusoidal harmonic waves
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M -32,-16 Q -16,-30 0,-16 T 32,-16"
            stroke={color}
            strokeWidth="7.5"
          />
          <path
            d="M -34,0 Q -17,-14 0,0 T 34,0"
            stroke={accentColor}
            strokeWidth="7.5"
          />
          <path
            d="M -32,16 Q -16,2 0,16 T 32,16"
            stroke={color}
            strokeWidth="7.5"
          />
        </g>
      );

    case 'OMBRE':
      // Eclipsed gravitational crescent + corona ring
      return (
        <g>
          <circle
            cx="0"
            cy="0"
            r="34"
            fill="none"
            stroke={accentColor}
            strokeWidth="3.5"
            strokeDasharray="10 7"
          />
          <path
            d="M 10,-28 A 28,28 0 1,0 10,28 A 20,24 0 1,1 10,-28 Z"
            fill={color}
          />
          <circle cx="13" cy="0" r="6" fill={accentColor} />
        </g>
      );

    case 'ECLAIR':
      // Triple high-voltage bolt conduit
      return (
        <g>
          <polygon
            points="6,-38 -16,-2 -2,-2 -10,38 18,-4 3,-4"
            fill={color}
          />
          <polyline
            points="-26,-16 -34,-2 -24,-2 -29,14"
            fill="none"
            stroke={accentColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="27,-14 21,2 31,2 25,18"
            fill="none"
            stroke={accentColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'CRISTAL':
      // Faceted geometric octahedron prism
      return (
        <g>
          <polygon
            points="0,-38 30,0 0,38 -30,0"
            fill="none"
            stroke={color}
            strokeWidth="6.5"
            strokeLinejoin="miter"
          />
          <polygon
            points="0,-24 16,0 0,24 -16,0"
            fill={accentColor}
            fillOpacity="0.3"
            stroke={accentColor}
            strokeWidth="3.5"
          />
          <line x1="0" y1="-38" x2="0" y2="38" stroke={color} strokeWidth="3.5" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke={color} strokeWidth="3.5" />
        </g>
      );
  }
}

export function NexusStarGlyph({
  color = '#FFFFFF',
  accentColor = '#C4B5FD',
}: EmblemRenderProps): React.ReactElement {
  return (
    <g>
      <polygon
        points="0,-38 9,-9 38,0 9,9 0,38 -9,9 -38,0 -9,-9"
        fill={color}
      />
      <polygon
        points="0,-18 4,-4 18,0 4,4 0,18 -4,4 -18,0 -4,-4"
        fill={accentColor}
      />
      <circle cx="0" cy="0" r="4.5" fill="#050914" />
    </g>
  );
}

/**
 * Distinct compact family pip inside FAMILY_MARKER bottom-right medallion (numeric cards only).
 * Never resembles the LOOP double-arrow icon.
 */
function FamilyMarkerGlyph({
  family,
  color = '#FFFFFF',
  accentColor = '#93C5FD',
}: {
  readonly family: FamilyId;
  readonly color?: string;
  readonly accentColor?: string;
}): React.ReactElement {
  return (
    <g>
      <path
        d="M -30,-16 L -34,0 L -30,16 M 30,-16 L 34,0 L 30,16"
        fill="none"
        stroke={accentColor}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="scale(0.68)">
        <FamilyEmblemGlyph family={family} color={color} accentColor={accentColor} />
      </g>
    </g>
  );
}

export function SpecialCornerSymbolGlyph({
  symbol,
  color = '#FFFFFF',
  accentColor = '#7DD3FC',
}: {
  readonly symbol: Extract<SpecialCornerSymbol, 'LOOP' | 'LOCK' | 'INFINITY'>;
  readonly color?: string;
  readonly accentColor?: string;
}): React.ReactElement {
  switch (symbol) {
    case 'LOOP':
      return (
        <g>
          <path
            d="M -26,-8 A 28,28 0 0,1 22,-18"
            fill="none"
            stroke={color}
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <polygon points="28,-25 27,-4 9,-16" fill={color} />
          <path
            d="M 26,8 A 28,28 0 0,1 -22,18"
            fill="none"
            stroke={color}
            strokeWidth="9.5"
            strokeLinecap="round"
          />
          <polygon points="-28,25 -27,4 -9,16" fill={color} />
        </g>
      );

    case 'LOCK':
      return (
        <g>
          <path
            d="M -16,-6 L -16,-18 A 16,16 0 0,1 16,-18 L 16,-6"
            fill="none"
            stroke={color}
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <rect
            x="-24"
            y="-6"
            width="48"
            height="36"
            rx="6"
            fill={color}
          />
          <circle cx="0" cy="9" r="5.5" fill="#050914" />
          <rect x="-2.5" y="12" width="5" height="10" rx="2" fill="#050914" />
          <path
            d="M -32,12 L -32,-20 L 0,-34 L 32,-20 L 32,12"
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeOpacity="0.65"
          />
        </g>
      );

    case 'INFINITY':
      return (
        <g>
          <path
            d="M -18,-15 C -32,-15 -38,-7 -38,0 C -38,7 -32,15 -18,15 C -6,15 6,-15 18,-15 C 32,-15 38,-7 38,0 C 38,7 32,15 18,15 C 6,15 -6,-15 -18,-15 Z"
            fill="none"
            stroke={color}
            strokeWidth="9.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="0" cy="0" r="4.5" fill={accentColor} />
        </g>
      );
  }
}

export function TopRightMedallionGlyph({
  medallion,
  color = '#FFFFFF',
  accentColor = '#93C5FD',
}: {
  readonly medallion: TopRightMedallion;
  readonly color?: string;
  readonly accentColor?: string;
}): React.ReactElement {
  if (medallion.kind === 'NEXUS_STAR') {
    return <NexusStarGlyph color={color} accentColor={accentColor} />;
  }
  return (
    <FamilyEmblemGlyph
      family={medallion.family}
      color={color}
      accentColor={accentColor}
    />
  );
}

export function BottomRightMedallionGlyph({
  medallion,
  color = '#FFFFFF',
  accentColor = '#93C5FD',
}: {
  readonly medallion: BottomRightMedallion;
  readonly color?: string;
  readonly accentColor?: string;
}): React.ReactElement {
  switch (medallion.kind) {
    case 'FAMILY_MARKER':
      return (
        <FamilyMarkerGlyph
          family={medallion.family}
          color={color}
          accentColor={accentColor}
        />
      );

    case 'IMPULSION_ICON':
      return (
        <g>
          <polyline
            points="-26,-22 -4,0 -26,22"
            fill="none"
            stroke={accentColor}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="-2,-22 20,0 -2,22"
            fill="none"
            stroke={color}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="28"
            y1="-20"
            x2="28"
            y2="20"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      );

    case 'LOOP':
      return (
        <SpecialCornerSymbolGlyph
          symbol="LOOP"
          color={color}
          accentColor={accentColor}
        />
      );

    case 'LOCK_ICON':
      return (
        <g transform="scale(0.9)">
          <SpecialCornerSymbolGlyph
            symbol="LOCK"
            color={color}
            accentColor={accentColor}
          />
        </g>
      );

    case 'SURCHARGE_PICKER_ICON':
      return (
        <g>
          <polygon points="0,-32 14,-10 0,-4 -14,-10" fill="#F59E0B" />
          <polygon points="32,0 10,14 4,0 10,-14" fill="#EF4444" />
          <polygon points="0,32 -14,10 0,4 14,10" fill="#06B6D4" />
          <polygon points="-32,0 -10,-14 -4,0 -10,14" fill="#8B5CF6" />
          <circle cx="0" cy="0" r="8" fill={color} />
        </g>
      );

    case 'PORTAL_RING_ICON':
      return (
        <g>
          <circle
            cx="0"
            cy="0"
            r="30"
            fill="none"
            stroke={accentColor}
            strokeWidth="5"
          />
          <circle
            cx="0"
            cy="0"
            r="19"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeDasharray="8 5"
          />
          <g transform="scale(0.62)">
            <SpecialCornerSymbolGlyph
              symbol="INFINITY"
              color={color}
              accentColor={accentColor}
            />
          </g>
        </g>
      );
  }
}
