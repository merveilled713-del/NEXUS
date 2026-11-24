import React, { useMemo, useState } from 'react';
import { CARD_CATALOG } from '../catalog/cards';
import { FAMILIES } from '../catalog/families';
import type { CardVariantId, FamilyId } from '../catalog/types';
import { NEXUS_DEFAULT_CONFIG } from '../config/nexus.config';
import { NexusCard, NexusCardBack, resolveCardVisualSpec } from '../graphics';
import type { AppScreen, NexusProgressionStats } from '../types/app';
import { NavigationShell } from './NavigationShell';

type CollectionFilter = 'ALL' | FamilyId | 'UNIVERSAL';

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
  const [filter, setFilter] = useState<CollectionFilter>('ALL');
  const [selectedVariant, setSelectedVariant] = useState<CardVariantId>('ONDE_7');

  const visibleModels = useMemo(() => {
    if (filter === 'ALL') return CARD_CATALOG;
    if (filter === 'UNIVERSAL') {
      return CARD_CATALOG.filter((m) => m.kind === 'UNIVERSAL_SPECIAL');
    }
    return CARD_CATALOG.filter((m) => m.family === filter);
  }, [filter]);

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

  return (
    <NavigationShell
      currentScreen="COLLECTION"
      title={`Collection des cartes (${CARD_CATALOG.length} variantes officielles)`}
      subtitle="Explorez les 60 modèles numériques (0–9), les 18 spéciales familiales, les 2 universelles et le dos officiel."
      onNavigate={onNavigate}
    >
      <div className="space-y-8">
        {/* Inspecteur de carte sélectionnée + dos officiel */}
        <section className="grid grid-cols-1 gap-6 rounded-xl border border-slate-800 bg-[#0A1022] p-6 lg:grid-cols-12">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:col-span-5">
            <NexusCard
              variantId={selectedModel.variantId}
              size="lg"
              glowEnabled={glowEnabled}
            />
            <div className="flex flex-col items-center gap-2">
              <NexusCardBack size="sm" glowEnabled={glowEnabled} />
              <span className="text-xs text-slate-400">Dos officiel</span>
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
            <div className="space-y-2">
              <div className="text-xs font-semibold tracking-wider text-sky-400 uppercase">
                {selectedSpec.theme.displayName} · {selectedModel.kind}
              </div>
              <h2 className="font-['Outfit'] text-2xl font-bold text-white">
                {selectedSpec.headerLabel} ({selectedSpec.topLeftInsert.label})
              </h2>
              <p className="text-sm text-slate-300">
                Identifiant catalogue : <span className="font-mono">{selectedModel.variantId}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-slate-800 py-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-400">Exemplaires / paquet</div>
                <div className="mt-1 text-lg font-bold text-white tabular-nums">
                  {deckCopyCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Points fin de partie</div>
                <div className="mt-1 text-lg font-bold text-white tabular-nums">
                  {selectedModel.pointValue}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Jouée en Solo</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {discoveredSet.has(selectedModel.variantId) ? 'Oui' : 'Pas encore'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Variantes jouées</div>
                <div className="mt-1 text-lg font-bold text-white tabular-nums">
                  {stats.variantsDiscovered.length} / {CARD_CATALOG.length}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onToggleGlow}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                  glowEnabled
                    ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {glowEnabled ? 'Effets lumineux : Activés' : 'Effets lumineux : Désactivés'}
              </button>
              <span className="text-xs text-slate-400">
                Cliquez sur n’importe quelle carte ci-dessous pour l’inspecter.
              </span>
            </div>
          </div>
        </section>

        {/* Filtres et grille */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-['Outfit'] text-lg font-bold text-white tabular-nums">
              Variantes affichées ({visibleModels.length} / {CARD_CATALOG.length})
            </h2>

            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0A1022] p-1">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filter === 'ALL'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Toutes (80)
              </button>
              {FAMILIES.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => setFilter(family.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    filter === family.id
                      ? 'bg-sky-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {family.displayName}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilter('UNIVERSAL')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  filter === 'UNIVERSAL'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Universelles (2)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {visibleModels.map((model) => (
              <div
                key={model.variantId}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-800/80 bg-[#090E1D] p-3"
              >
                <NexusCard
                  variantId={model.variantId}
                  size="fill"
                  glowEnabled={glowEnabled}
                  selected={selectedModel.variantId === model.variantId}
                  onClick={() => setSelectedVariant(model.variantId)}
                />
                <div className="w-full truncate text-center text-xs font-medium text-slate-300">
                  {model.variantId}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </NavigationShell>
  );
}
