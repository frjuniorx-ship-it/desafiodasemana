import { bearerGet, bearerPost } from './client.js';

export function getProgresso(token) {
  return bearerGet('/progresso', token);
}

export function registrarResultado(npc_id, resultado, token) {
  return bearerPost('/progresso', { npc_id, resultado }, token);
}

export function usarRevanche(npc_id, token) {
  return bearerPost('/revanche/usar', { npc_id }, token);
}

export function postAvatar(imageBase64, token) {
  return bearerPost('/avatar', { image_base64: imageBase64 }, token);
}
