export default function PlantSlot({ card, side, onZoom, onZoomOut }) {
  const filled = !!card;
  const oculta = filled && side === 'npc' && card.oculta;

  return (
    <div
      onClick={() => filled && !oculta && onZoom && onZoom(card)}
      onMouseEnter={() => filled && !oculta && onZoom && onZoom(card)}
      onMouseLeave={() => onZoomOut && onZoomOut()}
      style={{
        position: 'relative', width: '100%', height: '100%', borderRadius: 6,
        border: filled ? `1px solid ${side === 'npc' ? 'rgba(200,77,42,.4)' : 'rgba(90,138,74,.5)'}` : '1px dashed rgba(212,168,87,.18)',
        background: filled
          ? (side === 'npc' ? 'linear-gradient(180deg, #2a1818, #1a1212)' : 'linear-gradient(180deg, #1f2e1a, #131e10)')
          : 'rgba(11,22,18,.4)',
        boxShadow: filled ? '0 2px 6px rgba(0,0,0,.5)' : 'inset 0 1px 3px rgba(0,0,0,.4)',
        overflow: 'hidden',
        cursor: filled && !oculta ? 'pointer' : 'default',
        transition: 'transform .15s, filter .15s',
      }}
      onMouseOver={e => { if (filled && !oculta) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
    >
      {filled ? (
        oculta ? (
          /* Verso da carta (face oculta) */
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'repeating-linear-gradient(125deg, rgba(0,0,0,.18) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 35%, #1a2a1a, #0b1612)' }}>
            <img src="https://lendasebatalhas.com.br/wp-content/uploads/2021/02/cardback.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: .9 }} />
          </div>
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `repeating-linear-gradient(125deg, rgba(0,0,0,.18) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 35%, ${side === 'npc' ? '#2a3a1a' : '#1a3a1a'}, #0b1612 70%)` }}>
              {card.imagem_url && (
                <img src={card.imagem_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: .9 }} />
              )}
              {!card.imagem_url && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 26, color: '#5a8a4a', opacity: .55 }}>{(card.name[0] || '?').toUpperCase()}</div>}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.65)', fontFamily: "'Cinzel', serif", fontSize: 9, lineHeight: 1.2, color: '#e8d5a8', textAlign: 'center', padding: '2px 4px', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
            {/* Status badges */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
              {card.paralisada && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,80,200,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#c8d0ff', fontWeight: 700, letterSpacing: '.06em' }}>PARALISADO</span>
                </div>
              )}
              {card.arruinada && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(200,100,0,.88)', padding: '1px 0' }}>
                  <span style={{ display: 'block', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#fff8e8', letterSpacing: '.06em', fontWeight: 700 }}>ARRUINADO</span>
                </div>
              )}
            </div>
          </>
        )
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .35 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.15em', color: '#7a6a45' }}>PLANTA</div>
        </div>
      )}
    </div>
  );
}
