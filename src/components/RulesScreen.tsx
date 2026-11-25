import React from 'react';
import { ArrowLeft, Layers, Play, ShieldAlert, Zap } from 'lucide-react';
import { FAMILIES } from '../catalog/families';
import type { CardVariantId } from '../catalog/types';
import { FamilyEmblemGlyph, NexusCard } from '../graphics';
import type { AppScreen } from '../types/app';
import { NavigationShell } from './NavigationShell';
import { NexusChamferButton, NexusChromePanel, useNexusUi } from './ui';

export interface RulesScreenProps {
  readonly onNavigate: (screen: AppScreen) => void;
  readonly returnToTableAvailable: boolean;
}

const SPECIAL_CARDS_INFO: ReadonlyArray<{
  readonly name: string;
  readonly scope: string;
  readonly previewVariantId: CardVariantId;
  readonly effect: string;
  readonly playRule: string;
}> = [
  {
    name: 'IMPULSION (+2)',
    scope: 'Carte spéciale de famille (2 par famille)',
    previewVariantId: 'AUBE_IMPULSION',
    effect: 'Le joueur suivant pioche 2 cartes et passe son tour.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Impulsion.',
  },
  {
    name: 'INVERSION (LOOP)',
    scope: 'Carte spéciale de famille (2 par famille)',
    previewVariantId: 'BRAISE_INVERSION',
    effect:
      'Inverse le sens de rotation de la table. À 2 joueurs, agit comme un blocage et vous rejouez immédiatement.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Inversion.',
  },
  {
    name: 'BOUCLIER (LOCK)',
    scope: 'Carte spéciale de famille (2 par famille)',
    previewVariantId: 'ONDE_BOUCLIER',
    effect: 'Bloque le joueur suivant qui perd son tour.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Bouclier.',
  },
  {
    name: 'PORTAIL (∞)',
    scope: 'Carte universelle (4 dans le paquet)',
    previewVariantId: 'UNIVERSAL_PORTAIL',
    effect: 'Jouable à tout moment. Vous choisissez librement la nouvelle famille active.',
    playRule: 'Déclenche une résonance cosmique sur la famille choisie.',
  },
  {
    name: 'SURCHARGE (+4)',
    scope: 'Carte universelle (4 dans le paquet)',
    previewVariantId: 'UNIVERSAL_SURCHARGE',
    effect:
      'Vous choisissez la nouvelle famille active ; le joueur suivant pioche 4 cartes et passe son tour.',
    playRule: 'Jouable uniquement si vous ne possédez aucune carte de la famille active.',
  },
];

export function RulesScreen({
  onNavigate,
  returnToTableAvailable,
}: RulesScreenProps): React.ReactElement {
  const { animationLevel, glowEnabled } = useNexusUi();
  const isOff = animationLevel === 'OFF';
  const effectiveGlow = glowEnabled && !isOff;

  return (
    <NavigationShell
      currentScreen="RULES"
      title="Règles officielles de NEXUS"
      subtitle="Structure des 158 cartes, compatibilité de jeu, pouvoirs spéciaux et conditions de victoire."
      onNavigate={onNavigate}
    >
      <div className="space-y-7">
        {/* Trois piliers fondamentaux */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <NexusChromePanel tone="chrome" chamfer="md" innerClassName="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
              <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
                1. Composition du paquet
              </h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
              <li>6 familles cosmiques officielles.</li>
              <li>Valeurs numériques strictes de 0 à 9 uniquement (60 modèles).</li>
              <li>1 exemplaire de 0 et 2 exemplaires de 1 à 9 par famille (114 numériques).</li>
              <li>36 spéciales de famille et 8 cartes universelles (158 cartes au total).</li>
            </ul>
          </NexusChromePanel>

          <NexusChromePanel tone="cyan" chamfer="md" innerClassName="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
              <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
                2. Jouer ou piocher
              </h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
              <li>7 cartes distribuées à chaque joueur au départ.</li>
              <li>
                Une carte numérique est jouable si elle correspond à la famille active ou à la
                dernière valeur numérique jouée.
              </li>
              <li>
                Si aucune carte n’est jouable, vous devez piocher 1 carte (jouable immédiatement si
                compatible).
              </li>
              <li>Aucun cumul d’attaques (+2/+4) n’est actif par défaut.</li>
            </ul>
          </NexusChromePanel>

          <NexusChromePanel tone="champagne" chamfer="md" innerClassName="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 text-[#F5DEB3]" aria-hidden="true" />
              <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
                3. Déclaration NEXUS et fin
              </h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-300">
              <li>
                Annoncez NEXUS lorsque vous passez à 1 carte (ou en pré-déclaration à 2 cartes).
              </li>
              <li>
                Un oubli signalé par un adversaire entraîne une pénalité immédiate de 2 cartes.
              </li>
              <li>
                La partie se termine dès qu’un joueur vide sa main ou si la pioche est épuisée
                (décompte au plus petit nombre de cartes puis points : 0–9, 20 spéciale, 50
                universelle).
              </li>
            </ul>
          </NexusChromePanel>
        </section>

        {/* Les 6 familles officielles */}
        <NexusChromePanel tone="chrome" chamfer="lg" innerClassName="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
              Les six familles officielles
            </h2>
            <span className="text-xs font-semibold tracking-wider text-[#F5DEB3] uppercase">
              Identifiables même sans lueur
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {FAMILIES.map((family) => (
              <div
                key={family.id}
                className="flex items-center gap-3 border bg-[#040917]/95 p-3.5 nexus-chamfer-sm"
                style={{ borderColor: `${family.primaryColor}55` }}
              >
                <svg viewBox="-46 -46 92 92" className="h-10 w-10 shrink-0" aria-hidden="true">
                  <FamilyEmblemGlyph
                    family={family.id}
                    color={family.primaryColor}
                    accentColor={family.secondaryColor}
                  />
                </svg>
                <div className="min-w-0">
                  <div
                    className="truncate font-['Outfit'] text-sm font-extrabold tracking-wide"
                    style={{ color: family.secondaryColor }}
                  >
                    {family.displayName}
                  </div>
                  <div className="text-xs text-slate-400">Valeurs 0–9</div>
                </div>
              </div>
            ))}
          </div>
        </NexusChromePanel>

        {/* Les 5 cartes spéciales */}
        <NexusChromePanel tone="chrome" chamfer="lg" innerClassName="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-['Outfit'] text-lg font-extrabold text-white">
              Les 5 cartes spéciales
            </h2>
            <span className="text-xs text-slate-400">
              Quantités fixes définies dans le catalogue officiel
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {SPECIAL_CARDS_INFO.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-4 border border-slate-800/90 bg-[#040917]/95 p-4 nexus-chamfer-sm"
              >
                <div className="shrink-0">
                  <NexusCard
                    variantId={item.previewVariantId}
                    size="xs"
                    glowEnabled={effectiveGlow}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="font-['Outfit'] text-sm font-extrabold tracking-wide text-sky-300">
                    {item.name}
                  </div>
                  <div className="text-[11px] font-semibold text-[#F5DEB3]">{item.scope}</div>
                  <p className="text-sm leading-relaxed text-slate-200">{item.effect}</p>
                  <p className="text-xs text-slate-400">{item.playRule}</p>
                </div>
              </div>
            ))}
          </div>
        </NexusChromePanel>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {returnToTableAvailable ? (
            <NexusChamferButton
              variant="primary"
              onClick={() => onNavigate('TABLE')}
              animationLevel={animationLevel}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Retour à la table</span>
            </NexusChamferButton>
          ) : null}
          <NexusChamferButton
            variant={returnToTableAvailable ? 'secondary' : 'primary'}
            onClick={() => onNavigate('SOLO_SETUP')}
            animationLevel={animationLevel}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Lancer une partie Solo</span>
          </NexusChamferButton>
        </div>
      </div>
    </NavigationShell>
  );
}
