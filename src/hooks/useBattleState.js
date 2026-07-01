import { useState, useEffect, useCallback } from 'react';
import { getDesafioById } from '../api/desafios.js';
import { getCartaByNome } from '../api/cartas.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Unifica os diferentes shapes de carta da API num formato único para os slots.
// Lida com: deck entries (atq/def/imagem_url), adaptarCarta output (atq/def/imagemUrl),
// e data.js legacy (atk/def/name/category).
function normalizeCardForSlot(entrada) {
  const efeitos = entrada.efeito ?? [];
  const effectText = Array.isArray(efeitos)
    ? efeitos.map(e => e.display_name ?? e.name ?? '').filter(Boolean).join(' · ')
    : '';

  return {
    name:       entrada.nome      ?? entrada.name      ?? '',
    category:   entrada.categoria ?? entrada.tipo      ?? entrada.category ?? 'Personagem',
    atk:        entrada.atq       ?? entrada.ataque    ?? entrada.atk      ?? 0,
    def:        entrada.def       ?? entrada.defesa    ?? 0,
    pc:         entrada.pc        ?? entrada.pontos_conhecimento ?? 0,
    imagem_url: entrada.imagem_url ?? entrada.imagemUrl ?? '',
    effect:     effectText,
    wp_id:      entrada.wp_id ?? null,
    nd:         entrada.nd ?? null,
    mecanica:   toArray(entrada.mecanica ?? entrada.mecanicas ?? []),
    classes:    toArray(entrada.classe   ?? entrada.classes   ?? []),
    entrou_turno_atual: false,
  };
}

// Expande deck API [{nome, copias, ...}] → array de cartas individuais normalizadas
function expandirDeck(deckEntradas) {
  const cartas = [];
  for (const entrada of deckEntradas) {
    const copias = entrada.copias ?? 1;
    const carta = normalizeCardForSlot(entrada);
    for (let i = 0; i < copias; i++) {
      cartas.push({ ...carta });
    }
  }
  return cartas;
}

function toArray(v) { return Array.isArray(v) ? v : v ? [v] : []; }

// Identifica o papel de jogo de uma carta normalizada
function getCardType(c) {
  const cat = (c.category || '').toLowerCase();
  const mec = c.mecanica || [];
  if (cat === 'planta') return 'planta';
  if (cat.startsWith('folcl')) return 'folclorica';
  if (cat === 'ação' || cat === 'acao') return 'acao_rapida';
  if (cat === 'apoio') {
    if (mec.includes('equipamento'))    return 'equipamento';
    if (mec.includes('acao_instantanea')) return 'acao_rapida';
    if (mec.includes('acao_continua') || mec.includes('acao_turno')) return 'acao_continua';
    if (mec.includes('personagem'))     return 'personagem';
    return 'apoio';
  }
  return 'personagem'; // Histórica, Fera, Personagem — default
}

// Equipamento pode ser usado num personagem se classes compatíveis (ou sem restrição)
function podeEquipar(equip, personagem) {
  const ce = equip.classes || [];
  const cp = personagem.classes || [];
  return ce.length === 0 || ce.some(c => cp.includes(c));
}

function categoriaParaZona(categoria) {
  if (!categoria) return 'personagens';
  const c = categoria.toLowerCase();
  if (c === 'planta') return 'plantas';
  if (c.startsWith('folcl')) return 'folcloricas';
  if (c === 'ação' || c === 'acao') return 'acao';
  return 'personagens'; // Histórica, Apoio, Fera, Personagem
}

const campoPadrao = () => ({
  personagens: [null, null, null, null, null],
  plantas: [null, null, null],
  folcloricas: [],
  acao: null,
});

export function useBattleState(npc) {
  const [loading, setLoading] = useState(true);
  const [deckNpc, setDeckNpc]             = useState([]);
  const [maoNpc, setMaoNpc]               = useState([]);
  const [campoNpc, setCampoNpc]           = useState(campoPadrao);
  const [esquecimentoNpc, setEsquecimentoNpc] = useState([]);
  const [pcNpc, setPcNpc]                 = useState(20);
  const [campoJogador, setCampoJogador]   = useState(campoPadrao);
  const [pcJogador, setPcJogador]         = useState(20);
  const [turno, setTurno]                 = useState(0);
  const [vezDoNpc, setVezDoNpc]           = useState(false);
  const [log, setLog]                     = useState([]);
  const [fimDeJogo, setFimDeJogo]         = useState(null); // null | 'vitoria' | 'derrota'

  useEffect(() => {
    if (!npc?._id) return;
    setLoading(true);
    getDesafioById(npc._id)
      .then(data => {
        const todasCartas = expandirDeck(data.deck ?? []);
        const embaralhado = shuffle(todasCartas);
        setMaoNpc(embaralhado.slice(0, 5));
        setDeckNpc(embaralhado.slice(5));
      })
      .catch(e => console.error('[useBattleState] erro ao carregar deck:', e.message))
      .finally(() => setLoading(false));
  }, [npc?._id]);

  const npcJogarCarta = useCallback((carta, zona) => {
    setCampoNpc(prev => {
      const next = { ...prev };
      if (zona === 'personagens') {
        const idx = next.personagens.indexOf(null);
        if (idx === -1) return prev;
        next.personagens = [...next.personagens];
        next.personagens[idx] = carta;
      } else if (zona === 'plantas') {
        const idx = next.plantas.indexOf(null);
        if (idx === -1) return prev;
        next.plantas = [...next.plantas];
        next.plantas[idx] = carta;
      } else if (zona === 'folcloricas') {
        next.folcloricas = [...next.folcloricas, carta];
      } else if (zona === 'acao') {
        next.acao = carta;
      }
      return next;
    });
    setMaoNpc(prev => {
      const idx = prev.findIndex(c => c.name === carta.name && c.wp_id === carta.wp_id);
      return idx === -1 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const npcExecutarTurno = useCallback(async () => {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    const now = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') =>
      setLog(prev => [...prev, { t: now(), text, color }]);

    // Cópias de trabalho — evita stale closure após awaits
    let workMao   = [...maoNpc];
    let workDeck  = [...deckNpc];
    let workCampo = {
      ...campoNpc,
      personagens: [...campoNpc.personagens],
      plantas:     [...campoNpc.plantas],
      folcloricas: [...campoNpc.folcloricas],
    };
    let workEsq = [...esquecimentoNpc];
    let workPcJ = pcJogador;
    let workPcN = pcNpc;
    const nextTurno = turno + 1;

    // Flags regra 20.0/20.1: máximo 1 de cada tipo por turno
    const flags = { jogouPersonagem: false, jogouFolclorica: false, jogouAcao: false, jogouEquipamento: false, jogouPlanta: false };

    const checkFimDeJogo = (pcJ, pcN) => {
      if (pcJ <= 0) { addLog('[FIM] Você foi derrotado. O NPC venceu.', '#c84d2a'); setFimDeJogo('derrota'); return true; }
      if (pcN <= 0) { addLog('[FIM] Você venceu!', '#8ac46a'); setFimDeJogo('vitoria'); return true; }
      return false;
    };

    setVezDoNpc(true);
    setTurno(nextTurno);

    // 1. Comprar carta(s)
    await delay(800);
    const qtd = (nextTurno === 1 || workMao.length === 0) ? 3 : 1;
    const compradas = workDeck.splice(0, qtd);
    workMao = [...workMao, ...compradas];
    setDeckNpc([...workDeck]);
    setMaoNpc([...workMao]);
    if (compradas.length > 0)
      addLog(`[NPC] Comprou ${compradas.length} carta${compradas.length !== 1 ? 's' : ''}`, '#a89870');

    // 2. Jogar personagem (Histórica, Fera, ou Apoio+mecanica:personagem)
    await delay(800);
    if (!flags.jogouPersonagem) {
      const mi = workMao.findIndex(c => getCardType(c) === 'personagem');
      const si = workCampo.personagens.indexOf(null);
      if (mi !== -1 && si !== -1) {
        const carta = { ...workMao[mi], entrou_turno_atual: true };
        workMao.splice(mi, 1);
        workCampo.personagens[si] = carta;
        flags.jogouPersonagem = true;
        setMaoNpc([...workMao]);
        setCampoNpc({ ...workCampo, personagens: [...workCampo.personagens] });
        addLog(`[NPC] Jogou ${carta.name} em campo`, '#c84d2a');
      }
    }

    // 3. Equipar (Apoio+mecanica:equipamento em personagem em campo com classe compatível)
    await delay(800);
    if (!flags.jogouEquipamento) {
      const mi = workMao.findIndex(c => getCardType(c) === 'equipamento');
      if (mi !== -1) {
        const equip = workMao[mi];
        const pi = workCampo.personagens.findIndex(c => c && podeEquipar(equip, c));
        if (pi !== -1) {
          const alvo = workCampo.personagens[pi];
          workCampo.personagens[pi] = { ...alvo, pc: (alvo.pc || 0) + (equip.pc || 0) };
          workMao.splice(mi, 1);
          flags.jogouEquipamento = true;
          setMaoNpc([...workMao]);
          setCampoNpc({ ...workCampo, personagens: [...workCampo.personagens] });
          addLog(`[NPC] Equipou ${equip.name} em ${alvo.name}`, '#d4a857');
        }
      }
    }

    // 4. Jogar ação (acao_rapida → esquecimento; acao_continua → slot de ação)
    await delay(800);
    if (!flags.jogouAcao) {
      const mi = workMao.findIndex(c => { const t = getCardType(c); return t === 'acao_rapida' || t === 'acao_continua'; });
      if (mi !== -1) {
        const carta = workMao[mi];
        const tipo = getCardType(carta);
        workMao.splice(mi, 1);
        flags.jogouAcao = true;
        if (tipo === 'acao_continua') {
          workCampo.acao = carta;
          setCampoNpc({ ...workCampo });
          addLog(`[NPC] Jogou ação ${carta.name}`, '#a8c8e8');
        } else {
          workEsq = [...workEsq, carta];
          setEsquecimentoNpc([...workEsq]);
          addLog(`[NPC] Ativou ação rápida ${carta.name}`, '#a8c8e8');
        }
        setMaoNpc([...workMao]);
      }
    }

    // 5. Jogar planta
    await delay(800);
    if (!flags.jogouPlanta) {
      const mi = workMao.findIndex(c => getCardType(c) === 'planta');
      const si = workCampo.plantas.indexOf(null);
      if (mi !== -1 && si !== -1) {
        const carta = workMao[mi];
        workMao.splice(mi, 1);
        workCampo.plantas[si] = carta;
        flags.jogouPlanta = true;
        setMaoNpc([...workMao]);
        setCampoNpc({ ...workCampo, plantas: [...workCampo.plantas] });
        addLog(`[NPC] Jogou planta ${carta.name}`, '#8ac46a');
      }
    }

    // 6. Jogar folclórica (nd cartas descartadas da mão, excluindo a própria)
    await delay(800);
    if (!flags.jogouFolclorica) {
      const mi = workMao.findIndex(c => getCardType(c) === 'folclorica');
      if (mi !== -1) {
        const folc = workMao[mi];
        const nd = folc.nd ?? 0;
        if (workMao.length - 1 >= nd) {
          const descIdxs = new Set([mi]);
          let cnt = 0;
          for (let i = 0; i < workMao.length && cnt < nd; i++) {
            if (i !== mi) { descIdxs.add(i); cnt++; }
          }
          const descartar = workMao.filter((_, i) => descIdxs.has(i) && i !== mi);
          workEsq = [...workEsq, ...descartar];
          workMao = workMao.filter((_, i) => !descIdxs.has(i));
          workCampo.folcloricas = [...workCampo.folcloricas, folc];
          flags.jogouFolclorica = true;
          setMaoNpc([...workMao]);
          setEsquecimentoNpc([...workEsq]);
          setCampoNpc({ ...workCampo, folcloricas: [...workCampo.folcloricas] });
          addLog(`[NPC] Jogou folclórica ${folc.name}${nd > 0 ? ` (descartou ${nd})` : ''}`, '#e8a890');
        }
      }
    }

    // 7. Atacar (regra 21.0: só personagens com entrou_turno_atual: false)
    await delay(800);
    {
      const atacantes = workCampo.personagens.filter(c => c && !c.entrou_turno_atual);
      const alvos = campoJogador.personagens.filter(Boolean);
      for (const atk of atacantes) {
        await delay(800);
        if (alvos.length > 0) {
          addLog(`[COMBATE] ${atk.name} atacou ${alvos[0].name} — confirme ou responda com carta`, '#c84d2a');
        } else {
          const dano = atk.atk ?? 0;
          workPcJ = Math.max(0, workPcJ - dano);
          setPcJogador(workPcJ);
          addLog(`[COMBATE] Ataque direto! ${atk.name} causou ${dano} de dano`, '#c84d2a');
          if (checkFimDeJogo(workPcJ, workPcN)) return;
        }
      }
    }

    // 8. Passar vez — resetar entrou_turno_atual
    await delay(800);
    workCampo.personagens = workCampo.personagens.map(c => c ? { ...c, entrou_turno_atual: false } : null);
    setCampoNpc({ ...workCampo, personagens: [...workCampo.personagens] });
    setVezDoNpc(false);
    addLog('[AÇÃO] NPC passou a vez — sua jogada', '#7a6a45');
  }, [maoNpc, deckNpc, campoNpc, campoJogador, esquecimentoNpc, pcJogador, pcNpc, turno]);

  const jogadorJogarCarta = useCallback(async (nome) => {
    const carta = await getCartaByNome(nome);
    if (!carta) {
      console.warn('[jogador] carta não encontrada na API:', nome);
      return null;
    }
    const normalizada = normalizeCardForSlot(carta);
    const zona = categoriaParaZona(normalizada.category);
    setCampoJogador(prev => {
      const next = { ...prev };
      if (zona === 'personagens') {
        const idx = next.personagens.indexOf(null);
        if (idx === -1) return prev;
        next.personagens = [...next.personagens];
        next.personagens[idx] = normalizada;
      } else if (zona === 'plantas') {
        const idx = next.plantas.indexOf(null);
        if (idx === -1) return prev;
        next.plantas = [...next.plantas];
        next.plantas[idx] = normalizada;
      } else if (zona === 'folcloricas') {
        next.folcloricas = [...next.folcloricas, normalizada];
      } else if (zona === 'acao') {
        next.acao = normalizada;
      }
      return next;
    });
    return normalizada;
  }, []);

  return {
    loading,
    deckNpc, maoNpc, campoNpc, esquecimentoNpc, pcNpc,
    campoJogador, pcJogador,
    turno, vezDoNpc, log, fimDeJogo,
    npcJogarCarta, jogadorJogarCarta,
    passarVez: npcExecutarTurno,
  };
}
