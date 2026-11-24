import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CARD_CATALOG } from '../src/catalog/cards';
import { FAMILIES } from '../src/catalog/families';
import { FAMILY_IDS, FAMILY_SPECIAL_CATEGORIES } from '../src/catalog/types';
import {
  ALL_ARTWORK_KEYS,
  ARTWORK_REGISTRY,
  CARD_GEOMETRY,
  FAMILY_VISUAL_THEMES,
  getArtworkAsset,
  resolveCardVisualSpec,
  type ArtworkAssetKey,
} from '../src/graphics';

const WORKSPACE_ROOT = process.cwd();

const HISTORICAL_ARTWORK_KEYS: readonly ArtworkAssetKey[] = [
  'FAMILY_AUBE',
  'FAMILY_BRAISE',
  'FAMILY_ONDE',
  'FAMILY_OMBRE',
  'FAMILY_ECLAIR',
  'FAMILY_CRISTAL',
  'POWER_IMPULSION',
  'POWER_INVERSION',
  'POWER_BOUCLIER',
  'POWER_SURCHARGE',
  'POWER_PORTAIL',
  'CARD_BACK',
];

function readJpegDimensions(absPath: string): { readonly width: number; readonly height: number } {
  const data = fs.readFileSync(absPath);
  assert.equal(data[0], 0xff, `Expected JPEG SOI marker 0xFF in ${absPath}`);
  assert.equal(data[1], 0xd8, `Expected JPEG SOI marker 0xD8 in ${absPath}`);

  let offset = 2;
  while (offset + 3 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
      const height = data.readUInt16BE(offset + 5);
      const width = data.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
    } else {
      const segmentLength = data.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  throw new Error(`No JPEG SOF marker found in ${absPath}`);
}

test('GRA-01: all 80 catalog variants resolve to complete visual specs without catalog changes', () => {
  assert.equal(CARD_CATALOG.length, 80);

  for (const model of CARD_CATALOG) {
    const spec = resolveCardVisualSpec(model.variantId);
    assert.equal(spec.variantId, model.variantId);
    assert.equal(spec.kind, model.kind);
    assert.equal(spec.family, model.family);
    assert.equal(spec.headerLabel, model.headerLabel);
    assert.equal(spec.pointValue, model.pointValue);
    assert.ok(spec.artwork.publicPath.startsWith('/assets/nexus/artworks/'));
  }
});

test('GRA-02: topLeftInsert and bottomLeftInsert are strictly identical at 0° across all 80 variants (numeric & special)', () => {
  const numericCount = CARD_CATALOG.filter((m) => m.kind === 'NUMERIC').length;
  const familySpecialCount = CARD_CATALOG.filter((m) => m.kind === 'FAMILY_SPECIAL').length;
  const universalCount = CARD_CATALOG.filter((m) => m.kind === 'UNIVERSAL_SPECIAL').length;
  assert.equal(numericCount, 60);
  assert.equal(familySpecialCount, 18);
  assert.equal(universalCount, 2);

  for (const model of CARD_CATALOG) {
    const spec = resolveCardVisualSpec(model.variantId);
    assert.equal(spec.topLeftInsert.orientationDeg, 0);
    assert.equal(spec.bottomLeftInsert.orientationDeg, 0);
    assert.deepEqual(spec.topLeftInsert, spec.bottomLeftInsert);
    assert.equal(spec.topLeftInsert.contentKey, spec.bottomLeftInsert.contentKey);
    assert.equal(spec.topLeftInsert.label, spec.bottomLeftInsert.label);

    if (model.kind === 'NUMERIC') {
      assert.equal(spec.topLeftInsert.kind, 'NUMERIC');
      assert.equal(spec.topLeftInsert.label, String(model.value));
    } else {
      assert.equal(spec.topLeftInsert.kind, 'SPECIAL');
    }
  }

  // Verify exact geometric mirror symmetry around y = viewBoxHeight / 2 (768)
  assert.equal(CARD_GEOMETRY.viewBoxWidth, 1024);
  assert.equal(CARD_GEOMETRY.viewBoxHeight, 1536);
  assert.equal(CARD_GEOMETRY.topLeftInsert.x, CARD_GEOMETRY.bottomLeftInsert.x);
  assert.equal(CARD_GEOMETRY.topLeftInsert.width, CARD_GEOMETRY.bottomLeftInsert.width);
  assert.equal(CARD_GEOMETRY.topLeftInsert.height, CARD_GEOMETRY.bottomLeftInsert.height);
  assert.equal(CARD_GEOMETRY.topLeftInsert.chamfer, CARD_GEOMETRY.bottomLeftInsert.chamfer);
  assert.equal(
    CARD_GEOMETRY.topLeftInsert.y +
      CARD_GEOMETRY.bottomLeftInsert.y +
      CARD_GEOMETRY.bottomLeftInsert.height,
    CARD_GEOMETRY.viewBoxHeight,
  );
  assert.equal(
    CARD_GEOMETRY.topLeftInsert.cy + CARD_GEOMETRY.bottomLeftInsert.cy,
    CARD_GEOMETRY.viewBoxHeight,
  );
});

test('GRA-03: Option 2 medallion rules hold across all 80 variants (never LOOP on numeric cards)', () => {
  for (const model of CARD_CATALOG) {
    const spec = resolveCardVisualSpec(model.variantId);

    if (model.kind === 'NUMERIC') {
      assert.equal(spec.topRightMedallion.kind, 'FAMILY_EMBLEM');
      assert.equal(spec.topRightMedallion.family, model.family);
      assert.equal(spec.bottomRightMedallion.kind, 'FAMILY_MARKER');
      assert.equal(spec.bottomRightMedallion.family, model.family);
      assert.notEqual(spec.bottomRightMedallion.kind as string, 'LOOP');
      assert.equal(spec.headerLabel, 'NEXUS');
    } else if (model.kind === 'FAMILY_SPECIAL') {
      assert.equal(spec.topRightMedallion.kind, 'FAMILY_EMBLEM');
      assert.equal(spec.topRightMedallion.family, model.family);
      assert.equal(spec.headerLabel, model.specialCategory);

      if (model.specialCategory === 'IMPULSION') {
        assert.equal(spec.bottomRightMedallion.kind, 'IMPULSION_ICON');
      } else if (model.specialCategory === 'INVERSION') {
        assert.equal(spec.bottomRightMedallion.kind, 'LOOP');
      } else {
        assert.equal(spec.bottomRightMedallion.kind, 'LOCK_ICON');
      }
    } else {
      assert.equal(spec.topRightMedallion.kind, 'NEXUS_STAR');
      assert.equal(spec.headerLabel, model.specialCategory);
      if (model.specialCategory === 'SURCHARGE') {
        assert.equal(spec.bottomRightMedallion.kind, 'SURCHARGE_PICKER_ICON');
      } else {
        assert.equal(spec.bottomRightMedallion.kind, 'PORTAL_RING_ICON');
      }
    }
  }
});

test('GRA-04: 6 families remain visually distinct pairwise without glow effects', () => {
  assert.equal(FAMILIES.length, 6);
  const emblems = new Set(FAMILIES.map((f) => f.emblemName));
  const alloys = new Set(FAMILIES.map((f) => f.chassisAlloy));
  const patterns = new Set(FAMILY_IDS.map((id) => FAMILY_VISUAL_THEMES[id].patternId));
  const primaryColors = new Set(FAMILY_IDS.map((id) => FAMILY_VISUAL_THEMES[id].primaryColor));
  const chassisColors = new Set(FAMILY_IDS.map((id) => FAMILY_VISUAL_THEMES[id].chassisPrimary));

  assert.equal(emblems.size, 6);
  assert.equal(alloys.size, 6);
  assert.equal(patterns.size, 6);
  assert.equal(primaryColors.size, 6);
  assert.equal(chassisColors.size, 6);
});

test('GRA-05: all 30 official artworks (12 historical + 18 family powers) exist on disk at 848x1264 with coherent 2:3 ratio tolerance', () => {
  assert.equal(ALL_ARTWORK_KEYS.length, 30);

  for (const historicalKey of HISTORICAL_ARTWORK_KEYS) {
    assert.ok(
      ALL_ARTWORK_KEYS.includes(historicalKey),
      `Missing historical artwork key: ${historicalKey}`,
    );
  }
  for (const family of FAMILY_IDS) {
    for (const special of FAMILY_SPECIAL_CATEGORIES) {
      const key: ArtworkAssetKey = `FAMILY_${family}_${special}`;
      assert.ok(ALL_ARTWORK_KEYS.includes(key), `Missing family special artwork key: ${key}`);
    }
  }

  for (const key of ALL_ARTWORK_KEYS) {
    const entry = ARTWORK_REGISTRY[key];
    const absPath = path.resolve(WORKSPACE_ROOT, entry.diskRelativePath);
    assert.equal(
      fs.existsSync(absPath),
      true,
      `Missing artwork asset on disk for ${key}: ${absPath}`,
    );
    const stat = fs.statSync(absPath);
    assert.ok(stat.size > 50_000, `Artwork file unexpectedly small for ${key}: ${stat.size} bytes`);

    const { width, height } = readJpegDimensions(absPath);
    assert.equal(width, 848, `Expected width 848 for ${key}, got ${width}`);
    assert.equal(height, 1264, `Expected height 1264 for ${key}, got ${height}`);
    assert.ok(
      Math.abs(width / height - 2 / 3) <= 0.01,
      `Aspect ratio out of 2:3 tolerance for ${key}: ${width}x${height} (${width / height})`,
    );
  }

  // Verify V2 master reference image and SVG chassis ratio remain intact
  const v2Path = path.resolve(
    WORKSPACE_ROOT,
    'public/assets/aistudio/Carte_Nexus___Symbole_de_l_Infini_stellaire_4622ed3d.png',
  );
  assert.equal(fs.existsSync(v2Path), true);
  assert.ok(Math.abs(CARD_GEOMETRY.aspectRatio - 2 / 3) < 1e-6);
});

test('GRA-06: all 18 family specials map to 18 distinct family-power artworks while numeric, universal, and card-back mappings stay preserved', () => {
  const familySpecialPaths = new Set<string>();
  const familySpecialKeys = new Set<ArtworkAssetKey>();
  const genericPowerPaths = new Set([
    '/assets/nexus/artworks/power_impulsion.jpg',
    '/assets/nexus/artworks/power_inversion.jpg',
    '/assets/nexus/artworks/power_bouclier.jpg',
  ]);

  let numericChecked = 0;
  let familySpecialChecked = 0;
  let universalChecked = 0;

  for (const model of CARD_CATALOG) {
    const spec = resolveCardVisualSpec(model.variantId);

    if (model.kind === 'NUMERIC') {
      numericChecked += 1;
      const expectedKey: ArtworkAssetKey = `FAMILY_${model.family}`;
      const expectedPath = `/assets/nexus/artworks/family_${model.family.toLowerCase()}.jpg`;
      assert.equal(spec.artwork.key, expectedKey);
      assert.equal(spec.artwork.publicPath, expectedPath);
    } else if (model.kind === 'FAMILY_SPECIAL') {
      familySpecialChecked += 1;
      const expectedKey: ArtworkAssetKey = `FAMILY_${model.family}_${model.specialCategory}`;
      const expectedPath = `/assets/nexus/artworks/family_${model.family.toLowerCase()}_${model.specialCategory.toLowerCase()}.jpg`;
      assert.equal(spec.artwork.key, expectedKey);
      assert.equal(spec.artwork.publicPath, expectedPath);
      assert.equal(
        genericPowerPaths.has(spec.artwork.publicPath),
        false,
        `Family special ${model.variantId} must not use generic power artwork ${spec.artwork.publicPath}`,
      );
      familySpecialKeys.add(spec.artwork.key);
      familySpecialPaths.add(spec.artwork.publicPath);
    } else {
      universalChecked += 1;
      const expectedKey: ArtworkAssetKey = `POWER_${model.specialCategory}`;
      const expectedPath = `/assets/nexus/artworks/power_${model.specialCategory.toLowerCase()}.jpg`;
      assert.equal(spec.artwork.key, expectedKey);
      assert.equal(spec.artwork.publicPath, expectedPath);
    }
  }

  assert.equal(numericChecked, 60);
  assert.equal(familySpecialChecked, 18);
  assert.equal(universalChecked, 2);
  assert.equal(familySpecialKeys.size, 18);
  assert.equal(familySpecialPaths.size, 18);
  assert.equal(getArtworkAsset('CARD_BACK').publicPath, '/assets/nexus/artworks/card_back.jpg');
});
