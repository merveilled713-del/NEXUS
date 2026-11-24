import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARD_CATALOG,
  CARD_CATALOG_BY_ID,
  FAMILY_SPECIAL_CARD_MODELS,
  NUMERIC_CARD_MODELS,
  UNIVERSAL_SPECIAL_CARD_MODELS,
} from '../src/catalog/cards';
import { FAMILIES } from '../src/catalog/families';
import {
  FAMILY_IDS,
  FAMILY_SPECIAL_CATEGORIES,
  NUMERIC_VALUES,
  UNIVERSAL_SPECIAL_CATEGORIES,
  type CardModel,
  type FamilyDefinition,
  type FamilyId,
} from '../src/catalog/types';
import { isValidFamilyId, isValidNumericValue, validateCatalog } from '../src/catalog/validators';
import {
  BATCH_COMPLETION_TIMEOUT_MS,
  NEXUS_DEFAULT_CONFIG,
  buildDeck,
  calculateDeckSize,
  validateDeckConfig,
  type NexusGameConfig,
} from '../src/config/nexus.config';

function cloneCatalog(): CardModel[] {
  return CARD_CATALOG.map((model) => ({ ...model }));
}

test('CAT-01: exactement 6 familles avec les identifiants ASCII officiels et rejet des familles invalides', () => {
  assert.equal(FAMILIES.length, 6);
  assert.deepEqual(
    FAMILIES.map((f) => f.id),
    ['AUBE', 'BRAISE', 'ONDE', 'OMBRE', 'ECLAIR', 'CRISTAL'],
  );
  for (const id of FAMILY_IDS) {
    assert.equal(isValidFamilyId(id), true);
  }

  // Cas négatif : famille manquante (5 familles au lieu de 6)
  const missingFamilyList: FamilyDefinition[] = FAMILIES.slice(0, 5);
  const missingCheck = validateCatalog(CARD_CATALOG, missingFamilyList);
  assert.equal(missingCheck.valid, false);
  assert.ok(missingCheck.errors.some((e) => e.includes('Expected 6 families')));

  // Cas négatif : identifiant non officiel / famille manquante
  const corruptedFamilyList: FamilyDefinition[] = [
    ...FAMILIES.slice(0, 5),
    { ...FAMILIES[0], id: 'INCONNUE' as unknown as FamilyId },
  ];
  const invalidIdCheck = validateCatalog(CARD_CATALOG, corruptedFamilyList);
  assert.equal(invalidIdCheck.valid, false);
  assert.ok(invalidIdCheck.errors.some((e) => e.includes('Missing official family CRISTAL')));
  assert.equal(isValidFamilyId('ÉCLAIR'), false);

  // Cas négatif : véritable doublon de famille (deux entrées AUBE) sur copie indépendante
  const duplicateFamilyList: FamilyDefinition[] = [
    ...FAMILIES.slice(0, 5).map((f) => ({ ...f })),
    { ...FAMILIES[0] },
  ];
  const duplicateFamilyCheck = validateCatalog(cloneCatalog(), duplicateFamilyList);
  assert.equal(duplicateFamilyCheck.valid, false);
  assert.ok(
    duplicateFamilyCheck.errors.some((e) => e.includes('Duplicate family IDs detected')),
  );
});

test('CAT-02: exactement 60 modèles numériques couvrant 0 à 9 pour chacune des 6 familles et rejet des absences/doublons', () => {
  assert.equal(NUMERIC_CARD_MODELS.length, 60);
  for (const family of FAMILY_IDS) {
    const familyCards = NUMERIC_CARD_MODELS.filter((c) => c.family === family);
    assert.equal(familyCards.length, 10);
    assert.deepEqual(
      familyCards.map((c) => c.value),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
  }

  // Cas négatif : suppression d'un modèle numérique (59 modèles numériques au lieu de 60)
  const withoutAube5 = cloneCatalog().filter((m) => m.variantId !== 'AUBE_5');
  const missingNumericCheck = validateCatalog(withoutAube5);
  assert.equal(missingNumericCheck.valid, false);
  assert.ok(missingNumericCheck.errors.some((e) => e.includes('Expected 60 numeric models')));
  assert.ok(missingNumericCheck.errors.some((e) => e.includes('Missing numeric variant AUBE_5')));
});

test('CAT-03: interdiction stricte de toute valeur numérique hors de 0 à 9', () => {
  for (const model of NUMERIC_CARD_MODELS) {
    assert.equal(isValidNumericValue(model.value), true);
  }
  for (const invalid of [-1, 10, 11, 1.5, NaN, Infinity, -Infinity, '7', null, undefined]) {
    assert.equal(isValidNumericValue(invalid), false);
  }

  // Cas négatif : valeur numérique corrompue (> 9) sur une copie indépendante
  const corruptedCatalog = cloneCatalog();
  const targetIndex = corruptedCatalog.findIndex((m) => m.variantId === 'AUBE_1');
  assert.notEqual(targetIndex, -1);
  const original = corruptedCatalog[targetIndex];
  assert.equal(original.kind, 'NUMERIC');
  corruptedCatalog[targetIndex] = {
    ...original,
    value: 10 as unknown as (typeof NUMERIC_VALUES)[number],
  };

  const validation = validateCatalog(corruptedCatalog);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes('Out-of-range numeric value')));
});

test('CAT-04: exactement 5 catégories spéciales et 20 variantes spéciales (18 familiales + 2 universelles)', () => {
  assert.equal(FAMILY_SPECIAL_CATEGORIES.length + UNIVERSAL_SPECIAL_CATEGORIES.length, 5);
  assert.equal(FAMILY_SPECIAL_CARD_MODELS.length, 18);
  assert.equal(UNIVERSAL_SPECIAL_CARD_MODELS.length, 2);

  for (const category of FAMILY_SPECIAL_CATEGORIES) {
    const models = FAMILY_SPECIAL_CARD_MODELS.filter((m) => m.specialCategory === category);
    assert.equal(models.length, 6);
  }
  for (const universal of UNIVERSAL_SPECIAL_CARD_MODELS) {
    assert.equal(universal.family, null);
  }

  // Cas négatif : carte universelle rattachée à tort à une famille
  const corruptedUniversalCatalog = cloneCatalog();
  const portailIdx = corruptedUniversalCatalog.findIndex(
    (m) => m.variantId === 'UNIVERSAL_PORTAIL',
  );
  assert.notEqual(portailIdx, -1);
  const portail = corruptedUniversalCatalog[portailIdx];
  assert.equal(portail.kind, 'UNIVERSAL_SPECIAL');
  corruptedUniversalCatalog[portailIdx] = {
    ...portail,
    family: 'OMBRE' as unknown as null,
  };
  const universalCheck = validateCatalog(corruptedUniversalCatalog);
  assert.equal(universalCheck.valid, false);
  assert.ok(universalCheck.errors.some((e) => e.includes('must have family === null')));

  // Cas négatif : suppression d'une spéciale familiale (17 au lieu de 18)
  const withoutSpecial = cloneCatalog().filter((m) => m.variantId !== 'BRAISE_BOUCLIER');
  const specialCountCheck = validateCatalog(withoutSpecial);
  assert.equal(specialCountCheck.valid, false);
  assert.ok(specialCountCheck.errors.some((e) => e.includes('Expected 18 family special models')));
});

test('CAT-05: catalogue complet de 80 variantes uniques et cohérence stricte variantId ↔ contenu', () => {
  assert.equal(CARD_CATALOG.length, 80);
  const uniqueIds = new Set(CARD_CATALOG.map((m) => m.variantId));
  assert.equal(uniqueIds.size, 80);

  const catalogCheck = validateCatalog(CARD_CATALOG);
  assert.equal(catalogCheck.valid, true, catalogCheck.errors.join('; '));

  // Cas négatif 1 : doublon de variantId sur une copie indépendante
  const duplicateCatalog = cloneCatalog();
  duplicateCatalog[1] = { ...duplicateCatalog[0] };
  const dupCheck = validateCatalog(duplicateCatalog);
  assert.equal(dupCheck.valid, false);
  assert.ok(dupCheck.errors.some((e) => e.includes('Duplicate variantId')));

  // Cas négatif 2 : NUMERIC avec contenu valide mais variantId incohérent (AUBE_7 avec variantId AUBE_8)
  const badNumericIdCatalog = cloneCatalog();
  const aube7Idx = badNumericIdCatalog.findIndex((m) => m.variantId === 'AUBE_7');
  const aube7 = badNumericIdCatalog[aube7Idx];
  assert.equal(aube7.kind, 'NUMERIC');
  badNumericIdCatalog[aube7Idx] = { ...aube7, variantId: 'AUBE_8' };
  const badNumericIdCheck = validateCatalog(badNumericIdCatalog);
  assert.equal(badNumericIdCheck.valid, false);
  assert.ok(
    badNumericIdCheck.errors.some((e) =>
      e.includes('VariantId mismatch on AUBE_8: expected AUBE_7'),
    ),
  );

  // Cas négatif 3 : FAMILY_SPECIAL avec contenu valide mais variantId incohérent
  const badFamilySpecialIdCatalog = cloneCatalog();
  const braiseImpIdx = badFamilySpecialIdCatalog.findIndex(
    (m) => m.variantId === 'BRAISE_IMPULSION',
  );
  const braiseImp = badFamilySpecialIdCatalog[braiseImpIdx];
  assert.equal(braiseImp.kind, 'FAMILY_SPECIAL');
  badFamilySpecialIdCatalog[braiseImpIdx] = { ...braiseImp, variantId: 'ONDE_IMPULSION' };
  const badFamilySpecialCheck = validateCatalog(badFamilySpecialIdCatalog);
  assert.equal(badFamilySpecialCheck.valid, false);
  assert.ok(
    badFamilySpecialCheck.errors.some((e) =>
      e.includes('VariantId mismatch on ONDE_IMPULSION: expected BRAISE_IMPULSION'),
    ),
  );

  // Cas négatif 4 : UNIVERSAL_SPECIAL avec contenu valide mais variantId incohérent (échange SURCHARGE <-> PORTAIL)
  const swappedUniversalCatalog = cloneCatalog();
  const surchargeIdx = swappedUniversalCatalog.findIndex(
    (m) => m.variantId === 'UNIVERSAL_SURCHARGE',
  );
  const portailIdx = swappedUniversalCatalog.findIndex(
    (m) => m.variantId === 'UNIVERSAL_PORTAIL',
  );
  const surcharge = swappedUniversalCatalog[surchargeIdx];
  const portail = swappedUniversalCatalog[portailIdx];
  assert.equal(surcharge.kind, 'UNIVERSAL_SPECIAL');
  assert.equal(portail.kind, 'UNIVERSAL_SPECIAL');
  swappedUniversalCatalog[surchargeIdx] = { ...surcharge, variantId: 'UNIVERSAL_PORTAIL' };
  swappedUniversalCatalog[portailIdx] = { ...portail, variantId: 'UNIVERSAL_SURCHARGE' };
  const swappedUniversalCheck = validateCatalog(swappedUniversalCatalog);
  assert.equal(swappedUniversalCheck.valid, false);
  assert.ok(
    swappedUniversalCheck.errors.some((e) =>
      e.includes('VariantId mismatch on UNIVERSAL_PORTAIL: expected UNIVERSAL_SURCHARGE'),
    ),
  );
});

test('CAT-06: symétrie, orientation 0°, médaillons Option 2, aucun LOOP sur numérique et correspondance stricte des spéciales', () => {
  for (const model of CARD_CATALOG) {
    assert.equal(model.cornerBadge.orientationDeg, 0);

    if (model.kind === 'NUMERIC') {
      assert.equal(model.cornerBadge.kind, 'NUMERIC');
      assert.equal(model.cornerBadge.value, model.value);
      assert.equal(model.topRightMedallion.kind, 'FAMILY_EMBLEM');
      assert.equal(model.topRightMedallion.family, model.family);
      assert.equal(model.bottomRightMedallion.kind, 'FAMILY_MARKER');
      assert.equal(model.bottomRightMedallion.family, model.family);
      assert.notEqual((model.bottomRightMedallion.kind as string), 'LOOP');
    } else if (model.kind === 'FAMILY_SPECIAL') {
      assert.equal(model.cornerBadge.kind, 'SPECIAL');
      assert.equal(model.topRightMedallion.kind, 'FAMILY_EMBLEM');
      assert.equal(model.topRightMedallion.family, model.family);

      if (model.specialCategory === 'IMPULSION') {
        assert.equal(model.cornerBadge.symbol, '+2');
        assert.equal(model.bottomRightMedallion.kind, 'IMPULSION_ICON');
      } else if (model.specialCategory === 'INVERSION') {
        assert.equal(model.cornerBadge.symbol, 'LOOP');
        assert.equal(model.bottomRightMedallion.kind, 'LOOP');
      } else if (model.specialCategory === 'BOUCLIER') {
        assert.equal(model.cornerBadge.symbol, 'LOCK');
        assert.equal(model.bottomRightMedallion.kind, 'LOCK_ICON');
      }
    } else if (model.kind === 'UNIVERSAL_SPECIAL') {
      assert.equal(model.cornerBadge.kind, 'SPECIAL');
      assert.equal(model.topRightMedallion.kind, 'NEXUS_STAR');

      if (model.specialCategory === 'SURCHARGE') {
        assert.equal(model.cornerBadge.symbol, '+4');
        assert.equal(model.bottomRightMedallion.kind, 'SURCHARGE_PICKER_ICON');
      } else if (model.specialCategory === 'PORTAIL') {
        assert.equal(model.cornerBadge.symbol, 'INFINITY');
        assert.equal(model.bottomRightMedallion.kind, 'PORTAL_RING_ICON');
      }
    }
  }

  // Cas négatif 1 : orientation inversée à 180° sur une carte numérique
  const rotatedCatalog = cloneCatalog();
  const num0 = rotatedCatalog[0];
  assert.equal(num0.kind, 'NUMERIC');
  rotatedCatalog[0] = {
    ...num0,
    cornerBadge: { ...num0.cornerBadge, orientationDeg: 180 as unknown as 0 },
  };
  assert.equal(validateCatalog(rotatedCatalog).valid, false);

  // Cas négatif 2 : carte numérique portant LOOP en médaillon bas-droite
  const numericWithLoopCatalog = cloneCatalog();
  const num1 = numericWithLoopCatalog[0];
  assert.equal(num1.kind, 'NUMERIC');
  numericWithLoopCatalog[0] = {
    ...num1,
    bottomRightMedallion: { kind: 'LOOP' } as unknown as typeof num1.bottomRightMedallion,
  };
  const loopCheck = validateCatalog(numericWithLoopCatalog);
  assert.equal(loopCheck.valid, false);
  assert.ok(loopCheck.errors.some((e) => e.includes('Invalid bottomRightMedallion')));

  // Cas négatif 3 : carte numérique portant NEXUS_STAR (violation Option 2)
  const numericWithStarCatalog = cloneCatalog();
  const num2 = numericWithStarCatalog[0];
  assert.equal(num2.kind, 'NUMERIC');
  numericWithStarCatalog[0] = {
    ...num2,
    topRightMedallion: { kind: 'NEXUS_STAR' } as unknown as typeof num2.topRightMedallion,
  };
  assert.equal(validateCatalog(numericWithStarCatalog).valid, false);

  // Cas négatif 4 : correspondance spéciale incohérente (IMPULSION avec médaillon LOCK_ICON)
  const badSpecialCatalog = cloneCatalog();
  const impIdx = badSpecialCatalog.findIndex((m) => m.variantId === 'AUBE_IMPULSION');
  const imp = badSpecialCatalog[impIdx];
  assert.equal(imp.kind, 'FAMILY_SPECIAL');
  badSpecialCatalog[impIdx] = {
    ...imp,
    bottomRightMedallion: { kind: 'LOCK_ICON' },
  };
  const badSpecialCheck = validateCatalog(badSpecialCatalog);
  assert.equal(badSpecialCheck.valid, false);
  assert.ok(badSpecialCheck.errors.some((e) => e.includes('Invalid badge/medallion mapping on IMPULSION')));
});

test('CAT-07: barème de points officiel du catalogue (0-9 / 20 / 50) et rejet des barèmes altérés', () => {
  for (const model of NUMERIC_CARD_MODELS) {
    assert.equal(model.pointValue, model.value);
  }
  for (const model of FAMILY_SPECIAL_CARD_MODELS) {
    assert.equal(model.pointValue, 20);
  }
  for (const model of UNIVERSAL_SPECIAL_CARD_MODELS) {
    assert.equal(model.pointValue, 50);
  }

  // Cas négatif : barème corrompu sur une carte spéciale familiale (25 pts au lieu de 20)
  const badPointsCatalog = cloneCatalog();
  const invIdx = badPointsCatalog.findIndex((m) => m.variantId === 'ONDE_INVERSION');
  const inv = badPointsCatalog[invIdx];
  assert.equal(inv.kind, 'FAMILY_SPECIAL');
  badPointsCatalog[invIdx] = {
    ...inv,
    pointValue: 25 as unknown as 20,
  };
  const pointsCheck = validateCatalog(badPointsCatalog);
  assert.equal(pointsCheck.valid, false);
  assert.ok(pointsCheck.errors.some((e) => e.includes('Expected 20 points')));
});

test('CAT-08: paquet initial de 158 cartes, répartition exacte, capacité 2 à 6 joueurs et recalcul dynamique', () => {
  assert.equal(NEXUS_DEFAULT_CONFIG.animation.batchCompletionTimeoutMs, BATCH_COMPLETION_TIMEOUT_MS);
  assert.equal(BATCH_COMPLETION_TIMEOUT_MS, 1500);

  const deck = buildDeck(NEXUS_DEFAULT_CONFIG);
  assert.equal(calculateDeckSize(NEXUS_DEFAULT_CONFIG), 158);
  assert.equal(deck.length, 158);
  assert.equal(calculateDeckSize(NEXUS_DEFAULT_CONFIG), deck.length);

  assert.equal(new Set(deck.map((c) => c.instanceId)).size, 158);

  for (const family of FAMILY_IDS) {
    const familyNumeric = deck.filter((c) => {
      const m = CARD_CATALOG_BY_ID[c.variantId];
      return m.kind === 'NUMERIC' && m.family === family;
    });
    assert.equal(familyNumeric.length, 19);

    assert.equal(deck.filter((c) => c.variantId === `${family}_0`).length, 1);
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      assert.equal(deck.filter((c) => c.variantId === `${family}_${v}`).length, 2);
    }

    for (const cat of FAMILY_SPECIAL_CATEGORIES) {
      assert.equal(deck.filter((c) => c.variantId === `${family}_${cat}`).length, 2);
    }
  }

  assert.equal(deck.filter((c) => c.variantId === 'UNIVERSAL_SURCHARGE').length, 4);
  assert.equal(deck.filter((c) => c.variantId === 'UNIVERSAL_PORTAIL').length, 4);

  const maxInitialNeeded =
    NEXUS_DEFAULT_CONFIG.match.maxPlayers * NEXUS_DEFAULT_CONFIG.match.initialHandSize + 1;
  assert.ok(deck.length >= maxInitialNeeded);
  const numericCount = deck.filter((c) => CARD_CATALOG_BY_ID[c.variantId].kind === 'NUMERIC').length;
  assert.ok(numericCount >= 1);

  const customConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      numericPerFamily: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.numericPerFamily,
        0: 2,
      },
      universalSpecials: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.universalSpecials,
        PORTAIL: 6,
      },
    },
  };
  const customDeck = buildDeck(customConfig);
  assert.equal(calculateDeckSize(customConfig), 166);
  assert.equal(customDeck.length, 166);

  // Cas négatif : paquet trop petit pour distribuer 7 cartes à 6 joueurs + 1 défausse numérique
  const insufficientConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      numericPerFamily: {
        0: 1,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
      },
      familySpecialsPerFamily: {
        IMPULSION: 0,
        INVERSION: 0,
        BOUCLIER: 0,
      },
      universalSpecials: {
        SURCHARGE: 0,
        PORTAIL: 0,
      },
    },
  };
  const insufficientCheck = validateDeckConfig(insufficientConfig);
  assert.equal(insufficientCheck.valid, false);
  assert.ok(insufficientCheck.errors.some((e) => e.includes('insufficient')));
  assert.throws(() => buildDeck(insufficientConfig));
});

test('CAT-09: validateDeckConfig rejette négatifs, flottants, NaN, Infinity, clés manquantes et clés hors 0-9', () => {
  const negativeConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      numericPerFamily: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.numericPerFamily,
        3: -1,
      },
    },
  };
  assert.equal(validateDeckConfig(negativeConfig).valid, false);
  assert.throws(() => buildDeck(negativeConfig));

  const floatConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      universalSpecials: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.universalSpecials,
        PORTAIL: 2.5,
      },
    },
  };
  assert.equal(validateDeckConfig(floatConfig).valid, false);
  assert.throws(() => buildDeck(floatConfig));

  const nanConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      familySpecialsPerFamily: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.familySpecialsPerFamily,
        BOUCLIER: Number.NaN,
      },
    },
  };
  assert.equal(validateDeckConfig(nanConfig).valid, false);
  assert.throws(() => calculateDeckSize(nanConfig));

  const infConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      universalSpecials: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.universalSpecials,
        SURCHARGE: Number.POSITIVE_INFINITY,
      },
    },
  };
  assert.equal(validateDeckConfig(infConfig).valid, false);
  assert.throws(() => buildDeck(infConfig));

  const extraKeyConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      numericPerFamily: {
        ...NEXUS_DEFAULT_CONFIG.deckQuantities.numericPerFamily,
        [10 as unknown as 0]: 1,
      },
    },
  };
  assert.equal(validateDeckConfig(extraKeyConfig).valid, false);
  assert.throws(() => buildDeck(extraKeyConfig));

  const missingKeyNumeric = { ...NEXUS_DEFAULT_CONFIG.deckQuantities.numericPerFamily } as Record<
    number,
    number
  >;
  delete missingKeyNumeric[9];
  const missingKeyConfig: NexusGameConfig = {
    ...NEXUS_DEFAULT_CONFIG,
    deckQuantities: {
      ...NEXUS_DEFAULT_CONFIG.deckQuantities,
      numericPerFamily: missingKeyNumeric as NexusGameConfig['deckQuantities']['numericPerFamily'],
    },
  };
  assert.equal(validateDeckConfig(missingKeyConfig).valid, false);
  assert.throws(() => buildDeck(missingKeyConfig));
});
