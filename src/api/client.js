const BASE_URL = 'https://lendasebatalhas.com.br/wp-json/lendas/v1';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erro ${res.status} em ${path}`);
  }

  return res.json();
}

export function get(path) {
  return apiFetch(path);
}

export function authGet(path, token) {
  return apiFetch(path, {
    headers: { Authorization: `Basic ${token}` },
  });
}

export function post(path, body, token) {
  return apiFetch(path, {
    method: 'POST',
    headers: token ? { Authorization: `Basic ${token}` } : {},
    body: JSON.stringify(body),
  });
}
