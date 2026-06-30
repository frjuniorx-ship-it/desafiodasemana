import { get } from './client.js';
import { adaptarCarta } from './adapter.js';

export function getDesafios() {
  return get('/desafios');
}

export async function getDesafioById(id) {
  const npc = await get(`/desafios/${id}`);
  if (Array.isArray(npc.deck)) {
    npc.deck = npc.deck.map(entrada => ({
      ...entrada,
      carta: adaptarCarta(entrada),
    }));
  }
  return npc;
}

export function getSeasonAtual() {
  return get('/season/atual');
}
