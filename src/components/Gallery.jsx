import NPCCard from './NPCCard';
import { npcs } from '../data';

export default function Gallery({ onPlay }) {
  const wonCount = npcs.filter(n => n.state === 'won').length;
  const availableCount = npcs.filter(n => n.state === 'available').length;
  const lockedCount = npcs.filter(n => n.state === 'locked').length;
  const pct = Math.round((wonCount / npcs.length) * 100);

  return (
    <main style={{ padding: '28px 22px 60px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Título */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.4em', color: '#7a6a45', marginBottom: 10 }}>— SEMANA 23 · CICLO DA MATA ATLÂNTICA —</div>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 'clamp(28px, 5vw, 44px)', color: '#e8d5a8', letterSpacing: '.06em', textShadow: '0 2px 0 #0b1612, 0 0 24px rgba(200,155,60,.25)' }}>Desafio da Semana</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, #c89b3c)' }} />
          <span style={{ fontFamily: "'Cinzel', serif", fontStyle: 'italic', fontSize: 13, color: '#8a7a52', letterSpacing: '.08em' }}>enfrente os guardiões antes que a lua nova retorne</span>
          <span style={{ height: 1, width: 40, background: 'linear-gradient(90deg, #c89b3c, transparent)' }} />
        </div>
      </div>

      {/* Progresso */}
      <div style={{ margin: '28px auto 36px', maxWidth: 720, background: 'linear-gradient(180deg, rgba(13,27,42,.6), rgba(10,18,12,.6))', border: '1px solid rgba(212,168,87,.28)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.22em', color: '#d4a857', textTransform: 'uppercase' }}>Progresso da Expedição</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8a7a52' }}>
            <span style={{ color: '#d4a857', fontWeight: 600, fontSize: 14 }}>{wonCount}</span> vencidos ·{' '}
            <span style={{ color: '#e8d5a8' }}>{availableCount}</span> disponível ·{' '}
            <span style={{ color: '#5a5040' }}>{lockedCount}</span> bloqueados ·{' '}
            <span style={{ color: '#8a7a52' }}>/ {npcs.length}</span>
          </div>
        </div>
        {/* Barra */}
        <div style={{ height: 12, background: '#0a1219', borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid rgba(212,168,87,.15)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.6)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6b4a16 0%, #c89b3c 50%, #f5d27a 100%)', borderRadius: 5, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '30%', background: 'linear-gradient(90deg, transparent, rgba(255,240,200,.5), transparent)', animation: 'shimmerLine 2.6s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {npcs.map((_, i) => (
              <div key={i} style={{ flex: 1, borderRight: i < npcs.length - 1 ? '1px solid rgba(11,22,18,.6)' : 'none' }} />
            ))}
          </div>
        </div>
        {/* Recompensa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle, #f5d27a, #8a5d1f)', border: '1px solid #c89b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>★</div>
          <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, color: '#a89870' }}>
            Próxima recompensa: <span style={{ color: '#d4a857', fontStyle: 'normal', fontWeight: 600 }}>Carta Lendária — "Curupira dos Pinheirais"</span> ao vencer 5 NPCs
          </div>
        </div>
      </div>

      {/* Grid de NPCs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
        {npcs.map(npc => (
          <div key={npc.id} style={{ position: 'relative' }}>
            <NPCCard npc={npc} onPlay={onPlay} />
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{ textAlign: 'center', marginTop: 42, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#5a5040', letterSpacing: '.15em' }}>
        DESBLOQUEIA EM CADEIA · CADA VITÓRIA REVELA O PRÓXIMO GUARDIÃO
      </div>
    </main>
  );
}
