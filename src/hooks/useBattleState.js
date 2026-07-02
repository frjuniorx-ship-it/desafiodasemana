import { useState, useEffect, useCallback, useRef } from 'react';
import { getDesafioById } from '../api/desafios.js';
import { getCartas } from '../api/cartas.js';
import {
  isPersonagem, isEquipamento, isAcaoRapida, isAcaoContinua,
  isFolclorica, isPlanta, podeAtacar, podeEquipar, isInstantanea, isEspera,
  podeSer_Jogada_Folclorica, resolverCombate, pcPerdidoPorDestruicao,
  podeSerDescartada, calcularFuria, temKeyword, KEYWORDS,
  SLOTS, LIMITE_TURNO, PC_INICIAL, COMPRA_POR_TURNO, COMPRA_MAO_VAZIA,
} from '../engine/rules.js';

export const normStr = s =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-_]/g, ' ').trim();

function simBigramas(a, b) {
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const na = norm(a), nb = norm(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bgs = s => { const bg = new Set(); for (let i = 0; i < s.length - 1; i++) bg.add(s[i] + s[i+1]); return bg; };
  const bgA = bgs(na), bgB = bgs(nb);
  let inter = 0; bgA.forEach(g => { if (bgB.has(g)) inter++; });
  return (2 * inter) / (bgA.size + bgB.size);
}
export const similaridade = simBigramas;

async function buscarCartaFuzzy(nome) {
  const cartas = await getCartas();
  const n = normStr(nome);
  // 1. Exato
  let found = cartas.find(c => normStr(c.nome) === n);
  if (found) return { carta: found, sugestao: null };
  // 2. Inclusão de palavras (>2 chars)
  const palavras = n.split(' ').filter(p => p.length > 2);
  if (palavras.length > 0) {
    found = cartas.find(c => {
      const cn = normStr(c.nome);
      return palavras.filter(p => cn.includes(p)).length >= Math.min(2, palavras.length);
    });
    if (found) return { carta: found, sugestao: null };
  }
  // 3. Palavra longa (>=4 chars)
  const longas = n.split(' ').filter(p => p.length >= 4);
  if (longas.length > 0) {
    found = cartas.find(c => longas.some(p => normStr(c.nome).includes(p)));
    if (found) return { carta: found, sugestao: null };
  }
  // 4. Bigramas (tolerância a erros de transcrição)
  let melhor = null, melhorSim = 0;
  for (const c of cartas) {
    const sim = simBigramas(nome, c.nome ?? '');
    if (sim > melhorSim) { melhorSim = sim; melhor = c; }
  }
  if (melhorSim >= 0.35) return { carta: melhor, sugestao: null };
  if (melhorSim >= 0.2) return { carta: null, sugestao: melhor?.nome ?? null };
  return { carta: null, sugestao: null };
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
    slug:       entrada.slug  ?? null,
    nd:         entrada.nd ?? null,
    mecanica:     toArray(entrada.mecanica     ?? entrada.mecanicas ?? []),
    classes:      toArray(entrada.classe       ?? entrada.classes   ?? []),
    effect_blocks: toArray(entrada.effect_blocks ?? []),
    magia:            entrada.magia              ?? null,
    combo_habilidade: entrada.combo_habilidade   ?? null,
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

// Avalia utilidade de jogar uma folclórica com base no estado atual do campo — pura, sem efeitos
function avaliarUtilidadeFolclorica(folc, estadoCampo) {
  const { campoJogador, campoNpc, pcNpc } = estadoCampo;
  const adversarioTemCampo   = campoJogador.personagens.filter(Boolean).length > 0;
  const adversarioTemPlantas = campoJogador.plantas.filter(Boolean).length > 0;
  const npcTemCampo          = campoNpc.personagens.filter(Boolean).length > 0;
  const slug = folc.slug || '';

  const behaviors = folc.effect_blocks?.flatMap(b =>
    b.actions?.flatMap(a => a.effect_reference?.map(e => e.behavior_slug) ?? []) ?? []
  ).filter(Boolean) ?? [];

  // remove_card — Boitatá e similares: só vale se adversário tem campo forte
  if (slug === 'boitata' || (behaviors.includes('remove_card') && slug !== 'iara')) {
    if (!adversarioTemCampo) return 0;
    const forcaAdversario = campoJogador.personagens.filter(Boolean)
      .reduce((acc, c) => acc + (c.atk ?? c.ataque ?? 0), 0);
    return forcaAdversario > 4 ? 10 : 5;
  }

  // discard_cards — Quibungo: mais útil quando adversário está acumulando mão
  if (slug === 'quibungo' || behaviors.includes('discard_cards')) {
    return adversarioTemCampo ? 3 : 7;
  }

  // apply_status / modify_stats — Gorjala, Pisadeira: só útil com alvo
  if (behaviors.includes('apply_status') || behaviors.includes('modify_stats')) {
    return adversarioTemCampo ? 8 : 0;
  }

  // return_to_hand — Batatão: ótimo contra personagem com DEF alta
  if (behaviors.includes('return_to_hand')) {
    if (!adversarioTemCampo) return 0;
    const temForte = campoJogador.personagens.filter(Boolean)
      .some(c => (c.def ?? c.defesa ?? 0) >= 5);
    return temForte ? 9 : 4;
  }

  // Iara — remove ATQ >= 3: só útil se adversário tem essas cartas
  if (slug === 'iara') {
    const temAlvo = campoJogador.personagens.filter(Boolean)
      .some(c => (c.atk ?? c.ataque ?? 0) >= 3);
    return temAlvo ? 9 : 0;
  }

  // Mão de Cabelo — remove cartas que atacaram
  if (slug === 'mao-de-cabelo') {
    return adversarioTemCampo ? 6 : 0;
  }

  // swap_stats — Uirapuru: útil se adversário tem ATQ > DEF
  if (slug === 'uirapuru' || behaviors.includes('swap_stats')) {
    const temAlvo = campoJogador.personagens.filter(Boolean)
      .some(c => (c.atk ?? c.ataque ?? 0) > (c.def ?? c.defesa ?? 0));
    return temAlvo ? 8 : 0;
  }

  // copy_card — Anhangá: sempre útil se há carta em campo
  if (slug === 'anhanga' || behaviors.includes('copy_card')) {
    return adversarioTemCampo || npcTemCampo ? 7 : 2;
  }

  // return_to_deck — Saci-Pererê: recurso de emergência
  if (slug === 'saci-perere' || behaviors.includes('return_to_deck')) {
    return (pcNpc < 8 && adversarioTemCampo) ? 8 : 0;
  }

  // Vitória-Régia — permite dano direto ao PC: útil se NPC tem campo
  if (slug === 'vitoria-regia') {
    return npcTemCampo ? 7 : 0;
  }

  // Curupira — proíbe magias: útil se adversário tem plantas
  if (slug === 'curupira') {
    return adversarioTemPlantas ? 6 : 2;
  }

  return 2; // utilidade baixa para folclórica não reconhecida
}

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
  const [esquecimentoJogador, setEsquecimentoJogador] = useState([]);
  const [folcloricaPendente, setFolcloricaPendente] = useState(null);
  const [narracaoJogador, setNarracaoJogador] = useState({
    maoDeclarada: null,
    compraDeclarada: false,
    cartasJogadasNesteTurno: { personagem: 0, folclorica: 0, acao: 0, equipamento: 0, planta: 0 },
    turnoAtual: 0,
    maoFinalTurnoAnterior: null,
  });
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

    // Extrai behavior slugs de effect_blocks
    const getBehaviors = (carta) =>
      carta.effect_blocks?.flatMap(b =>
        b.actions?.flatMap(a => a.effect_reference?.map(e => e.behavior_slug) ?? []) ?? []
      ).filter(Boolean) ?? [];

    // Executa efeito de folclórica do NPC (afeta campo do JOGADOR)
    const executarEfeitoFolcloricaNpc = (folc) => {
      const behaviors = getBehaviors(folc);
      const slug = folc.slug || '';
      if (slug === 'boitata' || (behaviors.includes('remove_card') && slug !== 'iara')) {
        setCampoJogador(prev => {
          const personagens = [...prev.personagens];
          const idx = personagens.findIndex(Boolean);
          if (idx !== -1) {
            addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${personagens[idx].name} do seu campo.`, '#c84d2a');
            personagens[idx] = null;
          }
          return { ...prev, personagens };
        });
      } else if (slug === 'quibungo' || behaviors.includes('discard_cards')) {
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'efeito de descarte ativado'}.`, '#c84d2a');
      } else if (behaviors.includes('modify_stats') || slug === 'gorjala') {
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => c ? { ...c, atk: Math.max(0, (c.atk ?? 0) - 2), def: Math.max(0, (c.def ?? 0) - 2) } : null);
          addLog(`[FOLCLÓRICA] ${folc.name}: -2/-2 em seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else if (behaviors.includes('apply_status') || slug === 'pisadeira') {
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => c ? { ...c, paralisada: true } : null);
          addLog(`[FOLCLÓRICA] ${folc.name}: paralisou seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else if (behaviors.includes('return_to_hand')) {
        setCampoJogador(prev => {
          const personagens = [...prev.personagens];
          const idx = personagens
            .map((c, i) => ({ c, i })).filter(({ c }) => c)
            .sort((a, b) => (b.c.def ?? 0) - (a.c.def ?? 0))[0]?.i;
          if (idx !== undefined) {
            addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${personagens[idx].name} à sua mão.`, '#c84d2a');
            personagens[idx] = null;
          }
          return { ...prev, personagens };
        });
      } else if (slug === 'iara') {
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => {
            if (c && (c.atk ?? 0) >= 3) {
              addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${c.name} (ATQ ${c.atk}).`, '#c84d2a');
              return null;
            }
            return c;
          });
          return { ...prev, personagens };
        });
      } else if (slug === 'uirapuru' || behaviors.includes('swap_stats')) {
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => c ? { ...c, atk: c.def ?? 0, def: c.atk ?? 0 } : null);
          addLog(`[FOLCLÓRICA] ${folc.name}: trocou ATQ e DEF dos seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else {
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c84d2a');
      }
    };

    // Executa efeito de planta instantânea do NPC
    const executarEfeitoPlantaNpc = (carta) => {
      const behaviors = getBehaviors(carta);
      if (behaviors.includes('remocao_encantamento') || behaviors.includes('remocao_de_encantamento')) {
        setCampoNpc(prev => ({
          ...prev,
          personagens: prev.personagens.map(c => c ? { ...c, paralisada: false, imobilizada: false, arruinada: false } : null),
        }));
        addLog(`[PLANTA] ${carta.name}: removeu encantamentos do campo NPC.`, '#8ac46a');
      } else if (behaviors.includes('remocao_magia') || behaviors.includes('remocao_de_magia')) {
        setCampoJogador(prev => ({ ...prev, acao: null }));
        addLog(`[PLANTA] ${carta.name}: removeu magia contínua do campo adversário.`, '#8ac46a');
      } else if (behaviors.includes('gain_pc')) {
        setPcNpc(p => p + 2);
        addLog(`[PLANTA] ${carta.name}: NPC recuperou 2 PC.`, '#8ac46a');
      } else if (behaviors.includes('lose_pc')) {
        setPcJogador(p => Math.max(0, p - 2));
        addLog(`[PLANTA] ${carta.name}: você perdeu 2 PC.`, '#c84d2a');
      } else if (behaviors.includes('return_to_hand')) {
        setCampoJogador(prev => {
          const personagens = [...prev.personagens];
          const idx = personagens
            .map((c, i) => ({ c, i })).filter(({ c }) => c)
            .sort((a, b) => (b.c.atk ?? 0) - (a.c.atk ?? 0))[0]?.i;
          if (idx !== undefined) {
            addLog(`[PLANTA] ${carta.name}: devolveu ${personagens[idx].name} à mão adversária.`, '#8ac46a');
            personagens[idx] = null;
          }
          return { ...prev, personagens };
        });
      } else {
        addLog(`[PLANTA] ${carta.name}: efeito ativado.`, '#8ac46a');
      }
    };

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

    // Resetar narração do jogador ao passar vez
    setNarracaoJogador(prev => ({
      ...prev,
      maoFinalTurnoAnterior: prev.maoDeclarada,
      maoDeclarada: null,
      compraDeclarada: false,
      cartasJogadasNesteTurno: { personagem: 0, folclorica: 0, acao: 0, equipamento: 0, planta: 0 },
      turnoAtual: prev.turnoAtual + 1,
    }));

    // Regenerar DEF do campo do jogador (início do turno do NPC = fim do turno do jogador)
    setCampoJogador(prev => ({
      ...prev,
      personagens: prev.personagens.map(c => c && c.defReduzidaTurno
        ? { ...c, defAtual: c.defBase ?? c.def ?? 0, defReduzidaTurno: false }
        : c),
    }));

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
    if (compradas.length > 0) {
      const msgCompra = compradas.length >= 3
        ? '[NPC] Comprou 3 cartas (mão vazia)'
        : '[NPC] Comprou uma carta';
      addLog(msgCompra, '#a89870');
    }

    // 2. Jogar personagem — heurística: maior ATK se oponente tem campo, maior DEF se vazio
    await delay(800);
    if (!flags.jogouPersonagem) {
      // rules.js isPersonagem verifica 'Histórica'/'Fera'; API pode retornar 'Personagem' — inclui ambos
      const candidatos = workMao.filter(c => isPersonagem(c) || c.tipo === 'Personagem');
      const si = workCampo.personagens.indexOf(null);
      if (candidatos.length > 0 && si !== -1) {
        const adversarioTemCampo = campoJogador.personagens.some(Boolean);
        const melhor = adversarioTemCampo
          ? candidatos.slice().sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0))[0]
          : candidatos.slice().sort((a, b) => (b.def ?? 0) - (a.def ?? 0))[0];
        const carta = { ...melhor, entrou_turno_atual: true };
        const mi = workMao.findIndex(c => c === melhor);
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
          workCampo.personagens[pi] = {
            ...alvo,
            atkBase: alvo.atkBase ?? alvo.atk ?? 0,
            defBase: alvo.defBase ?? alvo.def ?? 0,
            atk: (alvo.atkBase ?? alvo.atk ?? 0) + (equip.atk ?? 0),
            def: (alvo.defBase ?? alvo.def ?? 0) + (equip.def ?? 0),
            pc: (alvo.pc ?? 0) + (equip.pc ?? 0),
            equipamentos: [...(alvo.equipamentos ?? []), equip],
          };
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

    // 5. Jogar folclórica com critério de utilidade — só joga se utilidade >= 5
    await delay(800);
    if (!flags.jogouFolclorica) {
      const estadoAtual = { campoJogador, campoNpc: workCampo, pcJogador, pcNpc };
      const candidatas = workMao
        .filter(c => isFolclorica(c) && podeSer_Jogada_Folclorica(c, workMao))
        .map(c => ({ carta: c, utilidade: avaliarUtilidadeFolclorica(c, estadoAtual) }))
        .filter(({ utilidade }) => utilidade >= 5)
        .sort((a, b) => b.utilidade - a.utilidade);

      if (candidatas.length > 0) {
        const { carta: folc } = candidatas[0];
        const nd = folc.nd ?? folc.numero_descarte ?? 0;
        const fodder = workMao.filter(c => c !== folc && podeSerDescartada(c)).slice(0, nd);
        if (fodder.length > 0)
          addLog(`[NPC] Descarta ${fodder.map(c => c.name).join(', ')} para ativar ${folc.name}`, '#e8a890');
        addLog(`[NPC] Efeito: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}`, '#c89b3c');
        workMao = workMao.filter(c => c !== folc && !fodder.includes(c));
        workEsq = [...workEsq, ...fodder];
        workCampo.folcloricas = [...workCampo.folcloricas, folc];
        flags.jogouFolclorica = true;
        setMaoNpc([...workMao]);
        setEsquecimentoNpc([...workEsq]);
        setCampoNpc({ ...workCampo, folcloricas: [...workCampo.folcloricas] });
        executarEfeitoFolcloricaNpc(folc);
      }
    }

    // 6. Jogar planta — preferir instantânea (revela + ativa efeito), senão oculta (regra 35.0)
    await delay(800);
    if (!flags.jogouPlanta) {
      const si = workCampo.plantas.indexOf(null);
      if (si !== -1) {
        const instMi = workMao.findIndex(c => isPlanta(c) && isInstantanea(c));
        const mi = instMi !== -1 ? instMi : workMao.findIndex(c => isPlanta(c));
        if (mi !== -1) {
          const raw = workMao[mi];
          const oculta = instMi === -1;
          const carta = { ...raw, oculta, entrou_turno_atual: true };
          workMao.splice(mi, 1);
          workCampo.plantas[si] = carta;
          flags.jogouPlanta = true;
          setMaoNpc([...workMao]);
          setCampoNpc({ ...workCampo, plantas: [...workCampo.plantas] });
          addLog(`[NPC] Jogou ${oculta ? 'uma planta' : carta.name} em campo`, '#8ac46a');
          if (!oculta) executarEfeitoPlantaNpc(carta);
        }
      }
    }

    // 7. Atacar — calcularFuria, evitar VENENO_MORTAL, respeitar ATRAIR, preferir menor DEF
    await delay(800);
    {
      const atacantes = workCampo.personagens.filter(c => c && podeAtacar(c));
      const totalEmCampo = workCampo.personagens.filter(Boolean).length;
      const alvosJogador = campoJogador.personagens.filter(Boolean);
      // ATRAIR: se algum alvo tem ATRAIR, todos os ataques devem ser direcionados a ele
      const alvoAtrair = alvosJogador.find(c => temKeyword(c, KEYWORDS.ATRAIR));

      for (const atk of atacantes) {
        await delay(800);
        const atkEfetivo = (atk.atk ?? 0) + calcularFuria(atk, totalEmCampo);

        if (alvosJogador.length > 0) {
          let candidatos = alvoAtrair ? [alvoAtrair] : alvosJogador;
          // Evitar VENENO_MORTAL quando possível
          const semVeneno = candidatos.filter(c => !temKeyword(c, KEYWORDS.VENENO_MORTAL));
          if (semVeneno.length > 0) candidatos = semVeneno;
          // Preferir alvo com menor DEF (mais fácil de destruir)
          const alvo = candidatos.slice().sort((a, b) => (a.def ?? 0) - (b.def ?? 0))[0];
          setCombatePendente({ atacanteNome: atk.name, alvoNome: alvo.name, dano: atkEfetivo, atacante: atk, alvo });
          addLog(`[COMBATE] ${atk.name} atacou ${alvo.name} — confirme ou responda com carta`, '#c84d2a');
          break; // aguarda confirmação antes de continuar ataques
        } else {
          workPcJ = Math.max(0, workPcJ - atkEfetivo);
          setPcJogador(workPcJ);
          addLog(`[COMBATE] Ataque direto! ${atk.name} causou ${atkEfetivo} de dano`, '#c84d2a');
          if (checkFimDeJogo(workPcJ, workPcN)) return;
        }
      }
    }

    // 8. Passar vez — ativar plantas de espera, resetar entrou_turno_atual e regenerar DEF do NPC
    await delay(800);

    // Ativar plantas de espera que aguardaram 1 turno (oculta + !entrou_turno_atual + isEspera)
    workCampo.plantas = workCampo.plantas.map(p => {
      if (p && p.oculta && !p.entrou_turno_atual && isEspera(p)) {
        addLog(`[PLANTA] ${p.name} revelada e ativada (Espera)`, '#8ac46a');
        executarEfeitoPlantaNpc(p);
        return { ...p, oculta: false };
      }
      return p;
    });

    workCampo.personagens = workCampo.personagens.map(c => c ? {
      ...c,
      entrou_turno_atual: false,
      defAtual: c.defBase ?? c.def ?? 0,
      defReduzidaTurno: false,
    } : null);

    // Resetar entrou_turno_atual nas plantas para permitir ativação de espera no próximo turno
    workCampo.plantas = workCampo.plantas.map(p =>
      p && p.entrou_turno_atual ? { ...p, entrou_turno_atual: false } : p
    );

    setCampoNpc({ ...workCampo, personagens: [...workCampo.personagens], plantas: [...workCampo.plantas] });
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

  const executarEfeitoFolclorica = useCallback((folc) => {
    const slug = folc.slug || '';
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    const behaviors = folc.effect_blocks?.flatMap(b =>
      b.actions?.flatMap(a => a.effect_reference?.map(e => e.behavior_slug) ?? []) ?? []
    ).filter(Boolean) ?? [];

    if (slug === 'boitata' || (behaviors.includes('remove_card') && slug !== 'iara')) {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens.findIndex(Boolean);
        if (idx !== -1) {
          addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${personagens[idx].name} do campo do NPC (sem PC).`, '#c89b3c');
          personagens[idx] = null;
        }
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'quibungo' || behaviors.includes('discard_cards')) {
      addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'efeito de descarte ativado'}.`, '#c89b3c');
      return;
    }
    if ((behaviors.includes('modify_stats') && !behaviors.includes('apply_status')) || slug === 'gorjala') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => c ? { ...c, atk: Math.max(0, (c.atk ?? 0) - 2), def: Math.max(0, (c.def ?? 0) - 2) } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: -2/-2 em personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    if (behaviors.includes('apply_status') || slug === 'pisadeira') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => c ? { ...c, paralisada: true } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: paralisou personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    if (behaviors.includes('return_to_hand') || slug === 'batata' || slug === 'caboclo-dagua') {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens
          .map((c, i) => ({ c, i })).filter(({ c }) => c)
          .sort((a, b) => (b.c.def ?? 0) - (a.c.def ?? 0))[0]?.i;
        if (idx !== undefined) {
          addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${personagens[idx].name} à mão do NPC.`, '#c89b3c');
          personagens[idx] = null;
        }
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'iara') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => {
          if (c && (c.atk ?? 0) >= 3) {
            addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${c.name} (ATQ ${c.atk}).`, '#c89b3c');
            return null;
          }
          return c;
        });
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'uirapuru' || behaviors.includes('swap_stats')) {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => c ? { ...c, atk: c.def ?? 0, def: c.atk ?? 0 } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: trocou ATQ e DEF dos personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c89b3c');
  }, [campoNpc]);

  const resolverCombateCompleto = useCallback((atacanteCard, defensoraCard, npcAtaca = true) => {
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    const atkA = atacanteCard.atk ?? 0;
    const defD = defensoraCard.defAtual ?? defensoraCard.def ?? 0;
    const temVeneno = temKeyword(defensoraCard, KEYWORDS.VENENO_MORTAL);
    const temAtravessar = temKeyword(atacanteCard, KEYWORDS.ATRAVESSAR);
    const defensoraDestruida = atkA >= defD;
    const danoAoPC = defensoraDestruida && temAtravessar ? atkA - defD : 0;

    if (defensoraDestruida) {
      const pcPerdido = pcPerdidoPorDestruicao(defensoraCard);
      if (npcAtaca) {
        setPcJogador(p => Math.max(0, p - pcPerdido - danoAoPC));
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === defensoraCard.name ? null : c) }));
        addLog(`[COMBATE] ${atacanteCard.name} destruiu ${defensoraCard.name}! Você perde ${pcPerdido + danoAoPC} PC.`, '#c84d2a');
      } else {
        setPcNpc(p => Math.max(0, p - pcPerdido - danoAoPC));
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === defensoraCard.name ? null : c) }));
        addLog(`[COMBATE] ${atacanteCard.name} destruiu ${defensoraCard.name}! NPC perde ${pcPerdido + danoAoPC} PC.`, '#f5d27a');
      }
      if (temVeneno) {
        if (npcAtaca) {
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? null : c) }));
        } else {
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? null : c) }));
        }
        addLog(`[VENENO] ${defensoraCard.name} envenenou ${atacanteCard.name} — removido sem PC.`, '#8a4a8a');
      }
    } else {
      const novaDefD = defD - atkA;
      if (npcAtaca) {
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === defensoraCard.name ? { ...c, defAtual: novaDefD, defReduzidaTurno: true } : c) }));
      } else {
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === defensoraCard.name ? { ...c, defAtual: novaDefD, defReduzidaTurno: true } : c) }));
      }
    }

    // Contra-ataque (regra 24.0) — paralisada contra-ataca (regra 27.0)
    if (!temVeneno) {
      const atkD = defensoraCard.atk ?? 0;
      const defA = atacanteCard.defAtual ?? atacanteCard.def ?? 0;
      const atacanteDestruido = atkD >= defA;
      if (atacanteDestruido) {
        const pcPerdido = pcPerdidoPorDestruicao(atacanteCard);
        if (npcAtaca) {
          setPcNpc(p => Math.max(0, p - pcPerdido));
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? null : c) }));
          addLog(`[CONTRA-ATAQUE] ${defensoraCard.name} destruiu ${atacanteCard.name}! NPC perde ${pcPerdido} PC.`, '#f5d27a');
        } else {
          setPcJogador(p => Math.max(0, p - pcPerdido));
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? null : c) }));
          addLog(`[CONTRA-ATAQUE] ${defensoraCard.name} destruiu ${atacanteCard.name}! Você perde ${pcPerdido} PC.`, '#c84d2a');
        }
      } else if (atkD > 0) {
        const novaDefA = defA - atkD;
        if (npcAtaca) {
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? { ...c, defAtual: novaDefA, defReduzidaTurno: true } : c) }));
        } else {
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(c => c?.name === atacanteCard.name ? { ...c, defAtual: novaDefA, defReduzidaTurno: true } : c) }));
        }
      }
    }

    setCombatePendente(null);
  }, []);

  const jogadorIniciarFolclorica = useCallback(async (nomeFolc) => {
    const { carta: raw, sugestao } = await buscarCartaFuzzy(nomeFolc);
    if (!raw) return { ok: false, sugestao, msg: `Folclórica "${nomeFolc}" não encontrada.` };
    const folc = normalizeCardForSlot(raw);
    const nd = folc.nd ?? 0;
    if (nd === 0) {
      executarEfeitoFolclorica(folc);
      setCampoJogador(prev => ({ ...prev, folcloricas: [...prev.folcloricas, folc] }));
      const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLog(prev => [...prev, { t: ts, text: `[FOLCLÓRICA] Você ativou ${folc.name}.`, color: '#c89b3c' }]);
      return { ok: true, carta: folc, precisaDescarte: false };
    }
    setFolcloricaPendente(folc);
    return { ok: true, carta: folc, precisaDescarte: true, nd };
  }, [executarEfeitoFolclorica]);

  const jogadorCompletarFolclorica = useCallback((cartasDescarte) => {
    if (!folcloricaPendente) return { ok: false, msg: 'Nenhuma folclórica pendente.' };
    const folc = folcloricaPendente;
    setCampoJogador(prev => {
      let personagens = [...prev.personagens];
      for (const nome of cartasDescarte) {
        const n = normStr(nome);
        const idx = personagens.findIndex(c => c && normStr(c.name).includes(n));
        if (idx !== -1) personagens[idx] = null;
      }
      return { ...prev, personagens, folcloricas: [...prev.folcloricas, folc] };
    });
    setEsquecimentoJogador(prev => [...prev, ...cartasDescarte.map(n => ({ name: n, category: 'Descarte' }))]);
    executarEfeitoFolclorica(folc);
    const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLog(prev => [...prev, { t: ts, text: `[FOLCLÓRICA] ${folc.name} ativado após descarte.`, color: '#c89b3c' }]);
    setFolcloricaPendente(null);
    return { ok: true, carta: folc };
  }, [folcloricaPendente, executarEfeitoFolclorica]);

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

  const jogadorRevelarPlanta = useCallback(async (nomeCarta, slotIndex) => {
    const { carta: raw, sugestao } = await buscarCartaFuzzy(nomeCarta);
    if (!raw) return { ok: false, sugestao };
    const normalizada = normalizeCardForSlot(raw);
    setCampoJogador(prev => {
      const plantas = [...prev.plantas];
      if (slotIndex !== undefined && plantas[slotIndex]?.oculta) {
        plantas[slotIndex] = { ...normalizada, oculta: false };
        return { ...prev, plantas };
      }
      const idx = plantas.findIndex(c => c?.oculta);
      if (idx === -1) return prev;
      plantas[idx] = { ...normalizada, oculta: false };
      return { ...prev, plantas };
    });
    return { ok: true, carta: normalizada };
  }, []);

  const jogadorJogarPlantaVirada = useCallback(() => {
    const temSlot = campoJogador.plantas.includes(null);
    if (!temSlot) return { ok: false, msg: 'Campo de plantas cheio.' };
    setCampoJogador(prev => {
      const idx = prev.plantas.indexOf(null);
      if (idx === -1) return prev;
      const plantas = [...prev.plantas];
      plantas[idx] = { name: '???', category: 'Planta', tipo: 'Planta', oculta: true, atk: 0, def: 0, pc: 0, imagem_url: '', entrou_turno_atual: false, equipamentos: [] };
      return { ...prev, plantas };
    });
    return { ok: true };
  }, [campoJogador]);

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
      personagens[idx] = {
        ...alvo,
        atkBase: alvo.atkBase ?? alvo.atk ?? 0,
        defBase: alvo.defBase ?? alvo.def ?? 0,
        atk: (alvo.atkBase ?? alvo.atk ?? 0) + (equip.atk ?? 0),
        def: (alvo.defBase ?? alvo.def ?? 0) + (equip.def ?? 0),
        pc: (alvo.pc ?? 0) + (equip.pc ?? 0),
        equipamentos: [...(alvo.equipamentos ?? []), equip],
      };
      return { ...prev, personagens };
    });
    return { ok: true, equipNome: equip.name, alvoNome };
  }, [campoJogador]);

  const jogadorAtacar = useCallback((nomeAtacante, nomeAlvo) => {
    const buscarNoCampo = (campo, nome) => campo.personagens.reduce((best, c) => {
      if (!c) return best;
      const n = normStr(nome ?? '');
      const sim = Math.max(simBigramas(nome, c.name), n && normStr(c.name).includes(n) ? 1 : 0);
      return sim > (best?.sim ?? 0) ? { c, sim } : best;
    }, null)?.c;

    const atacante = nomeAtacante
      ? buscarNoCampo(campoJogador, nomeAtacante)
      : campoJogador.personagens.find(c => c && !c.entrou_turno_atual);
    if (!atacante) return { ok: false, msg: `"${nomeAtacante}" não está em campo.` };
    if (!podeAtacar(atacante)) return { ok: false, msg: `${atacante.name} não pode atacar este turno (entrou agora).` };

    const alvo = nomeAlvo
      ? buscarNoCampo(campoNpc, nomeAlvo)
      : null;
    if (!alvo) return { ok: false, msg: `"${nomeAlvo}" não encontrado no campo do NPC.` };

    resolverCombateCompleto(atacante, alvo, false);
    return { ok: true, atacanteNome: atacante.name, alvoNome: alvo.name };
  }, [campoJogador, campoNpc, resolverCombateCompleto]);

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
    combatePendente, folcloricaPendente, setFolcloricaPendente,
    narracaoJogador, setNarracaoJogador,
    npcJogarCarta, jogadorJogarCarta, jogadorJogarPlantaVirada, jogadorRevelarPlanta, jogadorEquiparCarta,
    jogadorAtacar, jogadorAtaqueDireto, confirmarCombate, aplicarResultadoCombate,
    jogadorIniciarFolclorica, jogadorCompletarFolclorica, executarEfeitoFolclorica, resolverCombateCompleto,
    passarVez: npcExecutarTurno,
    esquecimentoJogador,
    iniciarJogo,
  };
}
