export default function NPCCard({ npc, onPlay }) {
  const isWon = npc.state === 'won';
  const isAvailable = npc.state === 'available';
  const isLocked = npc.state === 'locked';

  const borderColor = isLocked ? '#2a3328' : (isAvailable ? '#f5d27a' : npc.color);
  const topShade = isLocked ? '#181f1a' : npc.accent;
  const portraitLight = npc.color + '55';
  const monoColor = isLocked ? '#3a3a32' : npc.color;
  const ornament = isLocked ? '#2a3328' : (isAvailable ? '#f5d27a' : '#5a5040');
  const tagColor = isLocked ? '#5a5040' : npc.color;
  const nameColor = isLocked ? '#7a7068' : '#e8d5a8';
  const flavorColor = isLocked ? '#5a5040' : '#a89870';
  const idTag = String(npc.id).slice(-4);

  return (
    <div
      className={`npc-card${isLocked ? ' locked' : ''}`}
      style={{
        position: 'relative', height: '100%', minHeight: 420,
        background: `linear-gradient(180deg, ${topShade} 0%, #0b1612 100%)`,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 14, overflow: 'hidden',
        boxShadow: isAvailable
          ? '0 0 0 1px rgba(245,210,122,.3), 0 8px 24px rgba(0,0,0,.5), inset 0 0 24px rgba(212,168,87,.15)'
          : isWon ? '0 6px 18px rgba(0,0,0,.5), inset 0 0 18px rgba(200,155,60,.08)'
          : '0 4px 12px rgba(0,0,0,.4)',
        filter: isLocked ? 'grayscale(0.85) brightness(0.55)' : 'none',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        animation: isAvailable ? 'pulseGold 2.4s ease-in-out infinite' : 'none',
      }}
      onClick={() => isAvailable && onPlay(npc.id)}
    >
      {/* Ornamentos dos cantos */}
      {['tl','tr','bl','br'].map(pos => (
        <div key={pos} style={{
          position: 'absolute',
          top: pos.startsWith('t') ? 0 : 'auto',
          bottom: pos.startsWith('b') ? 0 : 'auto',
          left: pos.endsWith('l') ? 0 : 'auto',
          right: pos.endsWith('r') ? 0 : 'auto',
          width: 38, height: 38, pointerEvents: 'none',
          borderTop: pos.startsWith('t') ? `2px solid ${ornament}` : 'none',
          borderBottom: pos.startsWith('b') ? `2px solid ${ornament}` : 'none',
          borderLeft: pos.endsWith('l') ? `2px solid ${ornament}` : 'none',
          borderRight: pos.endsWith('r') ? `2px solid ${ornament}` : 'none',
          borderTopLeftRadius: pos === 'tl' ? 13 : 0,
          borderTopRightRadius: pos === 'tr' ? 13 : 0,
          borderBottomLeftRadius: pos === 'bl' ? 13 : 0,
          borderBottomRightRadius: pos === 'br' ? 13 : 0,
        }} />
      ))}

      {/* Retrato */}
      <div style={{
        position: 'relative', height: 225, overflow: 'hidden',
        borderBottom: `1px solid ${borderColor}`,
        background: `radial-gradient(ellipse at 50% 35%, ${portraitLight} 0%, ${npc.portrait} 55%, #0b1612 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .45, background: 'repeating-linear-gradient(112deg, rgba(0,0,0,.18) 0 2px, transparent 2px 8px), repeating-linear-gradient(68deg, rgba(255,240,200,.05) 0 1px, transparent 1px 6px)' }} />
        {npc.imagem_url && (
          <img src={npc.imagem_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', opacity: isLocked ? 0.5 : 0.85, mixBlendMode: 'luminosity' }} />
        )}
        <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: '62%', height: '75%', background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.35) 70%, rgba(0,0,0,.65) 100%)', borderRadius: '50% 50% 12% 12%' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 88, color: monoColor, opacity: npc.imagem_url ? 0 : .85, textShadow: `0 4px 20px rgba(0,0,0,.7), 0 0 30px ${monoColor}88`, letterSpacing: '-.04em' }}>{npc.initial}</div>
        </div>
        {/* Tag de tema */}
        <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 8px', background: 'rgba(11,22,18,.7)', border: `1px solid ${tagColor}55`, borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, letterSpacing: '.18em', color: tagColor, textTransform: 'uppercase' }}>▶ {npc.theme}</div>

        {/* Cadeado */}
        {isLocked && (
          <div style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(11,22,18,.85)', border: '1.5px solid #5a5040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 11, borderRadius: 2, background: '#5a5040', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 9, height: 8, border: '1.5px solid #5a5040', borderBottom: 'none', borderRadius: '5px 5px 0 0' }} />
            </div>
          </div>
        )}
        {/* Badge disponível */}
        {isAvailable && (
          <div style={{ position: 'absolute', top: 10, right: 10, padding: '5px 10px', background: 'linear-gradient(180deg, #f5d27a, #c89b3c)', border: '1px solid #f5d27a', borderRadius: 14, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 9, letterSpacing: '.22em', color: '#0b1612', boxShadow: '0 0 14px rgba(245,210,122,.6)' }}>⚡ AGORA</div>
        )}
        {/* Selo de vitória */}
        {isWon && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,22,18,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 40%, #6b4a16 100%)', border: '3px solid #f5d27a', boxShadow: '0 0 28px rgba(200,155,60,.7), inset 0 -6px 16px rgba(0,0,0,.4), inset 0 6px 14px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)' }}>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, color: '#0b1612', letterSpacing: '.2em' }}>VENCIDO</div>
              <div style={{ fontSize: 30, margin: '2px 0', color: '#0b1612' }}>✦</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#3a2510', letterSpacing: '.08em' }}>{npc.date}</div>
            </div>
          </div>
        )}
      </div>

      {/* Faixa de cor */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${borderColor} 30%, ${borderColor} 70%, transparent)` }} />

      {/* Corpo */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, height: 'calc(100% - 228px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 17, color: nameColor, letterSpacing: '.04em', lineHeight: 1.1 }}>{npc.name}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a5040', letterSpacing: '.1em' }}>#{idTag}</div>
        </div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.45, color: flavorColor, flex: 1 }}>"{npc.flavor}"</div>
        <div style={{ marginTop: 'auto' }}>
          {isLocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(20,28,22,.6)', border: '1px solid #2a3328', borderRadius: 6 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#5a5040', letterSpacing: '.12em' }}>VENÇA O ANTERIOR</div>
            </div>
          )}
          {isAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(npc.id); }}
              style={{ width: '100%', padding: 10, background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 45%, #8a5d1f 95%)', border: '1.5px solid #f5d27a', borderRadius: 6, fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 12, letterSpacing: '.2em', color: '#0b1612', boxShadow: '0 0 18px rgba(245,210,122,.4), inset 0 -2px 6px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,240,200,.6)', textShadow: '0 1px 0 rgba(255,240,200,.4)' }}
            >⚔ ENFRENTAR</button>
          )}
          {isWon && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', background: 'rgba(40,30,12,.6)', border: '1px solid rgba(200,155,60,.35)', borderRadius: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#c89b3c', letterSpacing: '.12em' }}>CONQUISTADO</span>
              <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: '#a89870' }}>revisitar →</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
