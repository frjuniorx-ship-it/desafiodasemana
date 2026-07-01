import { useState, useRef, useEffect } from 'react';
import { initialChat } from '../data';
import { useBattleState } from '../hooks/useBattleState.js';
import CharSlot from './battle/CharSlot';
import PlantSlot from './battle/PlantSlot';
import SmallSlot from './battle/SmallSlot';
import UtilSlot from './battle/UtilSlot';
import NPCHandCard from './battle/NPCHandCard';
import CardZoom from './battle/CardZoom';
import ChatBubble from './battle/ChatBubble';

export default function Battle({ npc }) {
  const npcName    = npc?.name    || 'Desconhecido';
  const npcInitial = npc?.initial || '?';
  const npcColor   = npc?.color   || '#8a5a9a';
  const npcImg     = npc?.imagem_url || '';
  const npcFlavor  = npc?.flavor  || '';

  const {
    loading: deckLoading,
    deckNpc, maoNpc, campoNpc, esquecimentoNpc, pcNpc,
    campoJogador, pcJogador,
    turno, vezDoNpc, log, passarVez,
    jogadorJogarCarta,
  } = useBattleState(npc);

  const [zoomedCard, setZoomedCard] = useState(null);
  const [chat, setChat] = useState(initialChat);
  const [inputVal, setInputVal] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  function zoomCard(card) {
    if (!card || card.name === '???') return;
    setZoomedCard(prev => (prev && prev.name === card.name) ? prev : card);
  }

  function sendChat() {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal('');
    setChat(prev => [...prev, { kind: 'player', text }]);

    const matchJogar = /jogu[eo]i\s+(.+)/i.exec(text);
    if (matchJogar) {
      const nomeCarta = matchJogar[1].trim();
      jogadorJogarCarta(nomeCarta).then(carta => {
        if (carta) {
          setChat(prev => [...prev, { kind: 'system', text: `${carta.name} jogado em campo.` }]);
        } else {
          setChat(prev => [...prev, { kind: 'system', text: `Carta "${nomeCarta}" não encontrada. Confirme o nome exato.` }]);
        }
      });
      return;
    }

    setTimeout(() => {
      setChat(prev => [...prev, { kind: 'ai', text: 'Boa jogada. Observe a posição do oponente antes de confirmar.' }]);
    }, 1200);
  }

  return (
    <main style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 14px 0', boxSizing: 'border-box' }}>
      <div className="battle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ===== COLUNA ESQUERDA ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, height: '100%', overflow: 'hidden' }}>

          {/* Banner do NPC */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '6px 14px', background: 'linear-gradient(180deg, rgba(38,20,40,.6), rgba(20,12,28,.4))', border: '1px solid rgba(150,90,160,.35)', borderRadius: 10 }}>
            <div style={{ width: 54, height: 54, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${npcColor}`, boxShadow: `0 0 14px ${npcColor}88`, background: `radial-gradient(circle, ${npcColor}44, #0b1612)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {npcImg
                ? <img src={npcImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                : <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 22, color: '#d4a857', textShadow: '0 0 8px rgba(255,255,255,.4)' }}>{npcInitial}</div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 18, color: '#e8d5a8', letterSpacing: '.08em' }}>{npcName.toUpperCase()}</div>
                {npcFlavor && <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, color: '#a89870' }}>— {npcFlavor}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.18em', color: '#7a6a45' }}>ESTADO</span>
                <div style={{ flex: 1, maxWidth: 200, height: 5, background: '#0a1219', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(212,168,87,.2)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '62%', background: 'linear-gradient(90deg, #3a7a4a, #c89b3c 60%, #c84d2a)', borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: '62%', top: -3, width: 2, height: 11, background: '#f5d27a', boxShadow: '0 0 6px #f5d27a' }} />
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontStyle: 'italic', fontSize: 11, color: vezDoNpc ? '#c84d2a' : '#d4a857' }}>{vezDoNpc ? 'decidindo…' : 'aguardando'}</span>
              </div>
            </div>
            {/* Mão do NPC integrada na barra */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              {deckLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ width: 34, height: 48, borderRadius: 4, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.2), transparent 65%), repeating-linear-gradient(45deg, #1a2e22 0 3px, #142418 3px 6px)', border: '1px solid rgba(200,155,60,.2)', flexShrink: 0 }} />
                  ))
                : maoNpc.map((carta, i) => (
                    <div key={i} style={{ width: 34, flexShrink: 0 }}>
                      <NPCHandCard card={carta} revealed={false} onZoom={zoomCard} />
                    </div>
                  ))
              }
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#7a6a45', textAlign: 'right', letterSpacing: '.12em', flexShrink: 0 }}>
              TURNO <span style={{ color: '#d4a857', fontSize: 14, fontWeight: 600 }}>{turno || '—'}</span><br />
              <span style={{ color: vezDoNpc ? '#c84d2a' : '#5a5040' }}>{vezDoNpc ? 'vez do oponente' : 'sua vez'}</span>
            </div>
          </div>

          {/* Tabuleiro */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden', gap: 0 }}>

            {/* PC Sidebar */}
            <div style={{ width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 4px', borderRight: '1px solid rgba(212,168,87,.18)', marginRight: 10 }}>

              {/* NPC name */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.1em', color: '#a85040', textAlign: 'center', maxWidth: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{npcName.toUpperCase()}</div>

              {/* NPC deck */}
              <div style={{ position: 'relative', width: 32, height: 44 }}>
                <div style={{ position: 'absolute', left: -2, top: 2, right: 2, bottom: -2, background: 'linear-gradient(135deg, #2a1e0e, #0f0a04)', border: '1px solid #5a3a16', borderRadius: 3 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.28), transparent 60%), linear-gradient(135deg, #3a2510, #1a0f06)', border: '1px solid #c89b3c', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, color: '#d4a857' }}>{deckNpc.length}</div>
              </div>

              {/* NPC ESQ */}
              <div style={{ width: 32, height: 44, background: esquecimentoNpc.length > 0 ? 'repeating-linear-gradient(118deg, rgba(0,0,0,.18) 0 2px, transparent 2px 6px), linear-gradient(180deg, #2a3a22, #131e10)' : 'rgba(11,22,18,.5)', border: `1px solid ${esquecimentoNpc.length > 0 ? 'rgba(212,168,87,.4)' : '#2a1e10'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857', opacity: esquecimentoNpc.length > 0 ? .85 : .22 }}>
                {esquecimentoNpc.length > 0 ? (esquecimentoNpc[esquecimentoNpc.length-1]?.name?.[0] || '?').toUpperCase() : '○'}
              </div>

              {/* NPC medallion */}
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 35%, #6b4a16 100%)', border: '2px solid #f5d27a', boxShadow: '0 0 14px rgba(200,155,60,.55), inset 0 -3px 8px rgba(0,0,0,.45), inset 0 3px 8px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 20, color: '#0b1612', lineHeight: 1 }}>{pcNpc}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#6b4a16', letterSpacing: '.1em' }}>PC</div>
              </div>

              {/* VS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, margin: '4px 0' }}>
                <div style={{ width: 1, height: 6, background: 'rgba(212,168,87,.35)' }} />
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 10, color: '#8a7a52', letterSpacing: '.2em' }}>VS</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#5a5040', letterSpacing: '.1em' }}>META 20</div>
                <div style={{ width: 1, height: 6, background: 'rgba(212,168,87,.35)' }} />
              </div>

              {/* Player medallion */}
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 35%, #6b4a16 100%)', border: '2px solid #f5d27a', boxShadow: '0 0 14px rgba(200,155,60,.55), inset 0 -3px 8px rgba(0,0,0,.45), inset 0 3px 8px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 20, color: '#0b1612', lineHeight: 1 }}>{pcJogador}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#6b4a16', letterSpacing: '.1em' }}>PC</div>
              </div>

              {/* Player deck */}
              <div style={{ position: 'relative', width: 32, height: 44 }}>
                <div style={{ position: 'absolute', left: -2, top: 2, right: 2, bottom: -2, background: 'linear-gradient(135deg, #2a1e0e, #0f0a04)', border: '1px solid #5a3a16', borderRadius: 3 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.28), transparent 60%), linear-gradient(135deg, #3a2510, #1a0f06)', border: '1px solid #c89b3c', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, color: '#d4a857' }}>20</div>
              </div>

              {/* Player ESQ */}
              <div style={{ width: 32, height: 44, background: 'rgba(11,22,18,.5)', border: '1px solid #2a1e10', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857', opacity: .22 }}>○</div>

              {/* VOCÊ label */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.1em', color: '#5a8a4a', textAlign: 'center' }}>VOCÊ</div>

            </div>

            {/* Board Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', position: 'relative' }}>

            {/* Campo do NPC */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at center, rgba(80,20,30,.35), transparent 75%), linear-gradient(180deg, rgba(38,20,28,.5), rgba(20,12,16,.3))', border: '1px solid rgba(200,77,42,.3)', borderRadius: 12, padding: 10 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                  <span />
                  {campoNpc.plantas.map((carta, i) => (
                    <PlantSlot key={i} card={carta} side="npc" onZoom={zoomCard} />
                  ))}
                  <span />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                  {campoNpc.personagens.map((carta, i) => (
                    <CharSlot key={i} card={carta} side="npc" onZoom={zoomCard} />
                  ))}
                </div>
              </div>
            </div>

            {/* Linha divisória */}
            <div style={{ height: 2, flexShrink: 0, background: 'linear-gradient(90deg, transparent, rgba(212,168,87,.5) 20%, rgba(212,168,87,.85) 50%, rgba(212,168,87,.5) 80%, transparent)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 5 }}>
                <PassTurnButton onClick={passarVez} disabled={vezDoNpc} />
              </div>
            </div>

            {/* Campo do jogador */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at center, rgba(26,46,34,.4), transparent 75%), linear-gradient(0deg, rgba(26,46,34,.55), rgba(15,31,23,.35))', border: '1px solid rgba(90,138,74,.4)', borderRadius: 12, padding: 10 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                  {campoJogador.personagens.map((carta, i) => (
                    <CharSlot key={i} card={carta} side="player" onZoom={zoomCard} />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                  <span />
                  {campoJogador.plantas.map((carta, i) => (
                    <PlantSlot key={i} card={carta} side="player" onZoom={zoomCard} />
                  ))}
                  <span />
                </div>
              </div>
            </div>
            </div>{/* fecha board content */}
          </div>{/* fecha tabuleiro row */}
        </div>

        {/* ===== SIDEBAR DIREITA ===== */}
        <aside className="battle-sidebar" style={{ height: '100%', maxWidth: 360, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateRows: 'minmax(90px,auto) minmax(220px,1fr) minmax(220px,1fr)', gap: 10, height: '100%' }}>

            {/* Log de batalha */}
            <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.65), rgba(10,18,12,.55))', border: '1px solid rgba(212,168,87,.28)', borderRadius: 10, padding: '10px 12px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c89b3c', boxShadow: '0 0 6px #c89b3c' }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>RELATO DA BATALHA</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                {log.length === 0
                  ? <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: '#5a5040', opacity: .6 }}>Clique em "Passar a Vez" para iniciar a batalha.</div>
                  : log.map((ev, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: "'Lora', serif", fontSize: 12, lineHeight: 1.35 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a5040', flexShrink: 0 }}>{ev.t}</span>
                        <span style={{ color: ev.color }}>{ev.text}</span>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Zoom de carta */}
            <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.5), rgba(10,18,12,.5))', border: '1.5px solid rgba(212,168,87,.4)', borderRadius: 10, minHeight: 0, overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 0 18px rgba(200,155,60,.08)' }}>
              {/* Ornamentos de canto dourados */}
              {[{top:4,left:4,bT:true,bL:true},{top:4,right:4,bT:true,bR:true},{bottom:4,left:4,bB:true,bL:true},{bottom:4,right:4,bB:true,bR:true}].map((pos,i) => (
                <div key={i} style={{ position:'absolute', top:pos.top, bottom:pos.bottom, left:pos.left, right:pos.right, width:18, height:18, borderTop:pos.bT?'1px solid #c89b3c':'none', borderBottom:pos.bB?'1px solid #c89b3c':'none', borderLeft:pos.bL?'1px solid #c89b3c':'none', borderRight:pos.bR?'1px solid #c89b3c':'none', pointerEvents:'none' }} />
              ))}
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <CardZoom card={zoomedCard} />
              </div>
            </div>

            {/* Chat */}
            <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.65), rgba(10,18,12,.55))', border: '1px solid rgba(212,168,87,.28)', borderRadius: 10, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8ac46a', boxShadow: '0 0 6px #8ac46a' }} />
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>CONVERSA &amp; AÇÕES</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 10, color: '#5a5040' }}>pergunte à IA</div>
              </div>
              <div ref={chatRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chat.map((m, i) => <ChatBubble key={i} msg={m} />)}
              </div>
              <div style={{ padding: '8px 8px 10px', flexShrink: 0, borderTop: '1px solid rgba(212,168,87,.18)', display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(10,18,12,.4)' }}>
                <button style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(180deg, #2a3e2a, #1a2e22)', border: '1.5px solid #c89b3c', color: '#d4a857', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'micPulse 1.8s ease-in-out infinite', fontSize: 16 }} title="Gravar voz">🎙</button>
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Descreva sua jogada ou pergunta…"
                  style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 6, background: 'rgba(10,18,12,.7)', border: '1px solid rgba(212,168,87,.3)', color: '#e8d5a8', fontFamily: "'Lora', serif", fontSize: 12 }}
                />
                <button
                  onClick={sendChat}
                  style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 6, background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 50%, #8a5d1f 95%)', border: '1.5px solid #f5d27a', color: '#0b1612', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 11, letterSpacing: '.2em', boxShadow: 'inset 0 -2px 6px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,240,200,.5), 0 2px 0 #0b1612', textShadow: '0 1px 0 rgba(255,240,200,.4)' }}
                >ENVIAR</button>
              </div>
            </div>

          </div>
        </aside>

      </div>
    </main>
  );
}

function PCMedallion({ value, label, delta, deltaColor, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, justifyContent: right ? 'flex-end' : 'flex-start', flexDirection: right ? 'row-reverse' : 'row' }}>
      <div style={{ width: 54, height: 54, flexShrink: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 35%, #6b4a16 100%)', border: '2px solid #f5d27a', boxShadow: '0 0 18px rgba(200,155,60,.6), inset 0 -3px 8px rgba(0,0,0,.45), inset 0 3px 8px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 20, color: '#0b1612', lineHeight: 1, textShadow: '0 1px 0 rgba(255,240,200,.5)' }}>{value}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#6b4a16', letterSpacing: '.1em', marginTop: 1 }}>PC</div>
      </div>
      <div style={{ lineHeight: 1.2, minWidth: 0, textAlign: right ? 'right' : 'left' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#d4a857', letterSpacing: '.18em' }}>{label}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: deltaColor }}>{delta}</div>
      </div>
    </div>
  );
}

function PassTurnButton({ onClick, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 160, height: 36,
        background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 40%, #8a5d1f 90%)',
        border: '1.5px solid #f5d27a', color: '#0b1612',
        fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 10, letterSpacing: '.16em',
        padding: '0 10px', borderRadius: 18,
        boxShadow: hovered && !disabled
          ? '0 0 24px rgba(200,155,60,.7), inset 0 -2px 6px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,240,200,.6), 0 4px 0 #0b1612'
          : '0 0 16px rgba(200,155,60,.55), inset 0 -2px 6px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,240,200,.6), 0 3px 0 #0b1612',
        textShadow: '0 1px 0 rgba(255,240,200,.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, whiteSpace: 'nowrap',
        transform: hovered && !disabled ? 'translateY(-1px)' : '',
        transition: 'transform .15s, box-shadow .15s',
        opacity: disabled ? .45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      ⏭ PASSAR A VEZ
    </button>
  );
}
