export default function PlantSlot({ card, side, onZoom }) {
  const filled = !!card;
  return (
    <div
      onClick={() => filled && onZoom && onZoom(card)}
      onMouseEnter={() => filled && onZoom && onZoom(card)}
      style={{
        height: 58, borderRadius: 5, padding: '4px 6px',
        border: filled ? '1px solid rgba(90,138,74,.5)' : '1px dashed rgba(90,138,74,.2)',
        background: filled
          ? (side === 'npc' ? 'linear-gradient(180deg, #1f2e1a, #131e10)' : 'linear-gradient(180deg, #1a281a, #0f1a10)')
          : 'rgba(11,22,18,.4)',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.3)',
        cursor: filled ? 'pointer' : 'default',
        transition: 'filter .15s',
      }}
      onMouseOver={e => { if (filled) e.currentTarget.style.filter = 'brightness(1.15)'; }}
      onMouseOut={e => { e.currentTarget.style.filter = ''; }}
    >
      {filled ? (
        <>
          {card.imagem_url
            ? <img src={card.imagem_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', objectPosition: 'top center', borderRadius: 3, flexShrink: 0, border: '1px solid rgba(90,138,74,.5)' }} />
            : (
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #8ac46a, #3a6a2a)', border: '1px solid #5a8a4a', flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 6, height: 8, background: '#5a8a4a', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
              </div>
            )
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.18em', color: '#5a8a4a' }}>PLANTA</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: '#c8e8a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{card.name}</div>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.18em', color: '#5a5040', opacity: .6 }}>+ PLANTA</div>
      )}
    </div>
  );
}
