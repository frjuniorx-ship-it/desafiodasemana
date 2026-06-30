import { useState } from 'react';

export default function Header({ isBattle, onBack, breadcrumb }) {
  const [hoverBack, setHoverBack] = useState(false);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      padding: '18px 22px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid rgba(212,168,87,.18)',
      background: 'linear-gradient(180deg, rgba(10,18,12,.92), rgba(10,18,12,.7))',
      backdropFilter: 'blur(6px)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 42, height: 42, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 50%, #1f3326, #0d1b13 70%)',
          border: '1.5px solid #c89b3c', borderRadius: '50% 50% 50% 8%',
          boxShadow: '0 0 16px rgba(200,155,60,.4), inset 0 0 10px rgba(0,0,0,.6)',
          transform: 'rotate(-8deg)',
        }}>
          <div style={{
            width: 18, height: 9, borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, #f5d27a 0%, #c89b3c 45%, #6b4a16 90%)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 5, height: 5, background: '#0b1612', borderRadius: '50%',
            }} />
          </div>
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 13, letterSpacing: '.18em', color: '#d4a857', textShadow: '0 1px 0 rgba(0,0,0,.6)' }}>LENDAS</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '.32em', color: '#8a7a52', marginTop: 3 }}>&amp; BATALHAS</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 18, borderLeft: '1px solid rgba(212,168,87,.18)', marginLeft: 6, minWidth: 0 }}>
        {isBattle && (
          <button
            onClick={onBack}
            onMouseEnter={() => setHoverBack(true)}
            onMouseLeave={() => setHoverBack(false)}
            style={{
              background: hoverBack ? 'rgba(212,168,87,.1)' : 'transparent',
              border: '1px solid rgba(212,168,87,.4)',
              color: '#d4a857', fontFamily: "'Cinzel', serif",
              fontSize: 11, letterSpacing: '.15em',
              padding: '7px 12px', borderRadius: 4,
              transition: 'background .2s',
            }}
          >
            ← VOLTAR
          </button>
        )}
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '.28em',
          color: '#7a6a45', textTransform: 'uppercase',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {breadcrumb}
        </div>
      </div>

      {/* Badge jogador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 8px',
        background: 'linear-gradient(180deg, #1a2e22, #0f1f17)',
        border: '1px solid rgba(212,168,87,.35)', borderRadius: 24, flexShrink: 0,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, #d4a857, #8a5d1f)',
          border: '1.5px solid #f5d27a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, color: '#0b1612', fontSize: 11,
        }}>A</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#e8d5a8', letterSpacing: '.08em' }}>Aurélio</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#c89b3c', letterSpacing: '.05em' }}>nv. 14 · bandeirante</div>
        </div>
      </div>
    </header>
  );
}
