import type { FamilyDefinition, FamilyId } from './types';

export const FAMILIES: readonly FamilyDefinition[] = Object.freeze([
  Object.freeze({
    id: 'AUBE',
    displayName: 'Aube',
    primaryColor: '#F59E0B',
    secondaryColor: '#FDE68A',
    chassisAlloy: 'CHAMPAGNE_GOLD_TITANIUM',
    emblemName: 'RADIAL_SUN_8',
    masterArtworkKey: 'FAMILY_AUBE',
  }),
  Object.freeze({
    id: 'BRAISE',
    displayName: 'Braise',
    primaryColor: '#EF4444',
    secondaryColor: '#F97316',
    chassisAlloy: 'BLACKENED_STEEL_COPPER',
    emblemName: 'TRI_FLAME',
    masterArtworkKey: 'FAMILY_BRAISE',
  }),
  Object.freeze({
    id: 'ONDE',
    displayName: 'Onde',
    primaryColor: '#06B6D4',
    secondaryColor: '#2563EB',
    chassisAlloy: 'DARK_TITANIUM_BLUE',
    emblemName: 'TRIPLE_WAVE',
    masterArtworkKey: 'FAMILY_ONDE',
  }),
  Object.freeze({
    id: 'OMBRE',
    displayName: 'Ombre',
    primaryColor: '#8B5CF6',
    secondaryColor: '#4338CA',
    chassisAlloy: 'MATTE_OBSIDIAN_SILVER',
    emblemName: 'ECLIPSE_CRESCENT',
    masterArtworkKey: 'FAMILY_OMBRE',
  }),
  Object.freeze({
    id: 'ECLAIR',
    displayName: 'Éclair',
    primaryColor: '#38BDF8',
    secondaryColor: '#F0F9FF',
    chassisAlloy: 'COLD_CHROME_PLATINUM',
    emblemName: 'TRIPLE_BOLT',
    masterArtworkKey: 'FAMILY_ECLAIR',
  }),
  Object.freeze({
    id: 'CRISTAL',
    displayName: 'Cristal',
    primaryColor: '#10B981',
    secondaryColor: '#A7F3D0',
    chassisAlloy: 'BRUSHED_SILVER_QUARTZ',
    emblemName: 'FACETED_OCTAHEDRON',
    masterArtworkKey: 'FAMILY_CRISTAL',
  }),
]);

export const FAMILIES_BY_ID: Readonly<Record<FamilyId, FamilyDefinition>> =
  Object.freeze(
    FAMILIES.reduce(
      (acc, family) => {
        acc[family.id] = family;
        return acc;
      },
      {} as Record<FamilyId, FamilyDefinition>,
    ),
  );
