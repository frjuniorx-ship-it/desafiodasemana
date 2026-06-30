export default function UtilSlot({ kind, count, filled, side }) {
  const isFolc = kind === 'folc';
  const acaoColor = side === 'npc' ? '#c84d2a' : '#5a8a4a';
  const acaoColor2 = side === 'npc' ? '#8a3a1a' : '#3a6a3a';
  const bg = side === 'npc'
    ? 'linear-gradient(180deg, rgba(58,30,30,.6), rgba(26,14,14,.4))'
    : 'linear-gradient(180deg, rgba(26,46,34,.6), rgba(15,31,23,.4))';

  return (
    <div style={{ width: 58, height: 62, borderRadius: 5, padding: 3, border: '1px solid rgba(212,168,87,.3)', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.3)' }}>
      {isFolc ? (
        <>
          <div style={{ position: 'relative', width: 30, height: 30 }}>
            <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-8deg)', background: 'linear-gradient(135deg, #6a3a1a, #3a1e0e)', border: '1px solid #a85040', borderRadius: 3 }} />
            <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-2deg) translate(2px, 1px)', background: 'linear-gradient(135deg, #8a4a2a, #4a261a)', border: '1px solid #c86040', borderRadius: 3 }} />
            <div style={{ position: 'absolute', inset: 0, transform: 'rotate(4deg) translate(4px, 2px)', background: 'linear-gradient(135deg, #a85040, #6a3020)', border: '1px solid #e87060', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, color: '#fae0c0' }}>{count ?? 0}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.15em', color: '#c89b3c' }}>FOLCLÓR</div>
        </>
      ) : filled ? (
        <>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `conic-gradient(from 0deg, ${acaoColor} 0deg, ${acaoColor2} 180deg, ${acaoColor} 360deg)`, border: '1.5px solid #f5d27a', boxShadow: `0 0 10px ${acaoColor}88`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#0b1612' }}>∞</div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.12em', color: '#c89b3c' }}>AÇÃO</div>
        </>
      ) : (
        <>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px dashed rgba(212,168,87,.3)' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.12em', color: '#5a5040' }}>AÇÃO</div>
        </>
      )}
    </div>
  );
}
