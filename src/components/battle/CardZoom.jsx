const CAT_MAP = {
  'Personagem': { c1: '#5a8a4a', c2: '#1f5a2a', g: 'P' },
  'Histórica':  { c1: '#5a8a4a', c2: '#1f5a2a', g: 'H' },
  'Apoio':      { c1: '#a8c8e8', c2: '#2a5a88', g: 'AP' },
  'Fera':       { c1: '#c84d2a', c2: '#6a2a1a', g: 'F' },
  'Planta':     { c1: '#8ac46a', c2: '#3a6a2a', g: '❀' },
  'Folclórica': { c1: '#e8a890', c2: '#8a3a1a', g: 'F' },
  'Ação':       { c1: '#a8c8e8', c2: '#2a5a88', g: 'A' },
};

export default function CardZoom({ card }) {
  if (!card) {
    return (
      <div style={{ height: '100%', padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c89b3c', boxShadow: '0 0 6px #c89b3c' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>ZOOM DE CARTA</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, opacity: .5, border: '1.5px dashed rgba(212,168,87,.25)', borderRadius: 8, padding: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid rgba(212,168,87,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 24, color: '#7a6a45' }}>⌖</div>
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", fontStyle: 'italic', fontSize: 12, color: '#7a6a45', textAlign: 'center', letterSpacing: '.1em' }}>passe o cursor sobre uma carta no campo</div>
        </div>
      </div>
    );
  }

  const cat = card.category || card.categoria || 'Personagem';
  const cm = CAT_MAP[cat] || CAT_MAP['Personagem'];
  const rarity = card.rarity || 2;
  const cardName = card.name || card.nome || '';
  const initial = (cardName[0] || '?').toUpperCase();
  const stars = '★'.repeat(rarity);
  const imgUrl = card.imagem_url || card.imagemUrl || '';
  const atk = card.atk ?? card.ataque ?? null;
  const def = card.def ?? card.defesa ?? null;

  return (
    <div style={{ height: '100%', padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0, animation: 'zoomIn .28s ease-out', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c89b3c', boxShadow: '0 0 6px #c89b3c' }} />
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>ZOOM DE CARTA</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Moldura dourada */}
        <div style={{ borderRadius: 8, padding: 5, background: 'linear-gradient(135deg, #f5d27a 0%, #c89b3c 30%, #6b4a16 70%, #c89b3c 100%)', boxShadow: '0 6px 18px rgba(0,0,0,.5), inset 0 0 8px rgba(0,0,0,.3)', flexShrink: 0 }}>
          <div style={{ background: 'linear-gradient(180deg, #1a2e22 0%, #0d1b13 100%)', borderRadius: 5, padding: 8, position: 'relative', overflow: 'hidden' }}>
            {/* Glifo de categoria */}
            <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${cm.c1}, ${cm.c2})`, border: '1.5px solid #f5d27a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, color: '#0b1612', boxShadow: '0 0 8px rgba(0,0,0,.5)' }}>{cm.g}</div>

            {/* Header */}
            <div style={{ paddingRight: 30 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: cm.c1, letterSpacing: '.2em', textTransform: 'uppercase' }}>{cat.toUpperCase()}</div>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 16, color: '#e8d5a8', letterSpacing: '.04em', lineHeight: 1.1, marginTop: 2 }}>{cardName}</div>
            </div>

            {/* Ilustração */}
            <div style={{ marginTop: 8, aspectRatio: '5/7', borderRadius: 4, border: '1px solid rgba(212,168,87,.3)', position: 'relative', overflow: 'hidden', background: `repeating-linear-gradient(118deg, rgba(0,0,0,.18) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 30%, ${cm.c1}88, ${cm.c2} 70%, #0b1612)` }}>
              {imgUrl
                ? <img src={imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 56, color: cm.c1, opacity: .7, textShadow: '0 2px 12px rgba(0,0,0,.7)' }}>{initial}</div>
              }
              <div style={{ position: 'absolute', bottom: 5, left: 6, display: 'flex', gap: 2 }}><span style={{ color: '#f5d27a', fontSize: 10, textShadow: '0 0 3px rgba(0,0,0,.8)' }}>{stars}</span></div>
              {card.cost != null && <div style={{ position: 'absolute', top: 5, left: 6, width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a, #6b4a16)', border: '1.5px solid #f5d27a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 12, color: '#0b1612', boxShadow: '0 0 6px rgba(0,0,0,.5)' }}>{card.cost}</div>}
            </div>

            {/* Stats */}
            {atk != null && (
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, padding: '6px 0', borderTop: '1px solid rgba(212,168,87,.25)', borderBottom: '1px solid rgba(212,168,87,.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#e8a890', fontSize: 14 }}>★</span>
                  <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 16, color: '#e8d5a8' }}>{atk}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#7a6a45', letterSpacing: '.1em' }}>ATQ</span>
                </div>
                <div style={{ width: 1, background: 'rgba(212,168,87,.2)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#a8c8e8', fontSize: 14 }}>◆</span>
                  <span style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 16, color: '#e8d5a8' }}>{def}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#7a6a45', letterSpacing: '.1em' }}>DEF</span>
                </div>
              </div>
            )}
            {card.nd != null && (
              <div style={{ marginTop: 8, padding: '6px 0', borderTop: '1px solid rgba(212,168,87,.25)', borderBottom: '1px solid rgba(212,168,87,.25)', textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#a89870', letterSpacing: '.18em' }}>NÍVEL DE DIFICULDADE</div>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 18, color: '#d4a857', marginTop: 2 }}>{card.nd}</div>
              </div>
            )}

            {/* Efeito */}
            <div style={{ marginTop: 8, fontFamily: "'Lora', serif", fontSize: 11, lineHeight: 1.45, color: '#e8d5a8' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, color: '#c89b3c', letterSpacing: '.08em' }}>EFEITO · </span>{card.effect}
            </div>
          </div>
        </div>

        {/* Lore */}
        {card.lore && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(11,22,18,.5)', borderLeft: '2px solid #c89b3c', borderRadius: '0 4px 4px 0', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#7a6a45', letterSpacing: '.2em', marginBottom: 3 }}>HISTÓRIA</div>
            <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, lineHeight: 1.45, color: '#a89870' }}>{card.lore}</div>
          </div>
        )}
      </div>
    </div>
  );
}
