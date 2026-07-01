import { get } from './client.js';
import { adaptarCarta } from './adapter.js';

let _cache = null;

export async function getCartas(params = {}) {
  if (_cache) return _cache;
  const qs = new URLSearchParams(params).toString();
  const data = await get(`/cartas${qs ? '?' + qs : ''}`);
  _cache = data.map(adaptarCarta);
  return _cache;
}

// Busca por nome exato (case-insensitive).
// A API não tem endpoint de busca pública por nome, então filtra localmente.
export async function getCartaByNome(nome) {
  const cartas = await getCartas();
  const alvo = nome.toLowerCase();
  return cartas.find(c => c.nome.toLowerCase() === alvo) ?? null;
}
