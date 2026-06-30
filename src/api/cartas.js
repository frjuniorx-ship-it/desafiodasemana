import { get } from './client.js';
import { adaptarCarta } from './adapter.js';

export async function getCartas(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await get(`/cartas${qs ? '?' + qs : ''}`);
  return data.map(adaptarCarta);
}

// Busca por nome exato (case-insensitive).
// A API não tem endpoint de busca pública por nome, então filtra localmente.
export async function getCartaByNome(nome) {
  const cartas = await getCartas();
  const alvo = nome.toLowerCase();
  return cartas.find(c => c.nome.toLowerCase() === alvo) ?? null;
}
