import { useState } from 'react';

export default function Header({ isBattle, onBack, breadcrumb }) {
  const [hoverBack, setHoverBack] = useState(false);
  const [hoveredHeader, setHoveredHeader] = useState(false);
  const collapsed = isBattle && !hoveredHeader;

  return (
    <header
      onMouseEnter={() => setHoveredHeader(true)}
      onMouseLeave={() => setHoveredHeader(false)}
      style={{
        position: 'sticky', top: 0, zIndex: 10,
        overflow: 'hidden',
        maxHeight: collapsed ? 6 : 80,
        transition: 'max-height .3s ease',
        borderBottom: '1px solid rgba(212,168,87,.18)',
        background: 'linear-gradient(180deg, rgba(10,18,12,.92), rgba(10,18,12,.7))',
        backdropFilter: 'blur(6px)',
      }}
    >
    <div style={{
      padding: '18px 22px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <a href="https://lendasebatalhas.com.br" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="https://lendasebatalhas.com.br/wp-content/uploads/2021/01/logo_horizontal.png" alt="Lendas &amp; Batalhas" height="40" style={{ width: 'auto', display: 'block' }} />
        </a>
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
    </div>
    </header>
  );
}
