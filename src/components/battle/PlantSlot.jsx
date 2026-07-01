export default function PlantSlot({ card, side, onZoom, onZoomOut }) {
  const filled = !!card;
  const oculta = filled && side === 'npc' && card.oculta;

  return (
    <div
      onClick={() => filled && !oculta && onZoom && onZoom(card)}
      onMouseEnter={() => filled && !oculta && onZoom && onZoom(card)}
      onMouseLeave={() => onZoomOut && onZoomOut()}
      style={{
        aspectRatio: '5/7', width: '100%', borderRadius: 5, overflow: 'hidden',
        border: filled ? '1px solid rgba(90,138,74,.5)' : '1px dashed rgba(90,138,74,.2)',
        background: filled
          ? (side === 'npc' ? 'linear-gradient(180deg, #1f2e1a, #131e10)' : 'linear-gradient(180deg, #1a281a, #0f1a10)')
          : 'rgba(11,22,18,.4)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.3)',
        cursor: filled && !oculta ? 'pointer' : 'default',
        transition: 'filter .15s', position: 'relative',
      }}
      onMouseOver={e => { if (filled && !oculta) e.currentTarget.style.filter = 'brightness(1.15)'; }}
      onMouseOut={e => { e.currentTarget.style.filter = ''; }}
    >
      {filled ? (
        oculta ? (
          /* Verso da carta (face oculta) */
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <img src="https://lendasebatalhas.com.br/wp-content/uploads/2021/02/cardback.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              {card.imagem_url
                ? <img src={card.imagem_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #8ac46a, #3a6a2a)', border: '1px solid #5a8a4a', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 8, height: 10, background: '#5a8a4a', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
                    </div>
                  </div>
                )
              }
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2px 3px', background: 'rgba(0,0,0,.55)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, letterSpacing: '.15em', color: '#5a8a4a' }}>PLANTA</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: '#c8e8a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
            </div>
          </>
        )
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.15em', color: '#5a5040', opacity: .6 }}>+ PLANTA</div>
      )}
    </div>
  );
}
