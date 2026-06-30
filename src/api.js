const BASE = 'https://lendasebatalhas.com.br/wp-json/lendas/v1';

export async function fetchDesafios() {
  const res = await fetch(`${BASE}/desafios`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function fetchDesafio(id) {
  const res = await fetch(`${BASE}/desafios/${id}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}
