import { CARD_CATALOG_BY_ID } from '../catalog/cards';
import { FAMILIES_BY_ID } from '../catalog/families';
import type { GameEvent, PlayerView } from '../engine/gameTypes';

function getPlayerName(view: PlayerView, playerId: string): string {
  if (view.self.id === playerId) return view.self.name;
  const opp = view.opponents.find((o) => o.id === playerId);
  return opp?.name ?? playerId;
}

export function formatPublicEventsForFeed(
  events: readonly GameEvent[],
  view: PlayerView,
): readonly string[] {
  const lines: string[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case 'GAME_STARTED': {
        lines.push(
          `Partie lancée · Famille initiale : ${FAMILIES_BY_ID[ev.payload.activeFamily].displayName}`,
        );
        break;
      }
      case 'CARD_PLAYED': {
        const name = getPlayerName(view, ev.payload.playerId);
        const model = CARD_CATALOG_BY_ID[ev.payload.card.variantId];
        const cardLabel =
          model.kind === 'NUMERIC'
            ? `${FAMILIES_BY_ID[model.family].displayName} ${model.value}`
            : model.family
              ? `${FAMILIES_BY_ID[model.family].displayName} ${model.specialCategory}`
              : model.specialCategory;
        lines.push(`${name} joue ${cardLabel}`);
        break;
      }
      case 'CARD_DRAWN': {
        if (!ev.payload.isPenalty) {
          const name = getPlayerName(view, ev.payload.playerId);
          lines.push(`${name} pioche ${ev.payload.count} carte`);
        }
        break;
      }
      case 'ATTACK_PENALTY_APPLIED': {
        const target = getPlayerName(view, ev.payload.targetPlayerId);
        lines.push(
          `${ev.payload.source} : ${target} pioche ${ev.payload.actualCount} carte(s)`,
        );
        break;
      }
      case 'DIRECTION_REVERSED': {
        lines.push(
          ev.payload.actedAsSkipTwoPlayers
            ? 'Inversion (2 joueurs) : votre adversaire passe son tour'
            : `Sens inversé (${ev.payload.direction === 1 ? 'horaire' : 'anti-horaire'})`,
        );
        break;
      }
      case 'PLAYER_SKIPPED': {
        if (ev.payload.reason === 'BOUCLIER') {
          const skipped = getPlayerName(view, ev.payload.skippedPlayerId);
          lines.push(`Bouclier : ${skipped} est bloqué`);
        }
        break;
      }
      case 'FAMILY_CHANGED': {
        const name = getPlayerName(view, ev.payload.playerId);
        lines.push(
          `${name} choisit la famille ${FAMILIES_BY_ID[ev.payload.newFamily].displayName}`,
        );
        break;
      }
      case 'NEXUS_DECLARED': {
        const name = getPlayerName(view, ev.payload.playerId);
        lines.push(`${name} déclare NEXUS !`);
        break;
      }
      case 'NEXUS_PENALTY_REPORTED': {
        const reporter = getPlayerName(view, ev.payload.reporterId);
        const target = getPlayerName(view, ev.payload.targetPlayerId);
        lines.push(
          `${reporter} signale ${target} (+${ev.payload.actualCount} cartes)`,
        );
        break;
      }
      case 'DISCARD_RECYCLED': {
        lines.push(`Défausse recyclée (${ev.payload.recycledCount} cartes)`);
        break;
      }
      case 'GAME_OVER': {
        lines.push('Fin de partie');
        break;
      }
      default:
        break;
    }
  }

  return lines;
}
