/**
 * NEXUS — Géométrie radiale des sièges autour du plateau circulaire (Lot R2).
 * Répartit 1 à 5 adversaires autour de l'arc supérieur/latéral du plateau,
 * le joueur humain occupant toujours la base (6h).
 */

export type SeatPlacementSlot =
  | 'LEFT'
  | 'TOP_LEFT'
  | 'TOP'
  | 'TOP_RIGHT'
  | 'RIGHT';

export interface OpponentSeatLayout {
  readonly slot: SeatPlacementSlot;
  /** Position CSS en pourcentage sur l'arène desktop (md+) */
  readonly desktopClass: string;
  /** Direction de la flèche de tour pointant vers le centre de table */
  readonly pointerDirection: 'down' | 'right' | 'left' | 'down-right' | 'down-left';
}

const SEAT_LAYOUTS_BY_COUNT: Readonly<Record<number, readonly OpponentSeatLayout[]>> = {
  1: [
    {
      slot: 'TOP',
      desktopClass: 'md:left-1/2 md:top-2 md:-translate-x-1/2',
      pointerDirection: 'down',
    },
  ],
  2: [
    {
      slot: 'TOP_LEFT',
      desktopClass: 'md:left-[6%] md:top-[12%]',
      pointerDirection: 'down-right',
    },
    {
      slot: 'TOP_RIGHT',
      desktopClass: 'md:right-[6%] md:top-[12%]',
      pointerDirection: 'down-left',
    },
  ],
  3: [
    {
      slot: 'LEFT',
      desktopClass: 'md:left-2 md:top-[44%] md:-translate-y-1/2',
      pointerDirection: 'right',
    },
    {
      slot: 'TOP',
      desktopClass: 'md:left-1/2 md:top-2 md:-translate-x-1/2',
      pointerDirection: 'down',
    },
    {
      slot: 'RIGHT',
      desktopClass: 'md:right-2 md:top-[44%] md:-translate-y-1/2',
      pointerDirection: 'left',
    },
  ],
  4: [
    {
      slot: 'LEFT',
      desktopClass: 'md:left-2 md:top-[52%] md:-translate-y-1/2',
      pointerDirection: 'right',
    },
    {
      slot: 'TOP_LEFT',
      desktopClass: 'md:left-[18%] md:top-2',
      pointerDirection: 'down-right',
    },
    {
      slot: 'TOP_RIGHT',
      desktopClass: 'md:right-[18%] md:top-2',
      pointerDirection: 'down-left',
    },
    {
      slot: 'RIGHT',
      desktopClass: 'md:right-2 md:top-[52%] md:-translate-y-1/2',
      pointerDirection: 'left',
    },
  ],
  5: [
    {
      slot: 'LEFT',
      desktopClass: 'md:left-1.5 md:top-[56%] md:-translate-y-1/2',
      pointerDirection: 'right',
    },
    {
      slot: 'TOP_LEFT',
      desktopClass: 'md:left-[11%] md:top-[9%]',
      pointerDirection: 'down-right',
    },
    {
      slot: 'TOP',
      desktopClass: 'md:left-1/2 md:top-1.5 md:-translate-x-1/2',
      pointerDirection: 'down',
    },
    {
      slot: 'TOP_RIGHT',
      desktopClass: 'md:right-[11%] md:top-[9%]',
      pointerDirection: 'down-left',
    },
    {
      slot: 'RIGHT',
      desktopClass: 'md:right-1.5 md:top-[56%] md:-translate-y-1/2',
      pointerDirection: 'left',
    },
  ],
};

export function getOpponentSeatLayouts(count: number): readonly OpponentSeatLayout[] {
  const clamped = Math.max(1, Math.min(5, count));
  return SEAT_LAYOUTS_BY_COUNT[clamped];
}

/** Coordinates normalized (0..100%) for Solo Setup mini orbital preview */
export function getPreviewSeatCoordinates(
  count: number,
): ReadonlyArray<{ readonly xPct: number; readonly yPct: number }> {
  const clamped = Math.max(1, Math.min(5, count));
  switch (clamped) {
    case 1:
      return [{ xPct: 50, yPct: 14 }];
    case 2:
      return [
        { xPct: 24, yPct: 24 },
        { xPct: 76, yPct: 24 },
      ];
    case 3:
      return [
        { xPct: 16, yPct: 48 },
        { xPct: 50, yPct: 14 },
        { xPct: 84, yPct: 48 },
      ];
    case 4:
      return [
        { xPct: 14, yPct: 52 },
        { xPct: 33, yPct: 17 },
        { xPct: 67, yPct: 17 },
        { xPct: 86, yPct: 52 },
      ];
    default:
      return [
        { xPct: 13, yPct: 56 },
        { xPct: 24, yPct: 22 },
        { xPct: 50, yPct: 12 },
        { xPct: 76, yPct: 22 },
        { xPct: 87, yPct: 56 },
      ];
  }
}
