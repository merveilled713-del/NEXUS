import React, { useId } from 'react';
import {
  BottomRightMedallionGlyph,
  SpecialCornerSymbolGlyph,
  TopRightMedallionGlyph,
} from './FamilyEmblemSvg';
import {
  CARD_GEOMETRY,
  type CardVisualSpec,
  type CornerInsertSpec,
  type FamilyPatternId,
} from './graphicsTypes';

function buildOctagonPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  chamfer: number,
): string {
  const x0 = x;
  const x1 = x + chamfer;
  const x2 = x + width - chamfer;
  const x3 = x + width;
  const y0 = y;
  const y1 = y + chamfer;
  const y2 = y + height - chamfer;
  const y3 = y + height;

  return [
    `${x1},${y0}`,
    `${x2},${y0}`,
    `${x3},${y1}`,
    `${x3},${y2}`,
    `${x2},${y3}`,
    `${x1},${y3}`,
    `${x0},${y2}`,
    `${x0},${y1}`,
  ].join(' ');
}

function renderFamilyStructuralPattern(
  patternId: FamilyPatternId,
  color: string,
): React.ReactElement {
  switch (patternId) {
    case 'SOLAR_RAYS':
      return (
        <g stroke={color} strokeOpacity="0.28" strokeWidth="2.5">
          <line x1="512" y1="130" x2="512" y2="210" />
          <line x1="512" y1="1326" x2="512" y2="1406" />
          <line x1="86" y1="768" x2="152" y2="768" />
          <line x1="872" y1="768" x2="938" y2="768" />
        </g>
      );
    case 'EMBER_CHEVRONS':
      return (
        <g stroke={color} strokeOpacity="0.3" strokeWidth="3" fill="none">
          <polyline points="72,560 96,520 72,480" />
          <polyline points="952,560 928,520 952,480" />
          <polyline points="72,1056 96,1016 72,976" />
          <polyline points="952,1056 928,1016 952,976" />
        </g>
      );
    case 'WAVE_ARCS':
      return (
        <g stroke={color} strokeOpacity="0.28" strokeWidth="3" fill="none">
          <path d="M 380,1360 Q 512,1320 644,1360" />
          <path d="M 360,1384 Q 512,1340 664,1384" />
        </g>
      );
    case 'ECLIPSE_RINGS':
      return (
        <g stroke={color} strokeOpacity="0.26" strokeWidth="2.5" fill="none">
          <circle cx="512" cy="768" r="410" strokeDasharray="16 24" />
        </g>
      );
    case 'VOLT_GRID':
      return (
        <g stroke={color} strokeOpacity="0.32" strokeWidth="3" fill="none">
          <polyline points="72,400 100,435 78,470" />
          <polyline points="952,400 924,435 946,470" />
          <polyline points="72,1136 100,1101 78,1066" />
          <polyline points="952,1136 924,1101 946,1066" />
        </g>
      );
    case 'PRISM_FACETS':
      return (
        <g stroke={color} strokeOpacity="0.3" strokeWidth="2.5" fill="none">
          <polygon points="512,1395 544,1425 512,1455 480,1425" />
          <polygon points="82,768 104,740 104,796" />
          <polygon points="942,768 920,740 920,796" />
        </g>
      );
    case 'NEXUS_PRISM':
      return (
        <g stroke={color} strokeOpacity="0.32" strokeWidth="2.5" fill="none">
          <circle cx="512" cy="768" r="420" strokeDasharray="10 14" />
          <polygon points="512,1392 548,1426 512,1460 476,1426" />
        </g>
      );
  }
}

function CornerBadgeContent({
  insert,
  cx,
  cy,
  accentColor,
}: {
  readonly insert: CornerInsertSpec;
  readonly cx: number;
  readonly cy: number;
  readonly accentColor: string;
}): React.ReactElement {
  if (insert.kind === 'NUMERIC') {
    const needsOrientationCue = insert.value === 6 || insert.value === 9;
    return (
      <g
        transform={`translate(${cx}, ${cy}) rotate(${insert.orientationDeg})`}
        data-corner-orientation={insert.orientationDeg}
      >
        <text
          x="0"
          y={needsOrientationCue ? 44 : 52}
          textAnchor="middle"
          fill="#FFFFFF"
          stroke="#030712"
          strokeWidth="6"
          paintOrder="stroke"
          fontSize="152"
          fontWeight="800"
          fontFamily="'Outfit', 'Rajdhani', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {insert.label}
        </text>
        {needsOrientationCue ? (
          <rect
            x="-36"
            y="66"
            width="72"
            height="9"
            rx="4.5"
            fill={accentColor}
            fillOpacity="0.95"
          />
        ) : null}
      </g>
    );
  }

  if (insert.symbol === '+2' || insert.symbol === '+4') {
    return (
      <g
        transform={`translate(${cx}, ${cy}) rotate(${insert.orientationDeg})`}
        data-corner-orientation={insert.orientationDeg}
      >
        <text
          x="0"
          y="44"
          textAnchor="middle"
          fill="#FFFFFF"
          stroke="#030712"
          strokeWidth="5"
          paintOrder="stroke"
          fontSize="124"
          fontWeight="800"
          letterSpacing="-4"
          fontFamily="'Outfit', 'Rajdhani', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
        >
          {insert.label}
        </text>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${insert.orientationDeg}) scale(1.65)`}
      data-corner-orientation={insert.orientationDeg}
    >
      <SpecialCornerSymbolGlyph
        symbol={insert.symbol}
        color="#FFFFFF"
        accentColor={accentColor}
      />
    </g>
  );
}

export interface CardFrameSvgProps {
  readonly spec: CardVisualSpec;
  readonly glowEnabled: boolean;
  readonly uid?: string;
  readonly className?: string;
}

export function CardFrameSvg({
  spec,
  glowEnabled,
  uid,
  className = '',
}: CardFrameSvgProps): React.ReactElement {
  const reactId = useId().replace(/:/g, '');
  const safeUid = `${uid ?? spec.variantId}-${reactId}`;
  const { theme } = spec;
  const g = CARD_GEOMETRY;

  const frameGradientId = `nexus-frame-${safeUid}`;
  const trimGradientId = `nexus-trim-${safeUid}`;

  const topLeftOct = buildOctagonPoints(
    g.topLeftInsert.x,
    g.topLeftInsert.y,
    g.topLeftInsert.width,
    g.topLeftInsert.height,
    g.topLeftInsert.chamfer,
  );
  const bottomLeftOct = buildOctagonPoints(
    g.bottomLeftInsert.x,
    g.bottomLeftInsert.y,
    g.bottomLeftInsert.width,
    g.bottomLeftInsert.height,
    g.bottomLeftInsert.chamfer,
  );

  const headerPoints = [
    `${g.headerCartouche.x},${g.headerCartouche.y}`,
    `${g.headerCartouche.x + g.headerCartouche.width},${g.headerCartouche.y}`,
    `${g.headerCartouche.x + g.headerCartouche.width - 28},${g.headerCartouche.y + g.headerCartouche.height}`,
    `${g.headerCartouche.x + 28},${g.headerCartouche.y + g.headerCartouche.height}`,
  ].join(' ');

  const bottomBridgePoints = [
    '336,1434',
    '688,1434',
    '728,1488',
    '296,1488',
  ].join(' ');

  const isLongHeader = spec.headerLabel.length > 5;
  const headerFontSize = spec.headerLabel.length >= 9 ? 25 : isLongHeader ? 28 : 36;
  const headerLetterSpacing = spec.headerLabel.length >= 9 ? 1.5 : isLongHeader ? 2 : 5;

  return (
    <svg
      viewBox={`0 0 ${g.viewBoxWidth} ${g.viewBoxHeight}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={frameGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.chassisSecondary} />
          <stop offset="32%" stopColor={theme.chassisPrimary} />
          <stop offset="68%" stopColor="#1E293B" />
          <stop offset="100%" stopColor={theme.chassisSecondary} />
        </linearGradient>

        <linearGradient id={trimGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={theme.accentHighlight} />
          <stop offset="50%" stopColor={theme.primaryColor} />
          <stop offset="100%" stopColor={theme.chassisSecondary} />
        </linearGradient>
      </defs>

      {/* Outer dark chassis edge */}
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

      {/* Beveled metallic perimeter rail with V2 side notches */}
      <path
        d="M 68,22 L 956,22 L 1002,68 L 1002,330 L 972,366 L 972,1170 L 1002,1206 L 1002,1468 L 956,1514 L 68,1514 L 22,1468 L 22,1206 L 52,1170 L 52,366 L 22,330 L 22,68 Z"
        fill="none"
        stroke={`url(#${frameGradientId})`}
        strokeWidth="18"
        strokeLinejoin="miter"
      />

      {/* Luminous outer aura stroke when glowEnabled is active */}
      {glowEnabled ? (
        <path
          d="M 80,38 L 944,38 L 986,80 L 986,322 L 956,358 L 956,1178 L 986,1214 L 986,1456 L 944,1498 L 80,1498 L 38,1456 L 38,1214 L 68,1178 L 68,358 L 38,322 L 38,80 Z"
          fill="none"
          stroke={theme.primaryColor}
          strokeWidth="14"
          strokeOpacity="0.28"
        />
      ) : null}

      {/* Fine inner sci-fi frame rim */}
      <path
        d="M 80,38 L 944,38 L 986,80 L 986,322 L 956,358 L 956,1178 L 986,1214 L 986,1456 L 944,1498 L 80,1498 L 38,1456 L 38,1214 L 68,1178 L 68,358 L 38,322 L 38,80 Z"
        fill="none"
        stroke={`url(#${trimGradientId})`}
        strokeWidth="4.5"
      />

      {/* Subtle structural family ornament independent of glow */}
      {renderFamilyStructuralPattern(theme.patternId, theme.secondaryColor)}

      {/* ZONE 1: Top Center Header Cartouche */}
      <g data-zone="header-cartouche">
        <polygon
          points={headerPoints}
          fill="#060B18"
          stroke={`url(#${frameGradientId})`}
          strokeWidth="6.5"
        />
        {!isLongHeader ? (
          <>
            <line
              x1="354"
              y1="77"
              x2="404"
              y2="77"
              stroke={theme.chassisSecondary}
              strokeWidth="3.5"
              strokeOpacity="0.85"
            />
            <line
              x1="620"
              y1="77"
              x2="670"
              y2="77"
              stroke={theme.chassisSecondary}
              strokeWidth="3.5"
              strokeOpacity="0.85"
            />
          </>
        ) : null}
        <text
          x={g.headerCartouche.cx}
          y={g.headerCartouche.cy + (isLongHeader ? 11 : 12)}
          textAnchor="middle"
          fill="#F8FAFC"
          fontSize={headerFontSize}
          fontWeight="800"
          letterSpacing={headerLetterSpacing}
          fontFamily="'Outfit', 'Rajdhani', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
        >
          {spec.headerLabel}
        </text>
      </g>

      {/* Bottom decorative metallic bridge matching V2 symmetry */}
      <polygon
        points={bottomBridgePoints}
        fill="#060B18"
        fillOpacity="0.92"
        stroke={`url(#${frameGradientId})`}
        strokeWidth="5.5"
      />
      {glowEnabled ? (
        <line
          x1="426"
          y1="1461"
          x2="598"
          y2="1461"
          stroke={theme.primaryColor}
          strokeWidth="14"
          strokeOpacity="0.32"
          strokeLinecap="round"
        />
      ) : null}
      <line
        x1="430"
        y1="1461"
        x2="594"
        y2="1461"
        stroke={theme.primaryColor}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* ZONE 2: Top-Left Octagonal Insert (0 deg) */}
      <g data-zone="top-left-insert">
        <polygon
          points={topLeftOct}
          fill="#050914"
          stroke={`url(#${frameGradientId})`}
          strokeWidth="12"
        />
        {glowEnabled ? (
          <polygon
            points={buildOctagonPoints(
              g.topLeftInsert.x + 12,
              g.topLeftInsert.y + 12,
              g.topLeftInsert.width - 24,
              g.topLeftInsert.height - 24,
              g.topLeftInsert.chamfer - 8,
            )}
            fill="none"
            stroke={theme.primaryColor}
            strokeWidth="11"
            strokeOpacity="0.26"
          />
        ) : null}
        <polygon
          points={buildOctagonPoints(
            g.topLeftInsert.x + 12,
            g.topLeftInsert.y + 12,
            g.topLeftInsert.width - 24,
            g.topLeftInsert.height - 24,
            g.topLeftInsert.chamfer - 8,
          )}
          fill="none"
          stroke={theme.primaryColor}
          strokeWidth="3.5"
          strokeOpacity="0.9"
        />
        <CornerBadgeContent
          insert={spec.topLeftInsert}
          cx={g.topLeftInsert.cx}
          cy={g.topLeftInsert.cy}
          accentColor={theme.chassisSecondary}
        />
      </g>

      {/* ZONE 3: Bottom-Left Octagonal Insert (0 deg, strictly symmetric) */}
      <g data-zone="bottom-left-insert">
        <polygon
          points={bottomLeftOct}
          fill="#050914"
          stroke={`url(#${frameGradientId})`}
          strokeWidth="12"
        />
        {glowEnabled ? (
          <polygon
            points={buildOctagonPoints(
              g.bottomLeftInsert.x + 12,
              g.bottomLeftInsert.y + 12,
              g.bottomLeftInsert.width - 24,
              g.bottomLeftInsert.height - 24,
              g.bottomLeftInsert.chamfer - 8,
            )}
            fill="none"
            stroke={theme.primaryColor}
            strokeWidth="11"
            strokeOpacity="0.26"
          />
        ) : null}
        <polygon
          points={buildOctagonPoints(
            g.bottomLeftInsert.x + 12,
            g.bottomLeftInsert.y + 12,
            g.bottomLeftInsert.width - 24,
            g.bottomLeftInsert.height - 24,
            g.bottomLeftInsert.chamfer - 8,
          )}
          fill="none"
          stroke={theme.primaryColor}
          strokeWidth="3.5"
          strokeOpacity="0.9"
        />
        <CornerBadgeContent
          insert={spec.bottomLeftInsert}
          cx={g.bottomLeftInsert.cx}
          cy={g.bottomLeftInsert.cy}
          accentColor={theme.chassisSecondary}
        />
      </g>

      {/* ZONE 4: Top-Right Circular Double-Ring Medallion */}
      <g data-zone="top-right-medallion">
        <circle
          cx={g.topRightMedallion.cx}
          cy={g.topRightMedallion.cy}
          r={g.topRightMedallion.outerRadius}
          fill="#050914"
          stroke={`url(#${frameGradientId})`}
          strokeWidth="12"
        />
        {glowEnabled ? (
          <circle
            cx={g.topRightMedallion.cx}
            cy={g.topRightMedallion.cy}
            r={g.topRightMedallion.innerRadius}
            fill="none"
            stroke={theme.primaryColor}
            strokeWidth="12"
            strokeOpacity="0.28"
          />
        ) : null}
        <circle
          cx={g.topRightMedallion.cx}
          cy={g.topRightMedallion.cy}
          r={g.topRightMedallion.innerRadius}
          fill="#060B18"
          stroke={theme.primaryColor}
          strokeWidth="4"
        />
        <g
          transform={`translate(${g.topRightMedallion.cx}, ${g.topRightMedallion.cy}) scale(1.42)`}
        >
          <TopRightMedallionGlyph
            medallion={spec.topRightMedallion}
            color="#FFFFFF"
            accentColor={theme.secondaryColor}
          />
        </g>
      </g>

      {/* ZONE 5: Bottom-Right Circular Double-Ring Medallion (Option 2) */}
      <g data-zone="bottom-right-medallion">
        <circle
          cx={g.bottomRightMedallion.cx}
          cy={g.bottomRightMedallion.cy}
          r={g.bottomRightMedallion.outerRadius}
          fill="#050914"
          stroke={`url(#${frameGradientId})`}
          strokeWidth="12"
        />
        {glowEnabled ? (
          <circle
            cx={g.bottomRightMedallion.cx}
            cy={g.bottomRightMedallion.cy}
            r={g.bottomRightMedallion.innerRadius}
            fill="none"
            stroke={theme.chassisSecondary}
            strokeWidth="12"
            strokeOpacity="0.26"
          />
        ) : null}
        <circle
          cx={g.bottomRightMedallion.cx}
          cy={g.bottomRightMedallion.cy}
          r={g.bottomRightMedallion.innerRadius}
          fill="#060B18"
          stroke={theme.chassisSecondary}
          strokeWidth="4"
        />
        <g
          transform={`translate(${g.bottomRightMedallion.cx}, ${g.bottomRightMedallion.cy}) scale(1.42)`}
        >
          <BottomRightMedallionGlyph
            medallion={spec.bottomRightMedallion}
            color="#FFFFFF"
            accentColor={theme.secondaryColor}
          />
        </g>
      </g>
    </svg>
  );
}
