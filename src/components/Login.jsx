import { useState } from 'react';
import { login } from '../api/auth.js';

export default function Login({ onLogin, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    const result = await login(username.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onLogin(result);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'linear-gradient(180deg, rgba(13,27,42,.85), rgba(10,18,12,.9))',
        border: '1px solid rgba(212,168,87,.35)', borderRadius: 16,
        padding: '44px 36px', boxShadow: '0 0 50px rgba(200,155,60,.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 22, color: '#d4a857', letterSpacing: '.08em', textShadow: '0 0 24px rgba(212,168,87,.4)' }}>
            ENTRAR
          </div>
          <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 13, color: '#7a6a45', marginTop: 10 }}>
            acesse com sua conta Lendas &amp; Batalhas
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>
              USUÁRIO OU E-MAIL
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                padding: '12px 14px', borderRadius: 6,
                background: 'rgba(10,18,12,.8)', border: '1px solid rgba(212,168,87,.3)',
                color: '#e8d5a8', fontFamily: "'Lora', serif", fontSize: 13,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,168,87,.7)'}
              onBlur={e => e.target.style.borderColor = 'rgba(212,168,87,.3)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>
              SENHA
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                padding: '12px 14px', borderRadius: 6,
                background: 'rgba(10,18,12,.8)', border: '1px solid rgba(212,168,87,.3)',
                color: '#e8d5a8', fontFamily: "'Lora', serif", fontSize: 13,
                outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,168,87,.7)'}
              onBlur={e => e.target.style.borderColor = 'rgba(212,168,87,.3)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 6,
              background: 'rgba(200,77,42,.1)', border: '1px solid rgba(200,77,42,.35)',
              fontFamily: "'Lora', serif", fontSize: 12, color: '#e8a890',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              marginTop: 6, padding: '13px 0', borderRadius: 8,
              background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 50%, #8a5d1f 95%)',
              border: '1.5px solid #f5d27a', color: '#0b1612',
              fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 10, letterSpacing: '.16em',
              cursor: loading ? 'wait' : (!username.trim() || !password ? 'not-allowed' : 'pointer'),
              opacity: (!username.trim() || !password) ? .5 : 1,
              transition: 'opacity .2s',
              boxShadow: 'inset 0 -2px 6px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,240,200,.5)',
            }}
          >
            {loading ? 'ENTRANDO…' : 'ENTRAR COM CONTA L&B'}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href="https://lendasebatalhas.com.br/minha-conta/"
            target="_blank"
            rel="noreferrer"
            style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#8ac46a', letterSpacing: '.08em', textDecoration: 'none' }}
          >
            Criar conta →
          </a>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontFamily: "'Cinzel', serif", fontSize: 11, color: '#5a5040', letterSpacing: '.08em', cursor: 'pointer' }}
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
