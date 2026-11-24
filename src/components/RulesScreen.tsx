import React from 'react';
import { FAMILIES } from '../catalog/families';
import { FamilyEmblemGlyph } from '../graphics';
import type { AppScreen } from '../types/app';
import { NavigationShell } from './NavigationShell';

export interface RulesScreenProps {
  readonly onNavigate: (screen: AppScreen) => void;
  readonly returnToTableAvailable: boolean;
}

const SPECIAL_CARDS_INFO = [
  {
    name: 'IMPULSION (+2)',
    scope: 'Carte spéciale de famille (2 par famille)',
    effect: 'Le joueur suivant pioche 2 cartes et passe son tour.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Impulsion.',
  },
  {
    name: 'INVERSION (LOOP)',
    scope: 'Carte spéciale de famille (2 par famille)',
    effect:
      'Inverse le sens de rotation de la table. À 2 joueurs, agit comme un blocage et vous rejouez immédiatement.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Inversion.',
  },
  {
    name: 'BOUCLIER (LOCK)',
    scope: 'Carte spéciale de famille (2 par famille)',
    effect: 'Bloque le joueur suivant qui perd son tour.',
    playRule: 'Jouable sur la famille active ou sur une autre carte Bouclier.',
  },
  {
    name: 'PORTAIL (∞)',
    scope: 'Carte universelle (4 dans le paquet)',
    effect: 'Jouable à tout moment. Vous choisissez librement la nouvelle famille active.',
    playRule: 'Déclenche une résonance cosmique sur la famille choisie.',
  },
  {
    name: 'SURCHARGE (+4)',
    scope: 'Carte universelle (4 dans le paquet)',
    effect:
      'Vous choisissez la nouvelle famille active ; le joueur suivant pioche 4 cartes et passe son tour.',
    playRule: 'Jouable uniquement si vous ne possédez aucune carte de la famille active.',
  },
];

export function RulesScreen({
  onNavigate,
  returnToTableAvailable,
}: RulesScreenProps): React.ReactElement {
  return (
    <NavigationShell
      currentScreen="RULES"
      title="Règles officielles de NEXUS"
      subtitle="Structure des 158 cartes, compatibilité de jeu, pouvoirs spéciaux et conditions de victoire."
      onNavigate={onNavigate}
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">1. Composition du paquet</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>6 familles cosmiques officielles.</li>
              <li>Valeurs numériques strictes de 0 à 9 uniquement (60 modèles).</li>
              <li>1 exemplaire de 0 et 2 exemplaires de 1 à 9 par famille (114 cartes numériques).</li>
              <li>36 spéciales de famille et 8 cartes universelles (158 cartes au total).</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">2. Jouer ou piocher</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
            <h2 className="font-['Outfit'] text-lg font-bold text-white">
              3. Déclaration NEXUS et fin
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
          <h2 className="font-['Outfit'] text-lg font-bold text-white">Les six familles officielles</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {FAMILIES.map((family) => (
              <div
                key={family.id}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#050814] p-3"
              >
                <svg viewBox="-46 -46 92 92" className="h-9 w-9 shrink-0" aria-hidden="true">
                  <FamilyEmblemGlyph
                    family={family.id}
                    color={family.primaryColor}
                    accentColor={family.secondaryColor}
                  />
                </svg>
                <div>
                  <div className="text-sm font-bold text-white">{family.displayName}</div>
                  <div className="text-xs text-slate-400">Valeurs 0–9</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0A1022] p-6">
          <h2 className="font-['Outfit'] text-lg font-bold text-white">Les 5 cartes spéciales</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {SPECIAL_CARDS_INFO.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-slate-800 bg-[#050814] p-4"
              >
                <div className="text-sm font-bold text-sky-300">{item.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{item.scope}</div>
                <p className="mt-2 text-sm text-slate-200">{item.effect}</p>
                <p className="mt-1 text-xs text-slate-400">{item.playRule}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          {returnToTableAvailable ? (
            <button
              type="button"
              onClick={() => onNavigate('TABLE')}
              className="rounded-xl bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950"
            >
              Retour à la table
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onNavigate('SOLO_SETUP')}
            className="rounded-xl border border-slate-700 bg-[#0A1022] px-5 py-2.5 text-xs font-semibold text-white hover:border-sky-400"
          >
            Lancer une partie Solo
          </button>
        </div>
      </div>
    </NavigationShell>
  );
}
