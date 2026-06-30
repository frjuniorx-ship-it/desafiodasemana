import { authGet, post } from './client.js';

export function getProgresso(token) {
  return authGet('/progresso', token);
}

export function registrarResultado(npc_id, resultado, token) {
  return post('/progresso', { npc_id, resultado }, token);
}

export function usarRevanche(npc_id, token) {
  return post('/revanche/usar', { npc_id }, token);
}
