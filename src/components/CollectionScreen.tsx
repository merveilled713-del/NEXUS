import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Sparkles } from 'lucide-react';
import { CARD_CATALOG } from '../catalog/cards';
import { FAMILIES } from '../catalog/families';
import type { CardVariantId, FamilyId } from '../catalog/types';
import { calculateDeckSize, NEXUS_DEFAULT_CONFIG } from '../config/nexus.config';
import { NexusCard, NexusCardBack, resolveCardVisualSpec } from '../graphics';
import type { AppScreen, NexusProgressionStats } from '../types/app';
import { NavigationShell } from './NavigationShell';
import {
  NexusChamferButton,
  NexusChromePanel,
  NexusModalShell,
  useNexusUi,
} from './ui';

type CollectionFamilyFilter = 'ALL' | FamilyId | 'UNIVERSAL';
type CollectionTypeFilter = 'ALL' | 'NUMERIC' | 'SPECIAL';

export interface CollectionScreenProps {
  readonly glowEnabled: boolean;
  readonly stats: NexusProgressionStats;
  readonly onToggleGlow: () => void;
  readonly onNavigate: (screen: AppScreen) => void;
}

export function CollectionScreen({
  glowEnabled,
  stats,
  onToggleGlow,
  onNavigate,
}: CollectionScreenProps): React.ReactElement {
  const { animationLevel } = useNexusUi();
  const isOff = animationLevel === 'OFF';
  const effectiveGlow = glowEnabled && !isOff;

  const [familyFilter, setFamilyFilter] = useState<CollectionFamilyFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<CollectionTypeFilter>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<CardVariantId>('ONDE_7');
  const [zoomOpen, setZoomOpen] = useState(false);

  const totalDeckCards = useMemo(() => calculateDeckSize(NEXUS_DEFAULT_CONFIG), []);

  const visibleModels = useMemo(() => {
    return CARD_CATALOG.filter((model) => {
      if (familyFilter === 'UNIVERSAL' && model.kind !== 'UNIVERSAL_SPECIAL') {
        return false;
      }
      if (
        familyFilter !== 'ALL' &&
        familyFilter !== 'UNIVERSAL' &&
        model.family !== familyFilter
      ) {
        return false;
      }
      if (typeFilter === 'NUMERIC' && model.kind !== 'NUMERIC') {
        return false;
      }
      if (typeFilter === 'SPECIAL' && model.kind === 'NUMERIC') {
        return false;
      }
      return true;
    });
  }, [familyFilter, typeFilter]);

  const selectedModel = useMemo(
    () => CARD_CATALOG.find((m) => m.variantId === selectedVariant) ?? CARD_CATALOG[0],
    [selectedVariant],
  );
  const selectedSpec = useMemo(
    () => resolveCardVisualSpec(selectedModel.variantId),
    [selectedModel.variantId],
  );

  const deckCopyCount = useMemo(() => {
    if (selectedModel.kind === 'NUMERIC') {
      return NEXUS_DEFAULT_CONFIG.deckQuantities.numericPerFamily[selectedModel.value];
    }
    if (selectedModel.kind === 'FAMILY_SPECIAL') {
      return NEXUS_DEFAULT_CONFIG.deckQuantities.familySpecialsPerFamily[
        selectedModel.specialCategory
      ];
    }
    return NEXUS_DEFAULT_CONFIG.deckQuantities.universalSpecials[
      selectedModel.specialCategory
    ];
  }, [selectedModel]);

  const discoveredSet = useMemo(
    () => new Set(stats.variantsDiscovered),
    [stats.variantsDiscovered],
  );

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen]);

  const kindLabel =
    selectedModel.kind === 'NUMERIC'
      ? 'Carte Numérique (0–9)'
      : selectedModel.kind === 'FAMILY_SPECIAL'
        ? 'Spéciale Familiale'
        : 'Spéciale Universelle';

  return (
    <NavigationShell
      currentScreen="COLLECTION"
      title={`Collection officielle (${CARD_CATALOG.length} variantes)`}
      subtitle={`Explorez les ${CARD_CATALOG.length} variantes du catalogue officiel réparties en ${totalDeckCards} exemplaires physiques dans le paquet, ainsi que le dos NEXUS.`}
      onNavigate={onNavigate}
    >
      <div className="space-y-7">
        {/* Inspecteur vitrine de la carte sélectionnée + dos officiel */}
        <NexusChromePanel
          tone="chrome"
          chamfer="lg"
          accentColor={effectiveGlow ? selectedSpec.theme.primaryColor : undefined}
          innerClassName="p-5 sm:p-7"
        >
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="flex flex-wrap items-center justify-center gap-5 lg:col-span-5">
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label={`Agrandir ${selectedSpec.theme.displayName} ${selectedSpec.headerLabel}`}
                className={`group relative rounded-[5%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-transform duration-150 hover:-translate-y-1'
                }`}
              >
                <NexusCard
                  variantId={selectedModel.variantId}
                  size="lg"
                  glowEnabled={effectiveGlow}
                />
              </button>

              <div className="flex flex-col items-center gap-2">
                <NexusCardBack size="sm" glowEnabled={effectiveGlow} />
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Dos officiel
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-5 lg:col-span-7">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.16em] uppercase">
                  <span style={{ color: selectedSpec.theme.secondaryColor }}>
                    {selectedSpec.theme.displayName}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-300">{kindLabel}</span>
                </div>
                <h2 className="font-['Outfit'] text-2xl font-extrabold text-white sm:text-3xl">
                  {selectedSpec.headerLabel} ({selectedSpec.topLeftInsert.label})
                </h2>
                <p className="text-xs text-slate-400">
                  Identifiant catalogue :{' '}
                  <span className="font-mono text-slate-200">{selectedModel.variantId}</span>
                </p>
              </div>

              {/* 4 compteurs réels */}
              <div className="grid grid-cols-2 gap-3 border-y border-slate-800/90 py-4 sm:grid-cols-4">
                <div className="border border-slate-800/80 bg-[#040917]/90 p-3 nexus-chamfer-sm">
                  <div className="text-[11px] font-medium text-slate-400">
                    Exemplaires / paquet
                  </div>
                  <div className="mt-1 font-['Outfit'] text-lg font-extrabold text-white tabular-nums">
                    {deckCopyCount} / {totalDeckCards}
                  </div>
                </div>

                <div className="border border-slate-800/80 bg-[#040917]/90 p-3 nexus-chamfer-sm">
                  <div className="text-[11px] font-medium text-slate-400">
                    Points fin de partie
                  </div>
                  <div className="mt-1 font-['Outfit'] text-lg font-extrabold text-[#F5DEB3] tabular-nums">
                    {selectedModel.pointValue} pts
                  </div>
                </div>

                <div className="border border-slate-800/80 bg-[#040917]/90 p-3 nexus-chamfer-sm">
                  <div className="text-[11px] font-medium text-slate-400">Jouée en Solo</div>
                  <div
                    className={`mt-1 font-['Outfit'] text-sm font-bold ${
                      discoveredSet.has(selectedModel.variantId)
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {discoveredSet.has(selectedModel.variantId) ? 'Oui' : 'Pas encore'}
                  </div>
                </div>

                <div className="border border-slate-800/80 bg-[#040917]/90 p-3 nexus-chamfer-sm">
                  <div className="text-[11px] font-medium text-slate-400">
                    Variantes jouées
                  </div>
                  <div className="mt-1 font-['Outfit'] text-lg font-extrabold text-sky-300 tabular-nums">
                    {stats.variantsDiscovered.length} / {CARD_CATALOG.length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <NexusChamferButton
                    variant="champagne"
                    onClick={() => setZoomOpen(true)}
                    animationLevel={animationLevel}
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                    <span>Inspecter en grand</span>
                  </NexusChamferButton>

                  <NexusChamferButton
                    variant={glowEnabled ? 'primary' : 'secondary'}
                    onClick={onToggleGlow}
                    animationLevel={animationLevel}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {glowEnabled
                        ? 'Effets lumineux : Activés'
                        : 'Effets lumineux : Désactivés'}
                    </span>
                  </NexusChamferButton>
                </div>

                <span className="text-xs text-slate-400">
                  Cliquez sur une carte ci-dessous pour la sélectionner.
                </span>
              </div>
            </div>
          </div>
        </NexusChromePanel>

        {/* Barre de filtres par famille et par type */}
        <section className="space-y-5">
          <NexusChromePanel tone="chrome" chamfer="md" innerClassName="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-['Outfit'] text-lg font-extrabold text-white tabular-nums">
                  Variantes affichées ({visibleModels.length} / {CARD_CATALOG.length})
                </h2>
                <p className="text-xs text-slate-400 tabular-nums">
                  60 numériques (0–9) · 18 spéciales familiales · 2 universelles ({totalDeckCards}{' '}
                  cartes physiques au total)
                </p>
              </div>

              {/* Filtre par type */}
              <div
                role="group"
                aria-label="Filtrer par type de carte"
                className="flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    { id: 'ALL', label: 'Tous types' },
                    { id: 'NUMERIC', label: 'Numériques (0–9)' },
                    { id: 'SPECIAL', label: 'Spéciales' },
                  ] as const
                ).map((item) => {
                  const active = typeFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTypeFilter(item.id)}
                      className={`min-h-[44px] border px-3.5 py-2 text-xs font-bold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                        isOff ? '' : 'transition-colors duration-150'
                      } ${
                        active
                          ? 'border-[#F5DEB3] bg-[#F5DEB3] text-slate-950'
                          : 'border-slate-700/80 bg-[#040917] text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtre par famille */}
            <div
              role="group"
              aria-label="Filtrer par famille"
              className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3.5"
            >
              <button
                type="button"
                onClick={() => setFamilyFilter('ALL')}
                className={`min-h-[44px] border px-3.5 py-2 text-xs font-bold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-colors duration-150'
                } ${
                  familyFilter === 'ALL'
                    ? 'border-sky-300 bg-sky-400 text-slate-950'
                    : 'border-slate-700/80 bg-[#040917] text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                Toutes (80)
              </button>

              {FAMILIES.map((family) => {
                const active = familyFilter === family.id;
                return (
                  <button
                    key={family.id}
                    type="button"
                    onClick={() => setFamilyFilter(family.id)}
                    className={`min-h-[44px] border px-3.5 py-2 text-xs font-bold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                      isOff ? '' : 'transition-colors duration-150'
                    } ${
                      active
                        ? 'border-sky-300 bg-sky-400 text-slate-950'
                        : 'border-slate-700/80 bg-[#040917] text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {family.displayName}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setFamilyFilter('UNIVERSAL')}
                className={`min-h-[44px] border px-3.5 py-2 text-xs font-bold whitespace-nowrap nexus-chamfer-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isOff ? '' : 'transition-colors duration-150'
                } ${
                  familyFilter === 'UNIVERSAL'
                    ? 'border-sky-300 bg-sky-400 text-slate-950'
                    : 'border-slate-700/80 bg-[#040917] text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                Universelles (2)
              </button>
            </div>
          </NexusChromePanel>

          {/* Grille des variantes */}
          {visibleModels.length === 0 ? (
            <NexusChromePanel tone="neutral" chamfer="md" innerClassName="p-8 text-center">
              <p className="text-sm text-slate-300">
                Aucune variante ne correspond à cette combinaison de filtres.
              </p>
            </NexusChromePanel>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleModels.map((model) => {
                const isSelected = selectedModel.variantId === model.variantId;
                const isDiscovered = discoveredSet.has(model.variantId);
                return (
                  <NexusChromePanel
                    key={model.variantId}
                    tone={isSelected ? 'cyan' : 'neutral'}
                    chamfer="sm"
                    innerClassName="flex flex-col items-center gap-2.5 p-3"
                  >
                    <NexusCard
                      variantId={model.variantId}
                      size="fill"
                      glowEnabled={effectiveGlow}
                      selected={isSelected}
                      onClick={() => setSelectedVariant(model.variantId)}
                    />
                    <div className="flex w-full items-center justify-between gap-1.5 text-[11px]">
                      <span className="truncate font-mono font-semibold text-slate-200">
                        {model.variantId}
                      </span>
                      {isDiscovered ? (
                        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          Jouée
                        </span>
                      ) : null}
                    </div>
                  </NexusChromePanel>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modale d'inspection grand format (NexusModalShell) */}
      {typeof document !== 'undefined'
        ? createPortal(
            <NexusModalShell
              open={zoomOpen}
              titleId="collection-zoom-title"
              eyebrow={selectedSpec.theme.displayName}
              title={`${selectedSpec.headerLabel} (${selectedSpec.topLeftInsert.label})`}
              subtitle={`${kindLabel} · ${selectedModel.variantId}`}
              tone="champagne"
              maxWidthClass="max-w-lg"
              onClose={() => setZoomOpen(false)}
              closeLabel="Fermer l'inspection"
              animationLevel={animationLevel}
            >
              <div className="flex flex-col items-center gap-5">
                <NexusCard
                  variantId={selectedModel.variantId}
                  size="xl"
                  glowEnabled={effectiveGlow}
                />
                <div className="grid w-full grid-cols-3 gap-2.5 text-center text-xs tabular-nums">
                  <div className="border border-slate-800 bg-[#040917] p-2.5 nexus-chamfer-sm">
                    <div className="text-slate-400">Paquet</div>
                    <div className="mt-0.5 font-bold text-white">
                      {deckCopyCount} / {totalDeckCards}
                    </div>
                  </div>
                  <div className="border border-slate-800 bg-[#040917] p-2.5 nexus-chamfer-sm">
                    <div className="text-slate-400">Valeur</div>
                    <div className="mt-0.5 font-bold text-[#F5DEB3]">
                      {selectedModel.pointValue} pts
                    </div>
                  </div>
                  <div className="border border-slate-800 bg-[#040917] p-2.5 nexus-chamfer-sm">
                    <div className="text-slate-400">Solo</div>
                    <div className="mt-0.5 font-bold text-white">
                      {discoveredSet.has(selectedModel.variantId) ? 'Jouée' : 'Inédite'}
                    </div>
                  </div>
                </div>
                <NexusChamferButton
                  variant="secondary"
                  fullWidth
                  onClick={() => setZoomOpen(false)}
                  animationLevel={animationLevel}
                >
                  Fermer l’aperçu
                </NexusChamferButton>
              </div>
            </NexusModalShell>,
            document.body,
          )
        : null}
    </NavigationShell>
  );
}
