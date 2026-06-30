export default function ChatBubble({ msg }) {
  const { kind, text } = msg;

  if (kind === 'player') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <div style={{ maxWidth: '82%', padding: '7px 10px', borderRadius: '10px 10px 2px 10px', background: 'linear-gradient(180deg, rgba(200,155,60,.18), rgba(138,93,31,.18))', border: '1px solid rgba(212,168,87,.5)', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.2em', color: '#d4a857', marginBottom: 2 }}>AURÉLIO</div>
        <div style={{ fontFamily: "'Lora', serif", fontSize: 12, lineHeight: 1.4, color: '#f5e6c0' }}>{text}</div>
      </div>
    </div>
  );

  if (kind === 'ai') return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
      <div style={{ maxWidth: '82%', padding: '7px 10px', borderRadius: '10px 10px 10px 2px', background: 'linear-gradient(180deg, rgba(90,138,74,.18), rgba(31,90,42,.2))', border: '1px solid rgba(90,138,74,.5)', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.2em', color: '#8ac46a', marginBottom: 2 }}>LENDAS · IA</div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, lineHeight: 1.4, color: '#d8efc4' }}>{text}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div style={{ maxWidth: '82%', padding: '7px 10px', borderRadius: 4, background: 'rgba(11,22,18,.5)', border: '1px solid rgba(212,168,87,.18)', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.2em', color: '#5a5040', marginBottom: 2 }}>AÇÃO</div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, lineHeight: 1.4, color: '#a89870' }}>{text}</div>
      </div>
    </div>
  );
}
