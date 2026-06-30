import { useState, useRef, useEffect } from 'react';
import { initialChat, battleLog } from '../data';
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
    <main style={{ padding: '14px 14px 24px', maxWidth: 1500, margin: '0 auto' }}>
      <div className="battle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>

        {/* ===== COLUNA ESQUERDA ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Banner do NPC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'linear-gradient(180deg, rgba(38,20,40,.6), rgba(20,12,28,.4))', border: '1px solid rgba(150,90,160,.35)', borderRadius: 10 }}>
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
                <span style={{ fontFamily: "'Cinzel', serif", fontStyle: 'italic', fontSize: 11, color: '#d4a857' }}>decidindo…</span>
              </div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#7a6a45', textAlign: 'right', letterSpacing: '.12em', flexShrink: 0 }}>
              TURNO <span style={{ color: '#d4a857', fontSize: 14, fontWeight: 600 }}>07</span><br />
              <span style={{ color: '#5a5040' }}>vez do oponente</span>
            </div>
          </div>

          {/* Mão do NPC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'linear-gradient(180deg, rgba(38,20,28,.45), rgba(20,12,16,.35))', border: '1px solid rgba(200,77,42,.28)', borderRadius: 10 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#a85040', writingMode: 'vertical-rl', transform: 'rotate(180deg)', flexShrink: 0 }}>MÃO DO NPC · 5</div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, maxWidth: 480 }}>
              {deckLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <NPCHandCard key={i} card={{ name: '???' }} revealed={false} onZoom={zoomCard} />
                  ))
                : maoNpc.map((carta, i) => (
                    <NPCHandCard key={i} card={carta} revealed={false} onZoom={zoomCard} />
                  ))
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#5a5040', letterSpacing: '.18em' }}>NA MÃO</div>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857' }}>{maoNpc.length}</div>
              <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 9, color: '#7a6a45' }}>cartas</div>
            </div>
          </div>

          {/* Tabuleiro */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Campo do NPC */}
            <div style={{ background: 'radial-gradient(ellipse at center, rgba(80,20,30,.35), transparent 75%), linear-gradient(180deg, rgba(38,20,28,.5), rgba(20,12,16,.3))', border: '1px solid rgba(200,77,42,.3)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.3em', color: '#a85040' }}>▲ CAMPO DO {npcName.toUpperCase()}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SmallSlot label="DECK" count={deckNpc.length} />
                  <SmallSlot label="ESQUEC." faceUp={esquecimentoNpc.length > 0} cardName={esquecimentoNpc[esquecimentoNpc.length - 1]?.name} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <UtilSlot kind="folc" count={campoNpc.folcloricas.length} side="npc" />
                  <UtilSlot kind="acao" filled={!!campoNpc.acao} side="npc" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: '0 8%' }}>
                    {campoNpc.plantas.map((carta, i) => (
                      <PlantSlot key={i} card={carta} side="npc" onZoom={zoomCard} />
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                    {campoNpc.personagens.map((carta, i) => (
                      <CharSlot key={i} card={carta} side="npc" onZoom={zoomCard} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Faixa central de PC */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 10px', background: 'linear-gradient(90deg, rgba(80,20,30,.25), rgba(13,27,42,.4) 50%, rgba(26,46,34,.25))', border: '1px solid rgba(212,168,87,.25)', borderRadius: 10 }}>
              <PCMedallion value={pcNpc} label={npcName.toUpperCase()} delta="" deltaColor="#a85040" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 4px', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, color: '#8a7a52', letterSpacing: '.2em' }}>VS</div>
                <div style={{ width: 30, height: 1, background: '#c89b3c' }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#5a5040', letterSpacing: '.15em' }}>META 20</div>
              </div>
              <PCMedallion value={pcJogador} label="VOCÊ" delta="" deltaColor="#5a8a4a" right />
            </div>

            {/* Campo do jogador */}
            <div style={{ background: 'radial-gradient(ellipse at center, rgba(26,46,34,.4), transparent 75%), linear-gradient(0deg, rgba(26,46,34,.55), rgba(15,31,23,.35))', border: '1px solid rgba(90,138,74,.4)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <UtilSlot kind="folc" count={campoJogador.folcloricas.length} side="player" />
                  <UtilSlot kind="acao" filled={!!campoJogador.acao} side="player" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                    {campoJogador.personagens.map((carta, i) => (
                      <CharSlot key={i} card={carta} side="player" onZoom={zoomCard} />
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: '0 8%' }}>
                    {campoJogador.plantas.map((carta, i) => (
                      <PlantSlot key={i} card={carta} side="player" onZoom={zoomCard} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '0 4px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SmallSlot label="DECK" count={20} />
                  <SmallSlot label="ESQUEC." />
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.3em', color: '#5a8a4a' }}>▼ SEU CAMPO</div>
              </div>
            </div>
          </div>

          {/* Botão PASSAR A VEZ */}
          <div style={{ position: 'sticky', bottom: 14, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none', marginTop: 6, zIndex: 6 }}>
            <PassTurnButton />
          </div>
        </div>

        {/* ===== SIDEBAR DIREITA ===== */}
        <aside className="battle-sidebar" style={{ position: 'sticky', top: 14, alignSelf: 'start', maxWidth: 360, height: 'calc(100vh - 100px)', minHeight: 520 }}>
          <div style={{ display: 'grid', gridTemplateRows: 'minmax(90px,auto) minmax(220px,1fr) minmax(220px,1fr)', gap: 10, height: '100%' }}>

            {/* Log de batalha */}
            <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.65), rgba(10,18,12,.55))', border: '1px solid rgba(212,168,87,.28)', borderRadius: 10, padding: '10px 12px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c89b3c', boxShadow: '0 0 6px #c89b3c' }} />
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.22em', color: '#7a6a45' }}>RELATO DA BATALHA</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                {battleLog.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: "'Lora', serif", fontSize: 12, lineHeight: 1.35 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a5040', flexShrink: 0 }}>{ev.t}</span>
                    <span style={{ color: ev.color }}>{ev.text}</span>
                  </div>
                ))}
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

function PassTurnButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        pointerEvents: 'auto',
        background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 40%, #8a5d1f 90%)',
        border: '2px solid #f5d27a', color: '#0b1612',
        fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 13, letterSpacing: '.22em',
        padding: '14px 22px', borderRadius: 30,
        boxShadow: hovered
          ? '0 0 32px rgba(200,155,60,.7), inset 0 -3px 8px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,240,200,.6), 0 6px 0 #0b1612'
          : '0 0 22px rgba(200,155,60,.55), inset 0 -3px 8px rgba(0,0,0,.3), inset 0 2px 4px rgba(255,240,200,.6), 0 4px 0 #0b1612',
        textShadow: '0 1px 0 rgba(255,240,200,.4)',
        display: 'flex', alignItems: 'center', gap: 8,
        transform: hovered ? 'translateY(-2px)' : '',
        transition: 'transform .15s, box-shadow .15s',
      }}
    >
      ⏭ PASSAR A VEZ
    </button>
  );
}
