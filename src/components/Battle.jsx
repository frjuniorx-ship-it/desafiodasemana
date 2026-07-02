import { useState, useRef, useEffect } from 'react';
import { registrarResultado } from '../api/progresso.js';
import { useBattleState, normStr, similaridade } from '../hooks/useBattleState.js';
import { processarAcaoBatalha, gerarDicaContextual } from '../api/battleAI.js';
import CharSlot from './battle/CharSlot';
import PlantSlot from './battle/PlantSlot';
import SmallSlot from './battle/SmallSlot';
import UtilSlot from './battle/UtilSlot';
import NPCHandCard from './battle/NPCHandCard';
import ChatBubble from './battle/ChatBubble';

export default function Battle({ npc, onGameOver, token }) {
  const npcName    = npc?.name    || 'Desconhecido';
  const npcInitial = npc?.initial || '?';
  const npcColor   = npc?.color   || '#8a5a9a';
  const npcImg     = npc?.imagem_url || '';
  const npcFlavor  = npc?.flavor  || '';

  const {
    loading: deckLoading,
    deckNpc, maoNpc, campoNpc, esquecimentoNpc, pcNpc,
    campoJogador, pcJogador,
    turno, vezDoNpc, log, fimDeJogo, prontoParaJogar,
    combatePendente,
    passarVez, jogadorJogarCarta, jogadorJogarPlantaVirada, jogadorRevelarPlanta, jogadorEquiparCarta,
    jogadorAtacar, jogadorAtaqueDireto, confirmarCombate, aplicarResultadoCombate,
    jogadorIniciarFolclorica, jogadorCompletarFolclorica, resolverCombateCompleto,
    folcloricaPendente,
    esquecimentoJogador,
    iniciarJogo,
  } = useBattleState(npc);

  const [zoomedCard, setZoomedCard] = useState(null);
  const [esquecimentoModal, setEsquecimentoModal] = useState(null); // null | 'npc' | 'player'
  const [activeTab, setActiveTab] = useState('relato');
  const [chat, setChat] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [micAtivo, setMicAtivo] = useState(false);
  const [toast, setToast] = useState('');
  const chatRef = useRef(null);
  const recognitionRef = useRef(null);
  const sendChatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  function zoomCard(card) {
    if (!card || card.name === '???') return;
    setZoomedCard(prev => (prev && prev.name === card.name) ? prev : card);
    setActiveTab('zoom');
  }
  function clearZoom() {
    setActiveTab('relato');
    setZoomedCard(null);
  }

  function sendChat(textoOverride) {
    const text = (typeof textoOverride === 'string' ? textoOverride : inputVal).trim();
    if (!text) return;
    setInputVal('');
    setChat(prev => [...prev, { kind: 'player', text }]);

    const estado = { turno, nomeNpc: npcName, pcNpc, pcJogador, campoNpc, campoJogador, combatePendente };
    const resultado = processarAcaoBatalha(text, estado);

    if (!resultado) {
      const dica = gerarDicaContextual(estado);
      setChat(prev => [...prev, { kind: 'ai', text: 'Não entendi. Tente: "joguei [carta]", "ataco [alvo] com [carta]", "equipei [X] no [Y]", "passo".' }]);
      if (dica) setChat(prev => [...prev, { kind: 'ai', text: dica }]);
      return;
    }

    switch (resultado.acao) {
      case 'jogar_carta': {
        jogadorJogarCarta(resultado.carta).then(({ carta, sugestao }) => {
          if (carta) setChat(prev => [...prev, { kind: 'system', text: `${carta.name} jogado em campo.` }]);
          else setChat(prev => [...prev, { kind: 'system', text: sugestao ? `Você quis dizer "${sugestao}"?` : `Carta "${resultado.carta}" não encontrada.` }]);
        });
        break;
      }
      case 'jogar_com_equipamento': {
        jogadorJogarCarta(resultado.carta).then(({ carta, sugestao }) => {
          if (carta) {
            setChat(prev => [...prev, { kind: 'system', text: `${carta.name} jogado em campo.` }]);
            jogadorEquiparCarta(resultado.equipamento, resultado.carta).then(rE => {
              if (rE.ok) setChat(prev => [...prev, { kind: 'system', text: `${rE.equipNome} equipado em ${rE.alvoNome}.` }]);
            });
          } else {
            setChat(prev => [...prev, { kind: 'system', text: sugestao ? `Você quis dizer "${sugestao}"?` : `Carta "${resultado.carta}" não encontrada.` }]);
          }
        });
        break;
      }
      case 'atacar': {
        const cartaNome = resultado.carta
          || campoJogador.personagens.find(c => c && !c.entrou_turno_atual)?.name;
        if (!cartaNome) { setChat(prev => [...prev, { kind: 'ai', text: 'Nenhuma carta disponível para atacar.' }]); break; }
        const r = jogadorAtacar(cartaNome, resultado.alvo);
        setChat(prev => [...prev, { kind: 'system', text: r.ok ? `Ataque de ${r.atacanteNome ?? cartaNome} em ${r.alvoNome ?? resultado.alvo}.` : r.msg }]);
        break;
      }
      case 'ataque_direto': {
        const atacante = resultado.carta
          ? campoJogador.personagens.reduce((best, c) => {
              if (!c) return best;
              const sim = Math.max(similaridade(resultado.carta, c.name), normStr(c.name).includes(normStr(resultado.carta)) ? 1 : 0);
              return sim > (best?.sim ?? 0) ? { c, sim } : best;
            }, null)?.c
          : campoJogador.personagens.find(c => c && !c.entrou_turno_atual);
        if (!atacante) { setChat(prev => [...prev, { kind: 'ai', text: 'Nenhuma carta disponível para atacar.' }]); break; }
        const r = jogadorAtaqueDireto(atacante.name);
        setChat(prev => [...prev, { kind: 'system', text: r.ok ? `Ataque direto! ${r.dano} de dano ao NPC.` : r.msg }]);
        break;
      }
      case 'equipar': {
        jogadorEquiparCarta(resultado.carta, resultado.alvo).then(r => {
          setChat(prev => [...prev, { kind: 'system', text: r.ok ? `${r.equipNome} equipado em ${r.alvoNome}.` : r.msg }]);
        });
        break;
      }
      case 'revelar_planta': {
        jogadorRevelarPlanta(resultado.carta, resultado.slot).then(r => {
          if (r.ok) setChat(prev => [...prev, { kind: 'system', text: `${r.carta.name} revelada em campo.` }]);
          else setChat(prev => [...prev, { kind: 'system', text: r.sugestao ? `Você quis dizer "${r.sugestao}"?` : `Carta "${resultado.carta}" não encontrada.` }]);
        });
        break;
      }
      case 'jogar_planta_virada': {
        const r = jogadorJogarPlantaVirada();
        setChat(prev => [...prev, { kind: 'system', text: r.ok ? 'Planta colocada em campo (virada).' : r.msg }]);
        break;
      }
      case 'ativar_planta': {
        jogadorJogarCarta(resultado.carta).then(({ carta, sugestao }) => {
          if (carta) setChat(prev => [...prev, { kind: 'system', text: `${carta.name} ativado.` }]);
          else setChat(prev => [...prev, { kind: 'system', text: sugestao ? `Você quis dizer "${sugestao}"?` : `Carta "${resultado.carta}" não encontrada.` }]);
        });
        break;
      }
      case 'iniciar_folclorica': {
        jogadorIniciarFolclorica(resultado.carta).then(r => {
          if (!r.ok) setChat(prev => [...prev, { kind: 'system', text: r.sugestao ? `Você quis dizer "${r.sugestao}"?` : r.msg }]);
          else if (r.precisaDescarte) setChat(prev => [...prev, { kind: 'ai', text: `${r.carta.name} requer ${r.nd} descarte(s). Diga: "descarto [carta] e ativo ${r.carta.name}".` }]);
          else setChat(prev => [...prev, { kind: 'system', text: `${r.carta.name} ativado.` }]);
        });
        break;
      }
      case 'folclorica_com_descarte': {
        jogadorIniciarFolclorica(resultado.carta).then(r => {
          if (!r.ok) { setChat(prev => [...prev, { kind: 'system', text: r.msg }]); return; }
          const res = jogadorCompletarFolclorica(resultado.descarte ? [resultado.descarte] : []);
          setChat(prev => [...prev, { kind: 'system', text: res.ok ? `${res.carta.name} ativado após descarte.` : res.msg }]);
        });
        break;
      }
      case 'declarar_descarte':
        setChat(prev => [...prev, { kind: 'ai', text: folcloricaPendente ? `Descarte de "${resultado.carta}" registrado para ${folcloricaPendente.name}.` : 'Descarte declarado. Informe também qual folclórica ativar.' }]);
        break;
      case 'remover':
        setChat(prev => [...prev, { kind: 'ai', text: 'Remoção manual não disponível.' }]);
        break;
      case 'passar_vez':
        if (!vezDoNpc) passarVez();
        setChat(prev => [...prev, { kind: 'system', text: 'Vez passada.' }]);
        break;
      case 'confirmar_combate':
        if (combatePendente) {
          if (combatePendente.atacante && combatePendente.alvo) {
            resolverCombateCompleto(combatePendente.atacante, combatePendente.alvo, true);
          } else {
            confirmarCombate();
          }
          setChat(prev => [...prev, { kind: 'system', text: 'Combate confirmado.' }]);
        } else {
          setChat(prev => [...prev, { kind: 'ai', text: 'Não há combate pendente para confirmar.' }]);
        }
        break;
      default:
        setChat(prev => [...prev, { kind: 'ai', text: 'Ação não reconhecida.' }]);
    }

    const dica = gerarDicaContextual(estado);
    if (dica) setChat(prev => [...prev, { kind: 'ai', text: dica }]);
  }

  sendChatRef.current = sendChat;

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setToast('Seu navegador não suporta entrada por voz. Use Chrome.');
      setTimeout(() => setToast(''), 3500);
      return;
    }
    if (micAtivo) {
      recognitionRef.current?.stop();
      setMicAtivo(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = e => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInputVal(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setInputVal('');
        setMicAtivo(false);
        sendChatRef.current?.(transcript.trim());
      }
    };
    rec.onerror = () => setMicAtivo(false);
    rec.onend = () => setMicAtivo(false);
    recognitionRef.current = rec;
    rec.start();
    setMicAtivo(true);
  }

  useEffect(() => {
    if (fimDeJogo === 'vitoria' && npc?._id) {
      registrarResultado(npc._id, 'vitoria', token).catch(console.error);
    }
  }, [fimDeJogo]);

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
            <div style={{ width: 90, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 4px', borderRight: '1px solid rgba(212,168,87,.18)', marginRight: 10 }}>

              {/* NPC name */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.1em', color: '#a85040', textAlign: 'center', maxWidth: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{npcName.toUpperCase()}</div>

              {/* NPC deck + ESQ lado a lado */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                {/* Deck NPC */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ position: 'relative', width: 32, height: 44 }}>
                    <div style={{ position: 'absolute', left: -2, top: 2, right: 2, bottom: -2, background: 'linear-gradient(135deg, #2a1e0e, #0f0a04)', border: '1px solid #5a3a16', borderRadius: 3 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.28), transparent 60%), linear-gradient(135deg, #3a2510, #1a0f06)', border: '1px solid #c89b3c', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857' }}>{deckNpc.length}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#5a4a30', letterSpacing: '.1em' }}>DECK</div>
                </div>
                {/* ESQ NPC */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div
                    onClick={() => esquecimentoNpc.length > 0 && setEsquecimentoModal('npc')}
                    style={{ width: 32, height: 44, background: esquecimentoNpc.length > 0 ? 'repeating-linear-gradient(118deg, rgba(0,0,0,.18) 0 2px, transparent 2px 6px), linear-gradient(180deg, #3a2a1a, #1e1208)' : 'rgba(11,22,18,.5)', border: `1px solid ${esquecimentoNpc.length > 0 ? 'rgba(212,168,87,.55)' : '#2a1e10'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857', opacity: esquecimentoNpc.length > 0 ? 1 : .25, cursor: esquecimentoNpc.length > 0 ? 'pointer' : 'default', boxShadow: esquecimentoNpc.length > 0 ? '0 0 8px rgba(212,168,87,.3)' : 'none', transition: 'box-shadow .15s' }}>
                    {esquecimentoNpc.length > 0 ? esquecimentoNpc.length : '○'}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: esquecimentoNpc.length > 0 ? '#a87a3a' : '#5a4a30', letterSpacing: '.1em' }}>ESQ</div>
                </div>
              </div>

              {/* NPC medallion */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 35%, #6b4a16 100%)', border: '2px solid #f5d27a', boxShadow: '0 0 14px rgba(200,155,60,.55), inset 0 -3px 8px rgba(0,0,0,.45), inset 0 3px 8px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 22, color: '#0b1612', lineHeight: 1 }}>{pcNpc}</div>
                <img src="https://lendasebatalhas.com.br/wp-content/uploads/2026/07/PC.png" alt="PC" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              </div>

              {/* VS */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 1, height: 8, background: 'rgba(212,168,87,.35)' }} />
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 10, color: '#8a7a52', letterSpacing: '.2em' }}>VS</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#5a5040', letterSpacing: '.1em' }}>META 20</div>
                <div style={{ width: 1, height: 8, background: 'rgba(212,168,87,.35)' }} />
              </div>

              {/* Player medallion */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f5d27a 0%, #c89b3c 35%, #6b4a16 100%)', border: '2px solid #f5d27a', boxShadow: '0 0 14px rgba(200,155,60,.55), inset 0 -3px 8px rgba(0,0,0,.45), inset 0 3px 8px rgba(255,240,200,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 22, color: '#0b1612', lineHeight: 1 }}>{pcJogador}</div>
                <img src="https://lendasebatalhas.com.br/wp-content/uploads/2026/07/PC.png" alt="PC" style={{ width: 14, height: 14, objectFit: 'contain' }} />
              </div>

              {/* Player deck + ESQ lado a lado */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                {/* Deck Player */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ position: 'relative', width: 32, height: 44 }}>
                    <div style={{ position: 'absolute', left: -2, top: 2, right: 2, bottom: -2, background: 'linear-gradient(135deg, #2a1e0e, #0f0a04)', border: '1px solid #5a3a16', borderRadius: 3 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.28), transparent 60%), linear-gradient(135deg, #3a2510, #1a0f06)', border: '1px solid #c89b3c', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: '#d4a857' }}>20</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: '#5a4a30', letterSpacing: '.1em' }}>DECK</div>
                </div>
                {/* ESQ Player */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div
                    onClick={() => esquecimentoJogador.length > 0 && setEsquecimentoModal('player')}
                    style={{ width: 32, height: 44, background: esquecimentoJogador.length > 0 ? 'repeating-linear-gradient(118deg, rgba(0,0,0,.18) 0 2px, transparent 2px 6px), linear-gradient(180deg, #1a3a2a, #0d2018)' : 'rgba(11,22,18,.5)', border: `1px solid ${esquecimentoJogador.length > 0 ? 'rgba(90,168,100,.55)' : '#2a1e10'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 14, color: esquecimentoJogador.length > 0 ? '#8ac46a' : '#d4a857', opacity: esquecimentoJogador.length > 0 ? 1 : .25, cursor: esquecimentoJogador.length > 0 ? 'pointer' : 'default', boxShadow: esquecimentoJogador.length > 0 ? '0 0 8px rgba(90,168,100,.3)' : 'none', transition: 'box-shadow .15s' }}>
                    {esquecimentoJogador.length > 0 ? esquecimentoJogador.length : '○'}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 6, color: esquecimentoJogador.length > 0 ? '#5a8a4a' : '#5a4a30', letterSpacing: '.1em' }}>ESQ</div>
                </div>
              </div>

              {/* VOCÊ label */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '.1em', color: '#5a8a4a', textAlign: 'center' }}>VOCÊ</div>

            </div>

            {/* Board Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', position: 'relative' }}>

            {/* Campo do NPC */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at center, rgba(80,20,30,.35), transparent 75%), linear-gradient(180deg, rgba(38,20,28,.5), rgba(20,12,16,.3))', border: '1px solid rgba(200,77,42,.3)', borderRadius: 12, padding: 10 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtilSlot kind="acao" filled={!!campoNpc.acao} side="npc" />
                  </div>
                  {campoNpc.plantas.map((carta, i) => (
                    <PlantSlot key={i} card={carta} side="npc" onZoom={zoomCard} onZoomOut={clearZoom} />
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtilSlot kind="folc" count={campoNpc.folcloricas?.length ?? 0} side="npc" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                  {campoNpc.personagens.map((carta, i) => (
                    <CharSlot key={i} card={carta} side="npc" onZoom={zoomCard} onZoomOut={clearZoom} />
                  ))}
                </div>
              </div>
            </div>

            {/* Linha divisória */}
            <div style={{ height: 2, flexShrink: 0, background: 'linear-gradient(90deg, transparent, rgba(212,168,87,.5) 20%, rgba(212,168,87,.85) 50%, rgba(212,168,87,.5) 80%, transparent)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 5 }}>
                <PassTurnButton onClick={passarVez} disabled={vezDoNpc || !!combatePendente} />
              </div>
            </div>

            {/* Campo do jogador */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at center, rgba(26,46,34,.4), transparent 75%), linear-gradient(0deg, rgba(26,46,34,.55), rgba(15,31,23,.35))', border: '1px solid rgba(90,138,74,.4)', borderRadius: 12, padding: 10 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                  {campoJogador.personagens.map((carta, i) => (
                    <CharSlot key={i} card={carta} side="player" onZoom={zoomCard} onZoomOut={clearZoom} />
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtilSlot kind="acao" filled={!!campoJogador.acao} side="player" />
                  </div>
                  {campoJogador.plantas.map((carta, i) => (
                    <PlantSlot key={i} card={carta} side="player" onZoom={zoomCard} onZoomOut={clearZoom} />
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UtilSlot kind="folc" count={campoJogador.folcloricas?.length ?? 0} side="player" />
                  </div>
                </div>
              </div>
            </div>
            </div>{/* fecha board content */}
          </div>{/* fecha tabuleiro row */}
        </div>

        {/* ===== SIDEBAR DIREITA ===== */}
        <aside className="battle-sidebar" style={{ height: '100%', maxWidth: 360, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateRows: '1fr minmax(200px,1fr)', gap: 10, height: '100%' }}>

            {/* Painel tabbed: Relato / Zoom */}
            <div style={{ background: 'linear-gradient(180deg, rgba(13,27,42,.65), rgba(10,18,12,.55))', border: '1px solid rgba(212,168,87,.28)', borderRadius: 10, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Abas */}
              <div style={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid rgba(212,168,87,.18)' }}>
                {['relato', 'zoom'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ flex: 1, padding: '8px 0', background: activeTab === tab ? 'rgba(212,168,87,.12)' : 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid #c89b3c' : '2px solid transparent', color: activeTab === tab ? '#d4a857' : '#5a5040', fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.2em', cursor: 'pointer', transition: 'color .15s' }}
                  >
                    {tab === 'relato' ? 'RELATO' : 'ZOOM'}
                  </button>
                ))}
              </div>

              {/* Conteúdo da aba ativa */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

                {/* Relato */}
                <div style={{ position: 'absolute', inset: 0, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', opacity: activeTab === 'relato' ? 1 : 0, pointerEvents: activeTab === 'relato' ? 'auto' : 'none', transition: 'opacity .15s' }}>
                  {log.length === 0
                    ? <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: '#5a5040', opacity: .6 }}>Role os dados para iniciar a batalha.</div>
                    : log.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: "'Lora', serif", fontSize: 12, lineHeight: 1.35 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#5a5040', flexShrink: 0 }}>{ev.t}</span>
                          <span style={{ color: ev.color }}>{ev.text}</span>
                        </div>
                      ))
                  }
                </div>

                {/* Zoom — apenas imagem, sem UI extra */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeTab === 'zoom' ? 1 : 0, pointerEvents: activeTab === 'zoom' ? 'auto' : 'none', transition: 'opacity .15s', background: '#0a1219' }}>
                  {zoomedCard?.imagem_url
                    ? <img src={zoomedCard.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
                    : <div style={{ fontFamily: "'Cinzel', serif", fontStyle: 'italic', fontSize: 12, color: '#5a5040', opacity: .5, textAlign: 'center', padding: 20 }}>passe o cursor sobre uma carta no campo</div>
                  }
                </div>
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
                <button
                  onClick={toggleMic}
                  title={micAtivo ? 'Parar gravação' : 'Gravar voz'}
                  style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: micAtivo ? 'radial-gradient(circle, #c89b3c, #8a5d1f)' : 'linear-gradient(180deg, #2a3e2a, #1a2e22)', border: `1.5px solid ${micAtivo ? '#f5d27a' : '#c89b3c'}`, color: micAtivo ? '#0b1612' : '#d4a857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', animation: micAtivo ? 'micPulse 1.8s ease-in-out infinite' : 'none', boxShadow: micAtivo ? '0 0 12px rgba(245,210,122,.6)' : 'none', transition: 'background .2s, box-shadow .2s' }}
                >🎙</button>
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
      {!prontoParaJogar && !deckLoading && (
        <DiceModal onResult={(npcPrimeiro, logEntry) => {
          setChat(prev => [...prev, { kind: 'system', text: logEntry }]);
          iniciarJogo(npcPrimeiro);
        }} />
      )}
      {fimDeJogo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'linear-gradient(180deg, #1a2e22, #0b1612)', border: `2px solid ${fimDeJogo === 'vitoria' ? '#c89b3c' : '#c84d2a'}`, borderRadius: 16, padding: '40px 48px', textAlign: 'center', minWidth: 360, boxShadow: `0 0 60px ${fimDeJogo === 'vitoria' ? 'rgba(200,155,60,.4)' : 'rgba(200,77,42,.4)'}` }}>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 48, color: fimDeJogo === 'vitoria' ? '#f5d27a' : '#c84d2a', letterSpacing: '.06em', textShadow: `0 0 24px ${fimDeJogo === 'vitoria' ? 'rgba(245,210,122,.5)' : 'rgba(200,77,42,.5)'}` }}>
              {fimDeJogo === 'vitoria' ? 'VITÓRIA' : 'DERROTA'}
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: '#a89870', marginTop: 8, letterSpacing: '.1em' }}>{npcName}</div>
            {fimDeJogo === 'vitoria' && npc?.recompensa_tipo && (
              <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(200,155,60,.1)', border: '1px solid rgba(212,168,87,.3)', borderRadius: 8 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#7a6a45', letterSpacing: '.2em', marginBottom: 6 }}>RECOMPENSA</div>
                {npc.recompensa_tipo === 'titulo' && (
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: '#e8d5a8' }}>Você conquistou o título: <strong>{npc.recompensa_valor}</strong></div>
                )}
                {npc.recompensa_tipo === 'cupom_woocommerce' && (
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: '#e8d5a8' }}>Seu cupom de desconto foi enviado para o seu e-mail.</div>
                )}
                {npc.recompensa_tipo === 'texto_livre' && (
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: '#e8d5a8' }}>{npc.recompensa_valor}</div>
                )}
              </div>
            )}
            <button
              onClick={() => onGameOver?.(fimDeJogo)}
              style={{ marginTop: 28, padding: '12px 28px', borderRadius: 8, background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 50%, #8a5d1f 95%)', border: '1.5px solid #f5d27a', color: '#0b1612', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, letterSpacing: '.14em', cursor: 'pointer' }}
            >
              VOLTAR AOS DESAFIOS
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 300, padding: '10px 20px', borderRadius: 8, background: 'rgba(13,27,42,.95)', border: '1px solid rgba(212,168,87,.5)', fontFamily: "'Lora', serif", fontSize: 13, color: '#e8d5a8', boxShadow: '0 4px 20px rgba(0,0,0,.6)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
      {esquecimentoModal && (
        <div onClick={() => setEsquecimentoModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #1a2e22, #0b1612)', border: '2px solid rgba(212,168,87,.5)', borderRadius: 14, padding: '24px 28px', minWidth: 340, maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 0 40px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 12, color: '#d4a857', letterSpacing: '.1em' }}>
                ESQUECIMENTO — {esquecimentoModal === 'npc' ? npcName.toUpperCase() : 'VOCÊ'}
              </div>
              <button onClick={() => setEsquecimentoModal(null)} style={{ background: 'none', border: 'none', color: '#7a6a45', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
              {(esquecimentoModal === 'npc' ? [...esquecimentoNpc].reverse() : [...esquecimentoJogador].reverse()).map((carta, i) => (
                <div key={i} onClick={() => { zoomCard(carta); setEsquecimentoModal(null); }} style={{ aspectRatio: '5/7', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(212,168,87,.3)', background: '#0b1612', cursor: 'pointer', position: 'relative' }}>
                  {carta.imagem_url
                    ? <img src={carta.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 20, color: '#d4a857', opacity: .6 }}>{(carta.name?.[0] || '?').toUpperCase()}</div>
                  }
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.75)', fontFamily: "'Cinzel', serif", fontSize: 7, color: '#e8d5a8', textAlign: 'center', padding: '2px 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{carta.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DiceModal({ onResult }) {
  const [rolando, setRolando] = useState(false);
  const [resultado, setResultado] = useState(null);

  function rolar() {
    setRolando(true);
    let pJ, pN;
    // Rolar até desempatar
    do {
      pJ = Math.ceil(Math.random() * 6);
      pN = Math.ceil(Math.random() * 6);
    } while (pJ === pN);

    const npcPrimeiro = pN > pJ;
    const quem = npcPrimeiro ? 'NPC começa!' : 'Você começa!';
    const logEntry = `[DADOS] Você tirou ${pJ} — NPC tirou ${pN} — ${quem}`;
    setResultado({ pJ, pN, npcPrimeiro, logEntry });
    setRolando(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'linear-gradient(180deg, #1a2e22, #0b1612)', border: '2px solid rgba(212,168,87,.6)', borderRadius: 16, padding: '36px 44px', textAlign: 'center', minWidth: 320, boxShadow: '0 0 50px rgba(200,155,60,.3)' }}>
        <div style={{ fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 22, color: '#d4a857', letterSpacing: '.08em', marginBottom: 6 }}>QUEM COMEÇA?</div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 13, color: '#7a6a45', marginBottom: 28 }}>Role os dados para decidir quem joga primeiro</div>

        {resultado ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
              {[{ label: 'VOCÊ', val: resultado.pJ, color: '#5a8a4a' }, { label: 'NPC', val: resultado.pN, color: '#c84d2a' }].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 10, background: `radial-gradient(circle at 35% 35%, ${color}88, #0b1612)`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 28, color: '#e8d5a8', boxShadow: `0 0 12px ${color}66` }}>{val}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color, letterSpacing: '.18em' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: resultado.npcPrimeiro ? '#c84d2a' : '#8ac46a', marginBottom: 24, letterSpacing: '.06em' }}>
              {resultado.npcPrimeiro ? 'NPC começa!' : 'Você começa!'}
            </div>
            <button onClick={() => onResult(resultado.npcPrimeiro, resultado.logEntry)} style={{ padding: '11px 28px', borderRadius: 8, background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 50%, #8a5d1f 95%)', border: '1.5px solid #f5d27a', color: '#0b1612', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, letterSpacing: '.14em', cursor: 'pointer' }}>
              INICIAR BATALHA
            </button>
          </>
        ) : (
          <button onClick={rolar} disabled={rolando} style={{ padding: '12px 32px', borderRadius: 8, background: 'radial-gradient(ellipse at 50% 0%, #f5d27a, #c89b3c 50%, #8a5d1f 95%)', border: '1.5px solid #f5d27a', color: '#0b1612', fontFamily: "'Cinzel Decorative', serif", fontWeight: 900, fontSize: 11, letterSpacing: '.14em', cursor: 'pointer' }}>
            🎲 ROLAR DADOS
          </button>
        )}
      </div>
    </div>
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
