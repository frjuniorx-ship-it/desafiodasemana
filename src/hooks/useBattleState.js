import { useState, useEffect, useCallback, useRef } from 'react';
import { getDesafioById } from '../api/desafios.js';
import { getCartas } from '../api/cartas.js';
import {
  isPersonagem, isEquipamento, isAcaoRapida, isAcaoContinua,
  isFolclorica, isPlanta, podeAtacar, podeEquipar, isInstantanea,
  podeSer_Jogada_Folclorica, resolverCombate, pcPerdidoPorDestruicao,
  SLOTS, LIMITE_TURNO, PC_INICIAL, COMPRA_POR_TURNO, COMPRA_MAO_VAZIA,
} from '../engine/rules.js';

const normStr = s =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-_]/g, ' ').trim();

async function buscarCartaFuzzy(nome) {
  const cartas = await getCartas();
  const n = normStr(nome);
  let found = cartas.find(c => normStr(c.nome) === n);
  if (found) return { carta: found, sugestao: null };
  const palavras = n.split(' ').filter(p => p.length > 2);
  if (palavras.length > 0) {
    found = cartas.find(c => {
      const cn = normStr(c.nome);
      return palavras.filter(p => cn.includes(p)).length >= Math.min(2, palavras.length);
    });
    if (found) return { carta: found, sugestao: null };
  }
  const sugerida = cartas.find(c => palavras.some(p => normStr(c.nome).includes(p)));
  return { carta: null, sugestao: sugerida?.nome ?? null };
}

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

  const category = entrada.categoria ?? entrada.tipo ?? entrada.category ?? 'Personagem';
  return {
    name:       entrada.nome      ?? entrada.name      ?? '',
    category,
    tipo:       category, // alias para compatibilidade com rules.js
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
    equipamentos: [],
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


function categoriaParaZona(categoria) {
  if (!categoria) return 'personagens';
  const c = categoria.toLowerCase();
  if (c === 'planta') return 'plantas';
  if (c.startsWith('folcl')) return 'folcloricas';
  if (c === 'ação' || c === 'acao') return 'acao';
  return 'personagens'; // Histórica, Apoio, Fera, Personagem
}

const campoPadrao = () => ({
  personagens: Array(SLOTS.personagens).fill(null),
  plantas:     Array(SLOTS.plantas).fill(null),
  folcloricas: [],
  acao: null,
});

export function useBattleState(npc) {
  const [loading, setLoading] = useState(true);
  const [deckNpc, setDeckNpc]             = useState([]);
  const [maoNpc, setMaoNpc]               = useState([]);
  const [campoNpc, setCampoNpc]           = useState(campoPadrao);
  const [esquecimentoNpc, setEsquecimentoNpc] = useState([]);
  const [pcNpc, setPcNpc]                 = useState(PC_INICIAL);
  const [campoJogador, setCampoJogador]   = useState(campoPadrao);
  const [pcJogador, setPcJogador]         = useState(PC_INICIAL);
  const [turno, setTurno]                 = useState(0);
  const [vezDoNpc, setVezDoNpc]           = useState(false);
  const [log, setLog]                     = useState([]);
  const [fimDeJogo, setFimDeJogo]         = useState(null); // null | 'vitoria' | 'derrota'
  const [prontoParaJogar, setProntoParaJogar] = useState(false);
  const [combatePendente, setCombatePendente] = useState(null); // null | { atacanteNome, alvoNome, dano }
  const npcComecouRef = useRef(false);
  const npcAutoStartRef = useRef(false);

  useEffect(() => {
    if (!npc?._id) return;
    setLoading(true);
    getDesafioById(npc._id)
      .then(data => {
        const todasCartas = expandirDeck(data.deck ?? []);
        const embaralhado = shuffle(todasCartas);
        // NPC começa com mão vazia — cartas distribuídas em iniciarJogo()
        setMaoNpc([]);
        setDeckNpc(embaralhado);
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

    // 1. Comprar carta(s) — quem começa não compra no turno 1 (regra 10.0)
    await delay(800);
    const ehPrimeiroTurnoNpc = nextTurno === 1;
    const qtd = workMao.length === 0
      ? COMPRA_MAO_VAZIA
      : (ehPrimeiroTurnoNpc && npcComecouRef.current ? 0 : COMPRA_POR_TURNO);
    const compradas = workDeck.splice(0, qtd);
    workMao = [...workMao, ...compradas];
    setDeckNpc([...workDeck]);
    setMaoNpc([...workMao]);
    if (compradas.length > 0)
      addLog(`[NPC] Comprou ${compradas.length} carta${compradas.length !== 1 ? 's' : ''}`, '#a89870');

    // 2. Jogar personagem (Histórica, Fera, ou Apoio+mecanica:personagem)
    await delay(800);
    if (!flags.jogouPersonagem) {
      const mi = workMao.findIndex(c => isPersonagem(c));
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
      const mi = workMao.findIndex(c => isEquipamento(c));
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
      const mi = workMao.findIndex(c => isAcaoRapida(c) || isAcaoContinua(c));
      if (mi !== -1) {
        const carta = workMao[mi];
        workMao.splice(mi, 1);
        flags.jogouAcao = true;
        if (isAcaoContinua(carta)) {
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

    // 5. Jogar planta — entra oculta exceto instantâneas (regra 35.0)
    await delay(800);
    if (!flags.jogouPlanta) {
      const mi = workMao.findIndex(c => isPlanta(c));
      const si = workCampo.plantas.indexOf(null);
      if (mi !== -1 && si !== -1) {
        const raw = workMao[mi];
        const oculta = !isInstantanea(raw);
        const carta = { ...raw, oculta };
        workMao.splice(mi, 1);
        workCampo.plantas[si] = carta;
        flags.jogouPlanta = true;
        setMaoNpc([...workMao]);
        setCampoNpc({ ...workCampo, plantas: [...workCampo.plantas] });
        addLog(`[NPC] Jogou ${oculta ? 'uma planta' : carta.name} em campo`, '#8ac46a');
      }
    }

    // 6. Jogar folclórica (nd cartas descartadas da mão, excluindo a própria)
    await delay(800);
    if (!flags.jogouFolclorica) {
      const mi = workMao.findIndex(c => podeSer_Jogada_Folclorica(c, workMao));
      if (mi !== -1) {
        const folc = workMao[mi];
        const nd = folc.nd ?? folc.numero_descarte ?? 0;
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

    // 7. Atacar (regra 21.0: só personagens com entrou_turno_atual: false)
    await delay(800);
    {
      const atacantes = workCampo.personagens.filter(c => c && podeAtacar(c));
      const alvos = campoJogador.personagens.filter(Boolean);
      for (const atk of atacantes) {
        await delay(800);
        if (alvos.length > 0) {
          setCombatePendente({ atacanteNome: atk.name, alvoNome: alvos[0].name, dano: atk.atk ?? 0 });
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

  // Dispara o primeiro turno do NPC após o estado da mão ser atualizado por iniciarJogo.
  // Fica DEPOIS de npcExecutarTurno para evitar ReferenceError de temporal dead zone (const).
  useEffect(() => {
    if (prontoParaJogar && npcComecouRef.current && !npcAutoStartRef.current) {
      npcAutoStartRef.current = true;
      npcExecutarTurno();
    }
  }, [prontoParaJogar, npcExecutarTurno]);

  useEffect(() => {
    if (!prontoParaJogar || fimDeJogo) return;
    if (pcJogador <= 0) setFimDeJogo('derrota');
    if (pcNpc <= 0) setFimDeJogo('vitoria');
  }, [pcJogador, pcNpc, prontoParaJogar, fimDeJogo]);

  const jogadorJogarCarta = useCallback(async (nome) => {
    const { carta: raw, sugestao } = await buscarCartaFuzzy(nome);
    if (!raw) {
      console.warn('[jogador] carta não encontrada na API:', nome);
      return { carta: null, sugestao };
    }
    const normalizada = normalizeCardForSlot(raw);
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
    return { carta: normalizada, sugestao: null };
  }, []);

  const jogadorEquiparCarta = useCallback(async (nomeEquip, nomeAlvo) => {
    const { carta: rawEquip } = await buscarCartaFuzzy(nomeEquip);
    if (!rawEquip) return { ok: false, msg: `Equipamento "${nomeEquip}" não encontrado.` };
    const equip = normalizeCardForSlot(rawEquip);
    const nAlvo = normStr(nomeAlvo);
    const idx = campoJogador.personagens.findIndex(c => {
      if (!c) return false;
      const cn = normStr(c.name);
      return cn.includes(nAlvo) || nAlvo.includes(cn);
    });
    if (idx === -1) return { ok: false, msg: `Personagem "${nomeAlvo}" não está em campo.` };
    const alvoNome = campoJogador.personagens[idx].name;
    setCampoJogador(prev => {
      const personagens = [...prev.personagens];
      const alvo = personagens[idx];
      personagens[idx] = { ...alvo, equipamentos: [...(alvo.equipamentos ?? []), equip] };
      return { ...prev, personagens };
    });
    return { ok: true, equipNome: equip.name, alvoNome };
  }, [campoJogador]);

  const jogadorAtacar = useCallback((nomeAtacante, nomeAlvo) => {
    const nAtk = normStr(nomeAtacante);
    const nAlv = normStr(nomeAlvo);
    const atacante = campoJogador.personagens.find(c => c && normStr(c.name).includes(nAtk));
    if (!atacante) return { ok: false, msg: `"${nomeAtacante}" não está em campo.` };
    if (!podeAtacar(atacante)) return { ok: false, msg: `${atacante.name} não pode atacar este turno (entrou agora).` };
    const alvo = campoNpc.personagens.find(c => c && normStr(c.name).includes(nAlv));
    if (!alvo) return { ok: false, msg: `"${nomeAlvo}" não encontrado no campo do NPC.` };
    const { defensoraDestruida, atacanteDestruido, danoAoPC } = resolverCombate(atacante, alvo);
    const addLog = (text, color = '#e8d5a8') =>
      setLog(prev => [...prev, { t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text, color }]);
    if (defensoraDestruida) {
      const pcPerdido = pcPerdidoPorDestruicao(alvo);
      setPcNpc(p => Math.max(0, p - pcPerdido - danoAoPC));
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const i = personagens.findIndex(c => c?.name === alvo.name);
        if (i !== -1) personagens[i] = null;
        return { ...prev, personagens };
      });
      addLog(`[COMBATE] ${atacante.name} destruiu ${alvo.name}! NPC perde ${pcPerdido} PC.`, '#f5d27a');
    } else {
      addLog(`[COMBATE] ${atacante.name} atacou ${alvo.name} — não destruiu (DEF suficiente).`, '#a89870');
    }
    if (atacanteDestruido) {
      const pcPerdido = pcPerdidoPorDestruicao(atacante);
      setPcJogador(p => Math.max(0, p - pcPerdido));
      setCampoJogador(prev => {
        const personagens = [...prev.personagens];
        const i = personagens.findIndex(c => c?.name === atacante.name);
        if (i !== -1) personagens[i] = null;
        return { ...prev, personagens };
      });
      addLog(`[COMBATE] ${atacante.name} foi destruído pelo contra-ataque! Você perde ${pcPerdido} PC.`, '#c84d2a');
    }
    return { ok: true };
  }, [campoJogador, campoNpc]);

  const jogadorAtaqueDireto = useCallback((nomeAtacante) => {
    const nAtk = normStr(nomeAtacante);
    const atacante = campoJogador.personagens.find(c => c && normStr(c.name).includes(nAtk));
    if (!atacante) return { ok: false, msg: `"${nomeAtacante}" não está em campo.` };
    if (!podeAtacar(atacante)) return { ok: false, msg: `${atacante.name} não pode atacar este turno.` };
    const dano = atacante.atk ?? 0;
    setPcNpc(p => Math.max(0, p - dano));
    setLog(prev => [...prev, { t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: `[COMBATE DIRETO] ${atacante.name} causou ${dano} de dano direto ao NPC!`, color: '#f5d27a' }]);
    return { ok: true, dano };
  }, [campoJogador]);

  const confirmarCombate = useCallback(() => {
    setCombatePendente(prev => {
      if (!prev) return null;
      setPcJogador(p => Math.max(0, p - prev.dano));
      setLog(logs => [...logs, { t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: `[COMBATE] Confirmado — ${prev.atacanteNome} causou ${prev.dano} de dano.`, color: '#c84d2a' }]);
      return null;
    });
  }, []);

  const aplicarResultadoCombate = useCallback((atacanteCard, defensoraCard) => {
    const { defensoraDestruida, atacanteDestruido, danoAoPC } = resolverCombate(atacanteCard, defensoraCard);
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    if (defensoraDestruida) {
      const pc = pcPerdidoPorDestruicao(defensoraCard) + danoAoPC;
      setPcJogador(p => Math.max(0, p - pc));
      setCampoJogador(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c?.name === defensoraCard.name ? null : c),
      }));
      addLog(`[COMBATE] ${atacanteCard.name} destruiu ${defensoraCard.name}! Você perde ${pc} PC.`, '#c84d2a');
    } else {
      addLog(`[COMBATE] ${defensoraCard.name} resistiu ao ataque de ${atacanteCard.name}!`, '#8ac46a');
    }
    if (atacanteDestruido) {
      const pc = pcPerdidoPorDestruicao(atacanteCard);
      setPcNpc(p => Math.max(0, p - pc));
      setCampoNpc(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? null : c),
      }));
      addLog(`[COMBATE] ${defensoraCard.name} contra-atacou e destruiu ${atacanteCard.name}! NPC perde ${pc} PC.`, '#f5d27a');
    }
    setCombatePendente(null);
    return { defensoraDestruida, atacanteDestruido };
  }, []);

  const iniciarJogo = useCallback((npcPrimeiro) => {
    npcComecouRef.current = npcPrimeiro;
    const mao5 = deckNpc.slice(0, 5);
    const resto = deckNpc.slice(5);
    setMaoNpc(mao5);
    setDeckNpc(resto);
    setProntoParaJogar(true);
    // NPC auto-start handled by useEffect watching [prontoParaJogar, npcExecutarTurno]
  }, [deckNpc]);

  return {
    loading,
    deckNpc, maoNpc, campoNpc, esquecimentoNpc, pcNpc,
    campoJogador, pcJogador,
    turno, vezDoNpc, log, fimDeJogo, prontoParaJogar,
    combatePendente,
    npcJogarCarta, jogadorJogarCarta, jogadorEquiparCarta,
    jogadorAtacar, jogadorAtaqueDireto, confirmarCombate, aplicarResultadoCombate,
    passarVez: npcExecutarTurno,
    iniciarJogo,
  };
}
