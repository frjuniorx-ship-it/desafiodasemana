import { useState, useEffect, useRef } from 'react';
import { getProgresso, postAvatar } from '../api/progresso.js';

export default function Perfil({ user, onLogout, onBack }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    getProgresso(user.token)
      .then(d => {
        setDados(d);
        if (d.avatar_url) setAvatarUrl(d.avatar_url);
      })
      .catch(e => console.error('[Perfil] erro ao carregar progresso:', e.message))
      .finally(() => setLoading(false));
  }, [user.token]);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg('Enviando…');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await postAvatar(ev.target.result, user.token);
        setAvatarUrl(res.avatar_url);
        setUploadMsg('Avatar atualizado!');
      } catch {
        setUploadMsg('Erro ao enviar imagem.');
      }
    };
    reader.readAsDataURL(file);
  }

  const initial = (user.user_display_name || user.user_email || '?')[0].toUpperCase();
  const npcVencidos = dados?.npcs_vencidos ?? [];
  const titulos = dados?.titulos ?? [];
  const seasonTotal = dados?.season_total ?? 0;
  const tokens = dados?.tokens_revanche ?? 0;

  return (
    <main style={{ padding: '32px 24px 80px', maxWidth: 720, margin: '0 auto' }}>

      {/* Cabeçalho do perfil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, padding: '24px 28px', background: 'linear-gradient(180deg, rgba(13,27,42,.7), rgba(10,18,12,.6))', border: '1px solid rgba(212,168,87,.3)', borderRadius: 14, boxShadow: '0 0 30px rgba(200,155,60,.1)' }}>
        {/* Avatar com upload */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileRef.current?.click()}
            title="Clique para trocar a foto"
            style={{
              width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid #c89b3c', boxShadow: '0 0 18px rgba(200,155,60,.4)',
              background: 'linear-gradient(135deg, #d4a857, #8a5d1f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 32, color: '#0b1612' }}>{initial}</span>
            }
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#1a2e22', border: '1.5px solid #c89b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer', color: '#d4a857' }}
          >✎</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 20, color: '#e8d5a8', letterSpacing: '.06em' }}>
            {user.user_display_name || user.user_email}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#7a6a45', marginTop: 5, letterSpacing: '.1em' }}>
            {user.user_email}
          </div>
          {uploadMsg && (
            <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: uploadMsg.includes('Erro') ? '#e8a890' : '#8ac46a', marginTop: 8 }}>{uploadMsg}</div>
          )}
        </div>

        <button
          onClick={onLogout}
          style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 6, background: 'rgba(200,77,42,.08)', border: '1px solid rgba(200,77,42,.4)', color: '#c84d2a', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '.14em', cursor: 'pointer' }}
        >
          SAIR
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: "'Cinzel', serif", fontSize: 13, color: '#7a6a45', letterSpacing: '.2em', animation: 'pulseGold 1.8s ease-in-out infinite' }}>
          CARREGANDO EXPEDIÇÃO…
        </div>
      )}

      {dados && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Progresso da season */}
          <Section title="PROGRESSO DA SEASON">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 32, color: '#d4a857', lineHeight: 1 }}>
                {npcVencidos.length}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#5a5040' }}>
                / {seasonTotal || '—'} NPCs derrotados
              </span>
              {tokens > 0 && (
                <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#a8c8e8', letterSpacing: '.1em' }}>
                  ⚡ {tokens} {tokens === 1 ? 'revanche' : 'revanches'}
                </span>
              )}
            </div>
            {seasonTotal > 0 && (
              <div style={{ height: 8, background: '#0a1219', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(212,168,87,.15)', position: 'relative' }}>
                <div style={{ width: `${Math.min(100, Math.round((npcVencidos.length / seasonTotal) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, #6b4a16, #c89b3c, #f5d27a)', borderRadius: 3, transition: 'width .6s ease', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,240,200,.4), transparent)', animation: 'shimmerLine 2.6s linear infinite' }} />
                </div>
              </div>
            )}
          </Section>

          {/* Títulos */}
          {titulos.length > 0 && (
            <Section title="TÍTULOS CONQUISTADOS">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {titulos.map((t, i) => (
                  <div key={i} style={{ padding: '5px 14px', borderRadius: 20, background: 'rgba(212,168,87,.08)', border: '1px solid rgba(212,168,87,.3)', fontFamily: "'Cinzel', serif", fontSize: 11, color: '#d4a857', letterSpacing: '.08em' }}>
                    ★ {t}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* NPCs vencidos */}
          {npcVencidos.length > 0 && (
            <Section title="GUARDIÕES DERROTADOS">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {npcVencidos.map((n, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'rgba(10,18,12,.5)', borderRadius: 6, border: '1px solid rgba(90,138,74,.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#8ac46a', boxShadow: '0 0 6px #8ac46a', flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: '#e8d5a8' }}>
                        {n.titulo ?? `NPC #${n.npc_id}`}
                      </span>
                    </div>
                    {n.data && (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a5040' }}>
                        {new Date(n.data).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {npcVencidos.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 13, color: '#5a5040' }}>
              Nenhum guardião derrotado ainda. Que a batalha comece!
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 36, textAlign: 'center' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', fontFamily: "'Cinzel', serif", fontSize: 11, color: '#5a5040', letterSpacing: '.1em', cursor: 'pointer' }}
        >
          ← Voltar aos Desafios
        </button>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.6), rgba(10,18,12,.5))', border: '1px solid rgba(212,168,87,.2)', borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.24em', color: '#7a6a45', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
