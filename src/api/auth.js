const JWT_URL = 'https://lendasebatalhas.com.br/wp-json/jwt-auth/v1/token';

export async function login(username, password) {
  try {
    const res = await fetch(JWT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.message ?? 'Credenciais inválidas' };
    const { token, user_email, user_display_name } = data;
    const user = { token, user_email, user_display_name };
    sessionStorage.setItem('lb_user', JSON.stringify(user));
    return user;
  } catch {
    return { error: 'Erro de conexão. Verifique sua internet.' };
  }
}

export function getUsuarioLogado() {
  try {
    const raw = sessionStorage.getItem('lb_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem('lb_user');
}
