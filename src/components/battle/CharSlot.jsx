export default function CharSlot({ card, side, selected, attacking, selectable, onSelect, onZoom, onZoomOut }) {
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
  if (selectable && filled) {
    border = '2px solid #f5d27a';
    boxShadow = '0 0 20px rgba(245,210,122,.8), 0 0 8px rgba(245,210,122,.5), inset 0 0 12px rgba(212,168,87,.3)';
    background = side === 'npc' ? 'linear-gradient(180deg, #3a2010, #221212)' : background;
  }

  const initial = card ? (card.name[0] || '?').toUpperCase() : '';

  return (
    <div
      onClick={() => {
        if (filled && selectable && onSelect) { onSelect(card); return; }
        if (filled && onZoom) onZoom(card);
      }}
      onMouseEnter={() => filled && onZoom && onZoom(card)}
      onMouseLeave={() => onZoomOut && onZoomOut()}
      style={{
        position: 'relative', width: '100%', height: '100%', borderRadius: 6,
        border, background, boxShadow,
        overflow: 'hidden',
        cursor: selectable && filled ? 'crosshair' : filled ? 'pointer' : 'default',
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
            {!card.imagem_url && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 26, color: accentColor, opacity: .55, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{initial}</div>}
            {attacking && <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 2px #c84d2a, inset 0 0 14px rgba(200,77,42,.5)', borderRadius: 4 }} />}
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.65)', fontFamily: "'Cinzel', serif", fontSize: 9, lineHeight: 1.2, color: '#e8d5a8', textAlign: 'center', padding: '2px 4px', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
          {card.equipamentos?.length > 0 && (
            <div
              onMouseEnter={() => onZoom && onZoom(card.equipamentos[0])}
              onMouseLeave={() => onZoom && onZoom(card)}
              style={{
                position: 'absolute', bottom: 14, left: 2,
                width: '35%', aspectRatio: '5/7',
                background: 'linear-gradient(135deg, #1e2e1e, #0f1e10)',
                border: '1px solid rgba(212,168,87,.7)',
                borderRadius: 3,
                boxShadow: '2px -2px 6px rgba(0,0,0,.6), 0 0 6px rgba(212,168,87,.2)',
                overflow: 'hidden',
                cursor: 'pointer', zIndex: 2,
              }}
            >
              {card.equipamentos[0].imagem_url
                ? <img src={card.equipamentos[0].imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Cinzel Decorative', serif", fontSize: 10, color: '#d4a857' }}>{(card.equipamentos[0].name?.[0] || '?').toUpperCase()}</div>
              }
            </div>
          )}
          {/* Stats column — right side, full height, pointer-events: none */}
          <div style={{ position: 'absolute', inset: 0, right: 0, left: 'auto', width: 22, pointerEvents: 'none', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
            {(card.pc ?? 0) > 0 && (
              <div style={{ flex: 1, background: 'rgba(160,110,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#fff8a0', fontWeight: 900, lineHeight: 1 }}>{card.pc}</span>
              </div>
            )}
            <div style={{ flex: 1, background: 'rgba(30,70,180,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#c8e0ff', fontWeight: 900, lineHeight: 1 }}>{card.atqAtual ?? card.atk ?? 0}</span>
            </div>
            <div style={{ flex: 1, background: 'rgba(180,40,30,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#ffc8c8', fontWeight: 900, lineHeight: 1 }}>{card.defAtual ?? card.def ?? 0}</span>
            </div>
            {card.paralisado && (
              <div style={{ flex: 1, background: 'rgba(60,80,200,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#c8d0ff', fontWeight: 700 }}>PAR</span>
              </div>
            )}
            {card.imobilizado && (
              <div style={{ flex: 1, background: 'rgba(90,20,160,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#d0b0ff', fontWeight: 700 }}>IMO</span>
              </div>
            )}
            {card.arruinada && (
              <div style={{ flex: 1, background: 'rgba(200,100,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#fff8e8', fontWeight: 700 }}>ARR</span>
              </div>
            )}
            {card.furiaBonus > 0 && (
              <div style={{ flex: 1, background: 'rgba(160,110,0,.9)', borderLeft: '1px solid #f5d27a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#fff8a0', fontWeight: 700 }}>FÚR</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .35 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.15em', color: '#7a6a45' }}>PERSONAGEM</div>
        </div>
      )}
    </div>
  );
}
