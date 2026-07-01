export default function NPCHandCard({ card, revealed, onZoom }) {
  const initial = card && card.name !== '???' ? card.name[0].toUpperCase() : '?';

  return (
    <div
      style={{ width: '100%', aspectRatio: '5/7', position: 'relative', perspective: 600, cursor: revealed ? 'pointer' : 'default' }}
      onClick={() => revealed && onZoom && onZoom(card)}
      onMouseEnter={() => revealed && onZoom && onZoom(card)}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform .6s cubic-bezier(.4,.2,.2,1)' }}>
        {/* Verso */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', borderRadius: 5, overflow: 'hidden' }}>
          <img src="https://lendasebatalhas.com.br/wp-content/uploads/2021/02/cardback.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {/* Frente (revelada) */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 5, padding: 4, background: 'linear-gradient(180deg, #3a1e12 0%, #1a1010 100%)', border: '1.5px solid #c84d2a', boxShadow: '0 0 14px rgba(200,77,42,.4), 0 3px 8px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, borderRadius: 3, position: 'relative', overflow: 'hidden', background: 'repeating-linear-gradient(125deg, rgba(0,0,0,.2) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 35%, #8a3a1a, #2a1010 75%)' }}>
            {card?.imagem_url && (
              <img src={card.imagem_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: .88 }} />
            )}
            {!card?.imagem_url && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 22, color: '#e8a890', opacity: .85, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{initial}</div>}
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, lineHeight: 1.1, color: '#e8d5a8', textAlign: 'center', marginTop: 3, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card?.name || '???'}</div>
        </div>
      </div>
      {revealed && (
        <div style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle, #f5d27a, #8a5d1f)', border: '1px solid #f5d27a', boxShadow: '0 0 8px rgba(245,210,122,.6)' }} />
      )}
    </div>
  );
}
