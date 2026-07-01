export default function CharSlot({ card, side, selected, attacking, onZoom, onZoomOut }) {
  const filled = !!card;
  const accentColor = side === 'npc' ? '#c84d2a' : '#5a8a4a';
  const portraitLight = side === 'npc' ? '#5a2a1a' : '#3a5a2a';
  const portraitDark = side === 'npc' ? '#2a1010' : '#162a14';

  let border = '1px dashed rgba(212,168,87,.18)';
  let background = 'rgba(11,22,18,.4)';
  let boxShadow = 'inset 0 1px 3px rgba(0,0,0,.4)';

  if (filled) {
    border = `1px solid ${side === 'npc' ? 'rgba(200,77,42,.4)' : 'rgba(90,138,74,.5)'}`;
    background = side === 'npc' ? 'linear-gradient(180deg, #2a1818, #1a1212)' : 'linear-gradient(180deg, #1f2e1a, #131e10)';
    boxShadow = '0 2px 6px rgba(0,0,0,.5)';
  }
  if (selected) {
    border = '1.5px solid #f5d27a';
    boxShadow = '0 0 14px rgba(245,210,122,.5), inset 0 0 10px rgba(212,168,87,.2)';
  }

  const initial = card ? (card.name[0] || '?').toUpperCase() : '';

  return (
    <div
      onClick={() => filled && onZoom && onZoom(card)}
      onMouseEnter={() => filled && onZoom && onZoom(card)}
      onMouseLeave={() => onZoomOut && onZoomOut()}
      style={{
        position: 'relative', aspectRatio: '5/7', width: '100%', borderRadius: 6,
        border, background, boxShadow,
        overflow: 'hidden',
        cursor: filled ? 'pointer' : 'default',
        transition: 'transform .15s, filter .15s',
      }}
      onMouseOver={e => { if (filled) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
    >
      {filled ? (
        <>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `repeating-linear-gradient(125deg, rgba(0,0,0,.18) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 35%, ${portraitLight}, ${portraitDark} 70%, #0b1612)` }}>
            {card.imagem_url && (
              <img src={card.imagem_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: .9 }} />
            )}
            <div style={{ position: 'absolute', top: 3, left: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: accentColor, opacity: .9, textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>★{card.atk ?? 0}</div>
            <div style={{ position: 'absolute', top: 3, right: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#a8c8e8', opacity: .9, textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>◆{card.def ?? 0}</div>
            {!card.imagem_url && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 26, color: accentColor, opacity: .55, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{initial}</div>}
            {attacking && <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 2px #c84d2a, inset 0 0 14px rgba(200,77,42,.5)', borderRadius: 4 }} />}
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.65)', fontFamily: "'Cinzel', serif", fontSize: 9, lineHeight: 1.2, color: '#e8d5a8', textAlign: 'center', padding: '2px 4px', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .35 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.15em', color: '#7a6a45' }}>PERSONAGEM</div>
        </div>
      )}
    </div>
  );
}
