export default function SmallSlot({ label, count, faceUp, cardName }) {
  const firstChar = (cardName || '?')[0].toUpperCase();
  return (
    <div style={{ width: 44, height: 62, position: 'relative' }}>
      {!faceUp ? (
        <>
          <div style={{ position: 'absolute', left: -2, top: 2, right: 2, bottom: -2, background: 'linear-gradient(135deg, #2a1e0e, #0f0a04)', border: '1px solid #5a3a16', borderRadius: 4 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.3), transparent 60%), linear-gradient(135deg, #3a2510, #1a0f06)', border: '1px solid #c89b3c', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, border: '1px solid #c89b3c', borderRadius: '50% 50% 50% 8%', transform: 'rotate(-8deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 4, borderRadius: '50%', background: '#d4a857' }} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: '#d4a857', marginTop: 3 }}>{count}</div>
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(118deg, rgba(0,0,0,.18) 0 2px, transparent 2px 7px), linear-gradient(180deg, #2a3a22, #131e10)', border: '1px solid rgba(212,168,87,.45)', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 3 }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 18, color: '#d4a857', opacity: .8, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>{firstChar}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#a89870', letterSpacing: '.05em', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardName}</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: -12, left: 0, right: 0, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#7a6a45', letterSpacing: '.2em' }}>{label}</div>
    </div>
  );
}
