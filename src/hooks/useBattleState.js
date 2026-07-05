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

// Garante que keywords (FURIA, ATRAVESSAR, etc.) sejam detectáveis por temKeyword()
// mesmo que cheguem como mecanica[] ou como action.type sem effect_reference na API.
function injetarKeywordsNosBlocks(entrada) {
  const kwdSet = new Set(Object.values(KEYWORDS));
  const normSlug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '_').trim();
  const rawBlocks = toArray(entrada.effect_blocks ?? []);

  // Blocks existentes: se action.type é um keyword slug, garantir effect_reference
  const normalizedBlocks = rawBlocks.map(bloco => ({
    ...bloco,
    actions: (bloco.actions || []).map(action => {
      const slug = normSlug(action.type || '');
      if (kwdSet.has(slug) && !(action.effect_reference || []).some(e => e.slug === slug)) {
        return { ...action, effect_reference: [...(action.effect_reference || []), { slug }] };
      }
      return action;
    }),
  }));

  // Keywords em mecanica[] não presentes nos blocks → block sintético passivo
  const jaPresentes = new Set(
    normalizedBlocks.flatMap(b => (b.actions || []).flatMap(a => (a.effect_reference || []).map(e => e.slug)))
  );
  // API pode enviar mecanica como string "INVESTIR·FURIA" ou "INVESTIR, FURIA" — dividir antes de checar
  const mecKwds = toArray(entrada.mecanica ?? entrada.mecanicas ?? [])
    .flatMap(m => String(m || '').split(/[,;·\s]+/).map(s => normSlug(s.trim())))
    .filter(slug => slug.length > 0 && kwdSet.has(slug) && !jaPresentes.has(slug));

  if (mecKwds.length === 0) return normalizedBlocks;
  return [
    ...normalizedBlocks,
    ...mecKwds.map(slug => ({ trigger: 'passive', actions: [{ type: 'keyword', effect_reference: [{ slug }] }] })),
  ];
}

// Unifica os diferentes shapes de carta da API num formato único para os slots.
// Lida com: deck entries (atq/def/imagem_url), adaptarCarta output (atq/def/imagemUrl),
// e data.js legacy (atk/def/name/category).
function normalizeCardForSlot(entrada) {
  const efeitos = entrada.efeito ?? [];
  const effectText = Array.isArray(efeitos)
    ? efeitos.map(e => e.display_name ?? e.name ?? '').filter(Boolean).join(' · ')
    : typeof efeitos === 'string' ? efeitos : '';

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
    nd:         entrada.nd || entrada.numero_descarte || null,
    mecanica:     toArray(entrada.mecanica     ?? entrada.mecanicas ?? []),
    classes:      toArray(entrada.classe       ?? entrada.classes   ?? []),
    effect_blocks: injetarKeywordsNosBlocks(entrada),
    magia:            entrada.magia              ?? null,
    combo_habilidade: entrada.combo_habilidade   ?? null,
    entrou_turno_atual: false,
    equipamentos: [],
    efeitosAtivos: [],
    atacouNesteTurno: false,
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

// Extrai bônus de ATQ/DEF/PC do PRIMEIRO bloco de efeito que conceda bônus.
// Evita somar entradas duplicadas da API (bug do Bacamarte +2).
function getEquipBonus(equip) {
  for (const bloco of (equip.effect_blocks ?? [])) {
    for (const action of (bloco.actions ?? [])) {
      if (['modify_attack', 'modify_defense', 'modify_stats'].includes(action.type)) {
        const atk = action.value_attack || 0;
        const def = action.value_defense || 0;
        const pc  = action.value_pc     || 0;
        if (atk || def || pc) return { atk, def, pc };
      }
      if (action.type === 'gain_pc') {
        const pc = action.value_pc || 0;
        if (pc) return { atk: 0, def: 0, pc };
      }
    }
  }
  return { atk: equip.atk ?? 0, def: equip.def ?? 0, pc: equip.pc ?? 0 };
}

function getActionTypes(carta) {
  return (carta.effect_blocks || [])
    .flatMap(b => (b.actions || []).map(a => a.type))
    .filter(t => t && t !== 'none');
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
  personagens: Array(SLOTS.personagens).fill(null),
  plantas:     Array(SLOTS.plantas).fill(null),
  folcloricas: [],
  acao: null,
});

function decrementarEfeitosCampo(setCampo) {
  setCampo(prev => {
    const atualizarCarta = (carta) => {
      if (!carta) return carta;
      let c = { ...carta };
      const efeitosAtivos = (c.efeitosAtivos || [])
        .map(e => ({ ...e, turnos: e.turnos - 1 }));
      const gorjalasExpirando = efeitosAtivos.filter(e => e.tipo === 'gorjala' && e.turnos <= 0);
      for (const g of gorjalasExpirando) {
        c.atk = (c.atk || 0) + 2;
        c.def = (c.def || 0) + 2;
      }
      const pisadeiraExpirou = efeitosAtivos.some(e => e.tipo === 'pisadeira' && e.turnos <= 0);
      if (pisadeiraExpirou) { c.paralisado = false; c.paralisadoTurnos = 0; }
      const uirapuruExpirando = efeitosAtivos.some(e => e.tipo === 'uirapuru' && e.turnos <= 0);
      if (uirapuruExpirando) { const tmp = c.atk; c.atk = c.def; c.def = tmp; }
      c.efeitosAtivos = efeitosAtivos.filter(e => e.turnos > 0);
      return c;
    };
    return {
      ...prev,
      personagens: prev.personagens.map(atualizarCarta),
      plantas: prev.plantas.map(atualizarCarta),
    };
  });
}

// Avalia utilidade de jogar uma folclórica com base no estado atual do campo — pura, sem efeitos
function avaliarUtilidadeFolclorica(folc, estadoCampo) {
  const { campoJogador, campoNpc, pcNpc } = estadoCampo;
  const adversarioTemCampo   = campoJogador.personagens.filter(Boolean).length > 0;
  const adversarioTemPlantas = campoJogador.plantas.filter(Boolean).length > 0;
  const npcTemCampo          = campoNpc.personagens.filter(Boolean).length > 0;
  const slug = folc.slug || '';

  const behaviors = getActionTypes(folc);

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

  // Besta-Fera — distribui carta do esquecimento: utilidade média
  if (slug === 'besta-fera') {
    return 5;
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
  const [deckJogadorVazio, setDeckJogadorVazio] = useState(false);
  const [folcloricasAtivasJogador, setFolcloricasAtivasJogador] = useState([]);
  const [folcloricasAtivasNpc, setFolcloricasAtivasNpc] = useState([]);
  const [sapoCururuPendente, setSapoCururuPendente] = useState(null); // null | { count: 1|2, razao: 'destruicao'|'remocao' }
  const npcComecouRef = useRef(false);
  const npcAutoStartRef = useRef(false);
  const campoJogadorRef = useRef(campoPadrao());
  const frenesiAnteriorRef = useRef(0);

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

    const getBehaviors = getActionTypes;

    const decrementarEfeitosGlobais = () => {
      const globais = campoNpc.efeitosGlobais || [];
      globais.forEach(e => {
        if (e.tipo === 'homem_do_saco') {
          setPcJogador(prev => Math.max(0, prev - e.pcPorTurno));
          addLog(`[EFEITO] O Homem do Saco: -${e.pcPorTurno} PC`);
        }
      });
      // Efeitos globais do jogador (ex: O Homem do Saco jogado pelo jogador → drena PC do NPC)
      const globaisJogador = campoJogador.efeitosGlobais || [];
      globaisJogador.forEach(e => {
        if (e.tipo === 'homem_do_saco') {
          setPcNpc(prev => Math.max(0, prev - e.pcPorTurno));
          addLog(`[EFEITO] O Homem do Saco: NPC -${e.pcPorTurno} PC`, '#c89b3c');
        }
      });
      setCampoNpc(prev => ({
        ...prev,
        efeitosGlobais: (prev.efeitosGlobais || [])
          .map(e => ({ ...e, turnos: e.turnos - 1 }))
          .filter(e => e.turnos > 0),
      }));
      setCampoJogador(prev => ({
        ...prev,
        efeitosGlobais: (prev.efeitosGlobais || [])
          .map(e => ({ ...e, turnos: e.turnos - 1 }))
          .filter(e => e.turnos > 0),
      }));
    };

    decrementarEfeitosCampo(setCampoJogador);
    decrementarEfeitosCampo(setCampoNpc);
    decrementarEfeitosGlobais();
    setFolcloricasAtivasJogador(prev => prev.map(f => ({ ...f, turnos: f.turnos - 1 })).filter(f => f.turnos > 0));

    // Executa efeito de folclórica do NPC (afeta campo do JOGADOR)
    const executarEfeitoFolcloricaNpc = (folc) => {
      const behaviors = getBehaviors(folc);
      const slug = folc.slug || '';
      if (slug === 'boitata') {
        if (campoJogador.personagens.some(c => c?.slug === 'sapo-cururu')) {
          setSapoCururuPendente({ count: 1, razao: 'remocao' });
        }
        setCampoJogador(prev => {
          const tudo = [
            ...prev.personagens.filter(Boolean).map(c => c.name),
            ...prev.plantas.filter(c => c && c.name !== '???').map(c => c.name),
            ...(prev.folcloricas || []).map(c => c.name),
            ...(prev.acao ? [prev.acao.name] : []),
          ];
          if (tudo.length) addLog(`[FOLCLÓRICA] ${folc.name}: removeu campo inteiro — ${tudo.join(', ')}.`, '#c84d2a');
          else addLog(`[FOLCLÓRICA] ${folc.name}: campo já estava vazio.`, '#c84d2a');
          return {
            ...prev,
            personagens: prev.personagens.map(() => null),
            plantas: prev.plantas.map(() => null),
            folcloricas: [],
            acao: null,
          };
        });
      } else if (slug === 'mao-de-cabelo') {
        if (campoJogador.personagens.some(c => c?.slug === 'sapo-cururu' && c?.atacouNesteTurno)) {
          setSapoCururuPendente({ count: 1, razao: 'remocao' });
        }
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => {
            if (c?.atacouNesteTurno) { addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${c.name} que atacou.`, '#c84d2a'); return null; }
            return c;
          });
          return { ...prev, personagens };
        });
      } else if (behaviors.includes('remove_card') && slug !== 'iara') {
        const primeiro = campoJogador.personagens.find(Boolean);
        if (primeiro?.slug === 'sapo-cururu') {
          setSapoCururuPendente({ count: 1, razao: 'remocao' });
        }
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
          const personagens = prev.personagens.map(c => {
            if (!c || temKeyword(c, KEYWORDS.IMUNIZAR) || temKeyword(c, KEYWORDS.RESISTENCIA)) return c;
            return { ...c, atk: Math.max(0, (c.atk ?? 0) - 2), def: Math.max(0, (c.def ?? 0) - 2), efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'gorjala', turnos: 2 }] };
          });
          addLog(`[FOLCLÓRICA] ${folc.name}: -2/-2 em seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else if (behaviors.includes('apply_status') || slug === 'pisadeira') {
        setCampoJogador(prev => {
          const personagens = prev.personagens.map(c => {
            if (!c || temKeyword(c, KEYWORDS.IMUNIZAR)) return c;
            return { ...c, paralisado: true, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'pisadeira', turnos: 3 }] };
          });
          addLog(`[FOLCLÓRICA] ${folc.name}: paralisou seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else if (slug === 'batatao' || slug === 'batata') {
        setCampoJogador(prev => {
          const names = prev.personagens.filter(Boolean).map(c => c.name);
          if (names.length) addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${names.join(', ')} à sua mão.`, '#c84d2a');
          return { ...prev, personagens: prev.personagens.map(() => null) };
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
        if (campoJogador.personagens.some(c => c?.slug === 'sapo-cururu' && (c?.atk ?? 0) >= 3)) {
          setSapoCururuPendente({ count: 1, razao: 'remocao' });
        }
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
          const personagens = prev.personagens.map(c => c ? { ...c, atk: c.def ?? 0, def: c.atk ?? 0, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'uirapuru', turnos: 2 }] } : null);
          addLog(`[FOLCLÓRICA] ${folc.name}: trocou ATQ e DEF dos seus personagens.`, '#c84d2a');
          return { ...prev, personagens };
        });
      } else if (slug === 'o-homem-do-saco') {
        setCampoNpc(prev => ({
          ...prev,
          efeitosGlobais: [...(prev.efeitosGlobais || []), { tipo: 'homem_do_saco', turnos: 5, pcPorTurno: 1 }],
        }));
        setFolcloricasAtivasNpc(prev => [...prev, { carta: folc, nome: folc.name, imagemUrl: folc.imagem_url || '', turnos: 5, turnosMax: 5, efeito: 'homem_do_saco' }]);
        addLog('[EFEITO] O Homem do Saco: você perde 1 PC por turno durante 5 turnos', '#c84d2a');
      } else if (slug === 'saci-perere') {
        if (campoJogador.personagens.some(c => c?.slug === 'sapo-cururu')) {
          setSapoCururuPendente({ count: 1, razao: 'remocao' });
        }
        setCampoJogador(prev => {
          const names = prev.personagens.filter(Boolean).map(c => c.name);
          if (names.length) addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${names.join(', ')} ao seu baralho (remoção).`, '#c84d2a');
          else addLog(`[FOLCLÓRICA] ${folc.name}: campo adversário vazio.`, '#c84d2a');
          return { ...prev, personagens: prev.personagens.map(() => null) };
        });
      } else if (slug === 'besta-fera') {
        const cartaJogador = esquecimentoJogador[0];
        if (cartaJogador) {
          setEsquecimentoJogador(prev => prev.slice(1));
          addLog(`[FOLCLÓRICA] ${folc.name}: ${cartaJogador.name} do seu esquecimento voltou à sua mão.`, '#c84d2a');
        } else {
          addLog(`[FOLCLÓRICA] ${folc.name}: seu esquecimento está vazio.`, '#c84d2a');
        }
        const cartaNpc = esquecimentoNpc[0];
        if (cartaNpc) {
          setEsquecimentoNpc(prev => prev.slice(1));
          setMaoNpc(prev => [...prev, cartaNpc]);
          addLog(`[FOLCLÓRICA] ${folc.name}: NPC recuperou uma carta do esquecimento.`, '#c84d2a');
        }
      } else if (slug === 'curupira') {
        setCampoNpc(prev => ({
          ...prev,
          efeitosGlobais: [...(prev.efeitosGlobais || []), { tipo: 'curupira', turnos: 2 }],
        }));
        addLog(`[FOLCLÓRICA] ${folc.name}: você não pode usar magias/ações por 2 turnos.`, '#c84d2a');
      } else if (slug === 'anhanga') {
        // TODO: Anhangá — seleção de carta do campo/esquecimento adversário (interação do jogador necessária)
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'copia uma carta do campo ou esquecimento adversário'}.`, '#c84d2a');
      } else if (slug === 'vitoria-regia') {
        // TODO: Vitória-Régia — equipa em personagem NPC e habilita ataque direto ao PC adversário
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'próximo ataque do NPC ignora personagens adversários'}.`, '#c84d2a');
      } else if (slug === 'lobisomem') {
        // TODO: Lobisomem — verificar texto oficial da carta
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c84d2a');
      } else if (slug === 'cuca') {
        // TODO: Cuca — verificar texto oficial da carta
        addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c84d2a');
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
          personagens: prev.personagens.map(c => c ? { ...c, paralisado: false, imobilizado: false, arruinada: false } : null),
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

    // Derrota por baralho vazio do jogador (regra 4.0)
    if (deckJogadorVazio) {
      addLog('[FIM] Baralho do jogador está vazio — NPC venceu! (regra 4.0)', '#c84d2a');
      setFimDeJogo('derrota');
      setVezDoNpc(false);
      return;
    }

    // Regenerar DEF do campo do jogador e resetar flags de ataque e entrada (fim do turno do jogador)
    setCampoJogador(prev => ({
      ...prev,
      personagens: prev.personagens.map(c => c && c.defReduzidaTurno
        ? { ...c, defAtual: c.defBase ?? c.def ?? 0, defReduzidaTurno: false, atacouNesteTurno: false, entrou_turno_atual: false }
        : c ? { ...c, atacouNesteTurno: false, entrou_turno_atual: false } : c),
    }));

    // 1. Comprar carta(s) — quem começa não compra no turno 1 (regra 10.0)
    await delay(800);
    const ehPrimeiroTurnoNpc = nextTurno === 1;
    const qtd = workMao.length === 0
      ? COMPRA_MAO_VAZIA
      : (ehPrimeiroTurnoNpc && npcComecouRef.current ? 0 : COMPRA_POR_TURNO);
    if (qtd > 0 && workDeck.length === 0) {
      addLog('[FIM] Baralho do NPC está vazio — você venceu! (regra 4.0)', '#8ac46a');
      setFimDeJogo('vitoria');
      setVezDoNpc(false);
      return;
    }
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
        for (const bloco of (melhor.effect_blocks || []).filter(b => b.trigger === 'on_enter_field')) {
          const tipos = (bloco.actions || []).map(a => a.type).filter(t => t && t !== 'none');
          if (!tipos.length) continue;
          let atkBuf = 0, defBuf = 0, pcVal = 0;
          (bloco.actions || []).forEach(a => { atkBuf += a.value_attack || 0; defBuf += a.value_defense || 0; pcVal += a.value_pc || 0; });
          if (tipos.some(t => ['modify_attack', 'modify_defense', 'modify_stats'].includes(t)) && bloco.target_scope === 'self') {
            workCampo.personagens[si] = { ...workCampo.personagens[si], atk: (workCampo.personagens[si].atk ?? 0) + atkBuf, def: (workCampo.personagens[si].def ?? 0) + defBuf };
            setCampoNpc({ ...workCampo, personagens: [...workCampo.personagens] });
            if (atkBuf) addLog(`[EFEITO] ${carta.name}: +${atkBuf} ATQ ao entrar em campo.`, '#c89b3c');
            if (defBuf) addLog(`[EFEITO] ${carta.name}: +${defBuf} DEF ao entrar em campo.`, '#c89b3c');
          } else if (tipos.includes('lose_pc') && (bloco.target_scope === 'enemy_player' || bloco.target_scope === 'enemy_field')) {
            workPcJ = Math.max(0, workPcJ - (pcVal || 1));
            setPcJogador(workPcJ);
            addLog(`[EFEITO] ${carta.name}: você perde ${pcVal || 1} PC ao entrar.`, '#c84d2a');
            if (checkFimDeJogo(workPcJ, workPcN)) return;
          } else if (tipos.includes('gain_pc')) {
            workPcN = workPcN + (pcVal || 1);
            setPcNpc(workPcN);
            addLog(`[EFEITO] ${carta.name}: NPC recupera ${pcVal || 1} PC ao entrar.`, '#c89b3c');
          } else if (tipos.includes('remove_card') && bloco.target_scope === 'enemy_field') {
            setCampoJogador(prev => {
              const personagens = [...prev.personagens];
              const idx = personagens.findIndex(Boolean);
              if (idx !== -1) { addLog(`[EFEITO] ${carta.name}: removeu ${personagens[idx].name} do seu campo.`, '#c84d2a'); personagens[idx] = null; }
              return { ...prev, personagens };
            });
          } else if (tipos.length > 0) {
            addLog(`[EFEITO] ${carta.name}: ${melhor.magia || melhor.instinto || melhor.encantamento || 'efeito de entrada ativado'}.`, '#c89b3c');
          }
        }
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
          const equipBonus = getEquipBonus(equip);
          workCampo.personagens[pi] = {
            ...alvo,
            atkBase: alvo.atkBase ?? alvo.atk ?? 0,
            defBase: alvo.defBase ?? alvo.def ?? 0,
            atk: (alvo.atkBase ?? alvo.atk ?? 0) + equipBonus.atk,
            def: (alvo.defBase ?? alvo.def ?? 0) + equipBonus.def,
            pc: (alvo.pc ?? 0) + equipBonus.pc,
            effect_blocks: [...(alvo.effect_blocks ?? []), ...(equip.effect_blocks ?? [])],
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

    // Curupira do jogador bloqueia ações e folclóricas do NPC
    const curupiraBloqueandoNpc = (campoJogador.efeitosGlobais || []).some(e => e.tipo === 'curupira');

    // 4. Jogar ação (acao_rapida → esquecimento; acao_continua → slot de ação)
    await delay(800);
    if (!flags.jogouAcao && !curupiraBloqueandoNpc) {
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
    if (!flags.jogouFolclorica && !curupiraBloqueandoNpc) {
      const estadoAtual = { campoJogador, campoNpc: workCampo, pcJogador, pcNpc };
      const candidatas = workMao
        .filter(c => isFolclorica(c) && podeSer_Jogada_Folclorica(c, workMao))
        .map(c => ({ carta: c, utilidade: avaliarUtilidadeFolclorica(c, estadoAtual) }))
        .filter(({ utilidade }) => utilidade >= 5)
        .sort((a, b) => b.utilidade - a.utilidade);

      if (candidatas.length > 0) {
        const { carta: folc } = candidatas[0];
        const nd = folc.nd || folc.numero_descarte || 0;
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
      const atacantes = workCampo.personagens.filter(c => c && podeAtacar(c) && !c.paralisado && !c.imobilizado);
      const totalEmCampo = workCampo.personagens.filter(Boolean).length;
      const alvosJogador = campoJogador.personagens.filter(Boolean);
      // ATRAIR: se algum alvo tem ATRAIR, todos os ataques devem ser direcionados a ele
      const alvoAtrair = alvosJogador.find(c => temKeyword(c, KEYWORDS.ATRAIR));

      for (const atk of atacantes) {
        await delay(800);
        const atkEfetivo = (atk.atk ?? 0) + calcularFuria(atk, totalEmCampo);

        // INTIMIDAR: ataca PC diretamente mesmo com personagens em campo
        if (alvosJogador.length > 0 && temKeyword(atk, KEYWORDS.INTIMIDAR)) {
          workPcJ = Math.max(0, workPcJ - atkEfetivo);
          setPcJogador(workPcJ);
          addLog(`[INTIMIDAR] ${atk.name} intimidou e atacou o PC diretamente! ${atkEfetivo} de dano.`, '#c84d2a');
          if (checkFimDeJogo(workPcJ, workPcN)) return;
        } else if (alvosJogador.length > 0) {
          let candidatos = alvoAtrair ? [alvoAtrair] : alvosJogador;
          // PROTEGER: forçar alvo com PROTEGER (regra PROTEGER)
          const alvoProteger = candidatos.find(c => temKeyword(c, KEYWORDS.PROTEGER));
          if (alvoProteger) candidatos = [alvoProteger];
          // Evitar VENENO_MORTAL quando possível
          const semVeneno = candidatos.filter(c => !temKeyword(c, KEYWORDS.VENENO_MORTAL));
          if (semVeneno.length > 0) candidatos = semVeneno;
          // Preferir alvo com menor DEF (mais fácil de destruir)
          const alvo = candidatos.slice().sort((a, b) => (a.def ?? 0) - (b.def ?? 0))[0];
          // FURIA: armazenar ATQ com bônus no objeto atacante para resolverCombateCompleto
          const furiaBonus = atkEfetivo - (atk.atk ?? 0);
          const atkIdx = workCampo.personagens.findIndex(c => c === atk);
          const alvoIdx = campoJogador.personagens.findIndex(c => c === alvo);
          const atacanteParaCombate = furiaBonus > 0
            ? { ...atk, atk: atkEfetivo, furiaBonus, _fieldIdx: atkIdx }
            : { ...atk, _fieldIdx: atkIdx };
          setCombatePendente({ atacanteNome: atk.name, alvoNome: alvo.name, dano: atkEfetivo, atacante: atacanteParaCombate, alvo: { ...alvo, _fieldIdx: alvoIdx } });
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
    setFolcloricasAtivasNpc(prev => prev.map(f => ({ ...f, turnos: f.turnos - 1 })).filter(f => f.turnos > 0));
    setVezDoNpc(false);
    addLog('[AÇÃO] NPC passou a vez — sua jogada', '#7a6a45');
  }, [maoNpc, deckNpc, campoNpc, campoJogador, esquecimentoNpc, esquecimentoJogador, pcJogador, pcNpc, turno, deckJogadorVazio]);

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

  useEffect(() => { campoJogadorRef.current = campoJogador; }, [campoJogador]);

  // FRENESI — 3 cartas com FRENESI em campo remove todos os personagens do NPC (remoção, não destruição)
  // Jogador paga 1 PC por personagem removido; ativado pela última carta a entrar
  useEffect(() => {
    if (!prontoParaJogar || fimDeJogo) return;
    const frenesiCount = campoJogador.personagens.filter(Boolean).filter(c => temKeyword(c, KEYWORDS.FRENESI)).length;
    if (frenesiAnteriorRef.current < 3 && frenesiCount >= 3) {
      const npcPersonagens = campoNpc.personagens.filter(Boolean);
      const custo = npcPersonagens.length;
      const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (custo > 0) {
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(() => null) }));
        setPcJogador(p => Math.max(0, p - custo));
        setLog(prev => [...prev, { t: ts, text: `[FRENESI] 3 cartas com FRENESI! Todos os personagens do NPC removidos. Você paga ${custo} PC.`, color: '#d4a857' }]);
      } else {
        setLog(prev => [...prev, { t: ts, text: `[FRENESI] 3 cartas com FRENESI em campo — campo do NPC já estava vazio.`, color: '#d4a857' }]);
      }
    }
    frenesiAnteriorRef.current = frenesiCount;
  }, [campoJogador.personagens, campoNpc, prontoParaJogar, fimDeJogo]);

  const executarEfeitoFolclorica = useCallback((folc) => {
    const slug = folc.slug || '';
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    const behaviors = getActionTypes(folc);

    if (slug === 'boitata') {
      setCampoNpc(prev => {
        const tudo = [
          ...prev.personagens.filter(Boolean).map(c => c.name),
          ...prev.plantas.filter(c => c && c.name !== '???').map(c => c.name),
          ...(prev.folcloricas || []).map(c => c.name),
          ...(prev.acao ? [prev.acao.name] : []),
        ];
        if (tudo.length) addLog(`[FOLCLÓRICA] ${folc.name}: removeu campo inteiro do NPC — ${tudo.join(', ')}.`, '#c89b3c');
        else addLog(`[FOLCLÓRICA] ${folc.name}: campo do NPC estava vazio.`, '#c89b3c');
        return {
          ...prev,
          personagens: prev.personagens.map(() => null),
          plantas: prev.plantas.map(() => null),
          folcloricas: [],
          acao: null,
        };
      });
      return;
    }
    if (slug === 'labatut') {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens.findIndex(c => c && normStr(c.category).includes('histor'));
        if (idx !== -1) {
          addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${personagens[idx].name} (Histórica) do campo do NPC.`, '#c89b3c');
          personagens[idx] = null;
        } else { addLog(`[FOLCLÓRICA] ${folc.name}: nenhuma carta histórica em campo do NPC.`, '#c89b3c'); }
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'arranca-linguas') {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens.findIndex(c => c && normStr(c.category).includes('fera'));
        if (idx !== -1) {
          addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${personagens[idx].name} (Fera) do campo do NPC.`, '#c89b3c');
          personagens[idx] = null;
        } else { addLog(`[FOLCLÓRICA] ${folc.name}: nenhuma fera em campo do NPC.`, '#c89b3c'); }
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'mao-de-cabelo') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => {
          if (c?.atacouNesteTurno) { addLog(`[FOLCLÓRICA] ${folc.name}: removeu ${c.name} que atacou.`, '#c89b3c'); return null; }
          return c;
        });
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'o-homem-do-saco') {
      setCampoJogador(prev => ({
        ...prev,
        efeitosGlobais: [...(prev.efeitosGlobais || []), { tipo: 'homem_do_saco', turnos: 5, pcPorTurno: 1 }],
      }));
      setFolcloricasAtivasJogador(prev => [...prev, { carta: folc, nome: folc.name, imagemUrl: folc.imagem_url || '', turnos: 5, turnosMax: 5, efeito: 'homem_do_saco' }]);
      addLog('[EFEITO] O Homem do Saco: NPC perde 1 PC por turno durante 5 turnos.', '#c89b3c');
      return;
    }
    if (behaviors.includes('remove_card') && slug !== 'iara') {
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
      setMaoNpc([]);
      addLog(`[FOLCLÓRICA] ${folc.name}: descartou toda a mão do NPC.`, '#c89b3c');
      return;
    }
    if ((behaviors.includes('modify_stats') && !behaviors.includes('apply_status')) || slug === 'gorjala') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => c ? { ...c, atk: Math.max(0, (c.atk ?? 0) - 2), def: Math.max(0, (c.def ?? 0) - 2), efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'gorjala', turnos: 2 }] } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: -2/-2 em personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    if (behaviors.includes('apply_status') || slug === 'pisadeira') {
      setCampoNpc(prev => {
        const personagens = prev.personagens.map(c => c ? { ...c, paralisado: true, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'pisadeira', turnos: 3 }] } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: paralisou personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'batatao' || slug === 'batata') {
      setCampoNpc(prev => {
        const names = prev.personagens.filter(Boolean).map(c => c.name);
        if (names.length) addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${names.join(', ')} à mão do NPC.`, '#c89b3c');
        return { ...prev, personagens: prev.personagens.map(() => null) };
      });
      return;
    }
    if (behaviors.includes('return_to_hand') || slug === 'caboclo-dagua') {
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
        const personagens = prev.personagens.map(c => c ? { ...c, atk: c.def ?? 0, def: c.atk ?? 0, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'uirapuru', turnos: 2 }] } : null);
        addLog(`[FOLCLÓRICA] ${folc.name}: trocou ATQ e DEF dos personagens do NPC.`, '#c89b3c');
        return { ...prev, personagens };
      });
      return;
    }
    if (slug === 'saci-perere') {
      setCampoNpc(prev => {
        const names = prev.personagens.filter(Boolean).map(c => c.name);
        if (names.length) addLog(`[FOLCLÓRICA] ${folc.name}: devolveu ${names.join(', ')} ao baralho do NPC (remoção).`, '#c89b3c');
        else addLog(`[FOLCLÓRICA] ${folc.name}: campo do NPC vazio.`, '#c89b3c');
        return { ...prev, personagens: prev.personagens.map(() => null) };
      });
      return;
    }
    if (slug === 'besta-fera') {
      const cartaNpc = esquecimentoNpc[0];
      if (cartaNpc) {
        setEsquecimentoNpc(prev => prev.slice(1));
        setMaoNpc(prev => [...prev, cartaNpc]);
        addLog(`[FOLCLÓRICA] ${folc.name}: NPC recuperou ${cartaNpc.name} do esquecimento.`, '#c89b3c');
      } else {
        addLog(`[FOLCLÓRICA] ${folc.name}: esquecimento do NPC vazio.`, '#c89b3c');
      }
      addLog(`[FOLCLÓRICA] ${folc.name}: pegue 1 carta do seu esquecimento (se houver).`, '#c89b3c');
      return;
    }
    if (slug === 'curupira') {
      setCampoJogador(prev => ({
        ...prev,
        efeitosGlobais: [...(prev.efeitosGlobais || []), { tipo: 'curupira', turnos: 2 }],
      }));
      addLog(`[FOLCLÓRICA] ${folc.name}: NPC não pode usar magias/ações por 2 turnos.`, '#c89b3c');
      return;
    }
    if (slug === 'anhanga') {
      // TODO: Anhangá — seleção de carta do campo/esquecimento NPC (interação do jogador necessária)
      addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'escolha uma carta do campo ou esquecimento do NPC para copiar'}.`, '#c89b3c');
      return;
    }
    if (slug === 'vitoria-regia') {
      // TODO: Vitória-Régia — equipa em personagem seu e habilita ataque direto ao PC
      addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || 'seu próximo ataque ignora personagens adversários'}.`, '#c89b3c');
      return;
    }
    if (slug === 'lobisomem') {
      // TODO: Lobisomem — verificar texto oficial da carta
      addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c89b3c');
      return;
    }
    if (slug === 'cuca') {
      // TODO: Cuca — verificar texto oficial da carta
      addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || 'efeito ativado'}.`, '#c89b3c');
      return;
    }
    console.warn('[executarEfeitoFolclorica] nenhum handler para slug:', slug, '| behaviors:', behaviors, '| nome:', folc.name);
    addLog(`[FOLCLÓRICA] ${folc.name}: ${folc.magia || folc.combo_habilidade || folc.instinto || folc.encantamento || 'efeito ativado'}.`, '#c89b3c');
  }, [campoNpc, esquecimentoNpc]);

  const jogadorExecutarEfeitoPlanta = useCallback((carta, emResposta = false, pendente = null) => {
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    const behaviors = getActionTypes(carta);

    if (behaviors.includes('remocao_encantamento') || behaviors.includes('remocao_de_encantamento')) {
      setCampoJogador(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, paralisado: false, imobilizado: false } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: removeu encantamentos do seu campo.`, '#8ac46a');
    } else if (behaviors.includes('remocao_magia') || behaviors.includes('remocao_de_magia')) {
      setCampoNpc(prev => ({ ...prev, acao: null }));
      addLog(`[PLANTA] ${carta.name}: removeu magia contínua do campo do NPC.`, '#8ac46a');
    } else if (behaviors.includes('gain_pc')) {
      setPcJogador(p => p + 2);
      addLog(`[PLANTA] ${carta.name}: você recuperou 2 PC.`, '#8ac46a');
    } else if (behaviors.includes('lose_pc')) {
      setPcNpc(p => Math.max(0, p - 2));
      addLog(`[PLANTA] ${carta.name}: NPC perdeu 2 PC.`, '#8ac46a');
    } else if (behaviors.includes('return_to_hand')) {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens
          .map((c, i) => ({ c, i })).filter(({ c }) => c)
          .sort((a, b) => (b.c.atk ?? 0) - (a.c.atk ?? 0))[0]?.i;
        if (idx !== undefined) {
          addLog(`[PLANTA] ${carta.name}: devolveu ${personagens[idx].name} à mão do NPC.`, '#8ac46a');
          personagens[idx] = null;
        }
        return { ...prev, personagens };
      });
    } else if (carta.slug === 'guerra-de-mamonas') {
      setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map(() => null) }));
      setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map(() => null) }));
      addLog(`[PLANTA] ${carta.name}: todos os personagens de ambos os campos foram removidos.`, '#8ac46a');
    } else if (carta.slug === 'armadilha-mortal' && pendente) {
      const atacanteNome = pendente.atacanteNome;
      setCampoNpc(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c?.name === atacanteNome
          ? { ...c, paralisado: true, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'pisadeira', turnos: 2 }] }
          : c),
      }));
      addLog(`[PLANTA] ${carta.name}: ${atacanteNome} paralisado por 2 turnos!`, '#8ac46a');
    } else if (carta.slug === 'veneno-de-tinhorao') {
      if (emResposta && pendente) {
        const atacanteNome = pendente.atacanteNome;
        setCampoNpc(prev => ({
          ...prev,
          personagens: prev.personagens.map(c => c?.name === atacanteNome
            ? { ...c, def: Math.max(0, (c.def ?? 0) - 1) } : c),
        }));
        addLog(`[PLANTA] ${carta.name}: reduziu -0/-1 de ${atacanteNome}.`, '#8ac46a');
      } else {
        setPcNpc(p => Math.max(0, p - 1));
        addLog(`[PLANTA] ${carta.name}: NPC perdeu 1 PC.`, '#8ac46a');
      }
    } else if (carta.slug === 'arvore-sagrada-do-sertao') {
      setPcJogador(p => p + 3);
      addLog(`[PLANTA] ${carta.name}: você ganhou 3 PC.`, '#8ac46a');
    } else if (carta.slug === 'encanto-do-jacaranda') {
      setCampoJogador(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, paralisado: false, imobilizado: false } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: seus personagens foram curados de efeitos negativos.`, '#8ac46a');
    } else if (carta.slug === 'renovacao-de-pinhas') {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const plantas = [...prev.plantas];
        const pIdx = personagens.findIndex(Boolean);
        if (pIdx !== -1) {
          addLog(`[PLANTA] ${carta.name}: devolveu ${personagens[pIdx].name} à mão do NPC.`, '#8ac46a');
          personagens[pIdx] = null;
          return { ...prev, personagens };
        }
        const plIdx = plantas.findIndex(Boolean);
        if (plIdx !== -1) {
          addLog(`[PLANTA] ${carta.name}: devolveu planta do NPC para a mão.`, '#8ac46a');
          plantas[plIdx] = null;
          return { ...prev, plantas };
        }
        return prev;
      });
    } else if (carta.slug === 'seiva-do-mangue-preto') {
      setCampoJogador(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, paralisado: false } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: seus personagens paralisados foram curados.`, '#8ac46a');
    } else if (behaviors.includes('remove_card')) {
      setCampoNpc(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens.findIndex(Boolean);
        if (idx !== -1) {
          addLog(`[PLANTA] ${carta.name}: removeu ${personagens[idx].name} do campo do NPC.`, '#8ac46a');
          personagens[idx] = null;
        }
        return { ...prev, personagens };
      });
    } else if (behaviors.includes('apply_status')) {
      setCampoNpc(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, paralisado: true, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'pisadeira', turnos: 3 }] } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: paralisou personagens do NPC.`, '#8ac46a');
    } else if (behaviors.includes('modify_stats')) {
      setCampoNpc(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, atk: Math.max(0, (c.atk ?? 0) - 2), def: Math.max(0, (c.def ?? 0) - 2), efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'gorjala', turnos: 2 }] } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: -2/-2 em personagens do NPC.`, '#8ac46a');
    } else if (behaviors.includes('swap_stats')) {
      setCampoNpc(prev => ({
        ...prev,
        personagens: prev.personagens.map(c => c ? { ...c, atk: c.def ?? 0, def: c.atk ?? 0, efeitosAtivos: [...(c.efeitosAtivos || []), { tipo: 'uirapuru', turnos: 2 }] } : null),
      }));
      addLog(`[PLANTA] ${carta.name}: trocou ATQ e DEF dos personagens do NPC.`, '#8ac46a');
    } else {
      addLog(`[PLANTA] ${carta.name}: ${carta.magia || carta.combo_habilidade || 'efeito ativado'}.`, '#8ac46a');
    }
    if (emResposta) setCombatePendente(null);
  }, []);

  const ativarPlantaContraAtaque = useCallback(async (nomePlanta) => {
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#8ac46a') => setLog(prev => [...prev, { t: ts(), text, color }]);
    const { carta: raw } = await buscarCartaFuzzy(nomePlanta);
    if (!raw) return { sucesso: false };
    const carta = normalizeCardForSlot(raw);
    const atqBonus = carta.atk || 0;
    const defBonus = carta.def || 0;
    // Captura snapshots dentro do updater (estado garantidamente atual)
    let atacanteSnap = null;
    let alvoSnap = null;
    setCombatePendente(prevCombate => {
      if (!prevCombate) {
        addLog(`[PLANTA] ${carta.name} revelada (sem combate pendente).`);
        return null;
      }
      atacanteSnap = prevCombate.atacante;
      alvoSnap = prevCombate.alvo;
      const alvoNome = prevCombate.alvo?.name || prevCombate.alvo?.nome || prevCombate.alvoNome;
      if (alvoNome && (atqBonus || defBonus)) {
        setCampoJogador(prevCampo => ({
          ...prevCampo,
          personagens: prevCampo.personagens.map(c =>
            c && (c.name === alvoNome || c.nome === alvoNome)
              ? { ...c, atk: (c.atk || 0) + atqBonus, def: (c.def || 0) + defBonus }
              : c
          ),
        }));
        addLog(`[PLANTA] ${carta.name} ativada — ${alvoNome} recebe +${atqBonus}/+${defBonus}.`);
        alvoSnap = {
          ...prevCombate.alvo,
          atk: (prevCombate.alvo?.atk || 0) + atqBonus,
          def: (prevCombate.alvo?.def || 0) + defBonus,
        };
      } else {
        addLog(`[PLANTA] ${carta.name} ativada.`);
      }
      return null; // limpa combatePendente — combate resolve abaixo
    });
    // Auto-resolver combate com stats atualizados (planta foi a resposta do jogador)
    // resolverCombateCompleto não entra nos deps: é estável (deps=[]) e está declarado após
    // este callback — incluí-lo causaria TDZ na inicialização do componente.
    if (atacanteSnap) resolverCombateCompleto(atacanteSnap, alvoSnap, true);
    return { sucesso: true };
  }, []);

  const resolverCombateCompleto = useCallback((atacanteCard, defensoraCard, npcAtaca = true) => {
    const ts = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const addLog = (text, color = '#e8d5a8') => setLog(prev => [...prev, { t: ts(), text, color }]);
    // Identifica o slot por índice quando disponível; evita afetar cópias com o mesmo nome
    const matchSlot = (card) => (c, i) => card._fieldIdx !== undefined ? i === card._fieldIdx : c?.name === card.name;
    const atkA = atacanteCard.atk ?? 0;
    if (atacanteCard.furiaBonus > 0) {
      addLog(`[FÚRIA] ${atacanteCard.name} +${atacanteCard.furiaBonus} ATQ de bônus (FÚRIA).`, '#d4a857');
    }
    const defD = defensoraCard.defAtual ?? defensoraCard.def ?? 0;
    const temVeneno = temKeyword(defensoraCard, KEYWORDS.VENENO_MORTAL);
    const temAtravessar = temKeyword(atacanteCard, KEYWORDS.ATRAVESSAR);
    const defensoraDestruida = atkA >= defD;
    const danoAoPC = defensoraDestruida && temAtravessar ? atkA - defD : 0;

    if (defensoraDestruida) {
      const pcPerdido = pcPerdidoPorDestruicao(defensoraCard);
      if (npcAtaca) {
        if (defensoraCard.slug === 'sapo-cururu') setSapoCururuPendente({ count: 2, razao: 'destruicao' });
        setPcJogador(p => Math.max(0, p - pcPerdido - danoAoPC));
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? null : c) }));
        addLog(`[COMBATE] ${atacanteCard.name} destruiu ${defensoraCard.name}! Você perde ${pcPerdido + danoAoPC} PC.`, '#c84d2a');
      } else {
        setPcNpc(p => Math.max(0, p - pcPerdido - danoAoPC));
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? null : c) }));
        addLog(`[COMBATE] ${atacanteCard.name} destruiu ${defensoraCard.name}! NPC perde ${pcPerdido + danoAoPC} PC.`, '#f5d27a');
      }
      if (temVeneno) {
        if (npcAtaca) {
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? null : c) }));
        } else {
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? null : c) }));
        }
        addLog(`[VENENO] ${defensoraCard.name} envenenou ${atacanteCard.name} — removido sem PC.`, '#8a4a8a');
      }
    } else {
      const temRegenerar = temKeyword(defensoraCard, KEYWORDS.REGENERAR);
      const novaDefD = temRegenerar ? (defensoraCard.defBase ?? defensoraCard.def ?? 0) : defD - atkA;
      if (npcAtaca) {
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, defAtual: novaDefD, defReduzidaTurno: !temRegenerar } : c) }));
        if (temRegenerar) addLog(`[REGENERAR] ${defensoraCard.name} regenerou DEF imediatamente.`, '#8ac46a');
      } else {
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, defAtual: novaDefD, defReduzidaTurno: !temRegenerar } : c) }));
        if (temRegenerar) addLog(`[REGENERAR] ${defensoraCard.name} regenerou DEF imediatamente.`, '#f5d27a');
      }
    }

    // ARRUINAR — defensor sobreviveu: setar arruinada (regra ARRUINAR)
    if (!defensoraDestruida && temKeyword(atacanteCard, KEYWORDS.ARRUINAR)) {
      if (npcAtaca) {
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, arruinada: true } : c) }));
        addLog(`[ARRUINAR] ${defensoraCard.name} foi arruinada — não pode ser substituída.`, '#c84d2a');
      } else {
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, arruinada: true } : c) }));
        addLog(`[ARRUINAR] ${defensoraCard.name} foi arruinada — não pode ser substituída.`, '#f5d27a');
      }
    }

    // IMOBILIZAR — defensor sobreviveu: setar imobilizado (regra IMOBILIZAR)
    if (!defensoraDestruida && temKeyword(atacanteCard, KEYWORDS.IMOBILIZAR)) {
      if (npcAtaca) {
        setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, imobilizado: true } : c) }));
        addLog(`[IMOBILIZAR] ${defensoraCard.name} foi imobilizada — não pode atacar.`, '#c84d2a');
      } else {
        setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(defensoraCard)(c, i) ? { ...c, imobilizado: true } : c) }));
        addLog(`[IMOBILIZAR] ${defensoraCard.name} foi imobilizada — não pode atacar.`, '#f5d27a');
      }
    }

    // ABSORVER_CONHECIMENTO — atacante do jogador ganha PC = ATQ (não vale no contra-ataque)
    if (!npcAtaca && temKeyword(atacanteCard, KEYWORDS.ABSORVER_CONHECIMENTO)) {
      setPcJogador(p => p + atkA);
      addLog(`[ABSORVER CONHECIMENTO] ${atacanteCard.name} recuperou ${atkA} PC.`, '#8ac46a');
    }

    // Contra-ataque (regra 24.0) — paralisada contra-ataca (regra 27.0)
    if (!temVeneno) {
      const atkD = defensoraCard.atk ?? 0;
      const defA = atacanteCard.defAtual ?? atacanteCard.def ?? 0;
      const temIgnorar = temKeyword(atacanteCard, KEYWORDS.IGNORAR);
      const atacanteDestruido = !temIgnorar && atkD >= defA;
      if (atacanteDestruido) {
        const pcPerdido = pcPerdidoPorDestruicao(atacanteCard);
        if (npcAtaca) {
          setPcNpc(p => Math.max(0, p - pcPerdido));
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? null : c) }));
          addLog(`[CONTRA-ATAQUE] ${defensoraCard.name} destruiu ${atacanteCard.name}! NPC perde ${pcPerdido} PC.`, '#f5d27a');
        } else {
          if (atacanteCard.slug === 'sapo-cururu') setSapoCururuPendente({ count: 2, razao: 'destruicao' });
          setPcJogador(p => Math.max(0, p - pcPerdido));
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? null : c) }));
          addLog(`[CONTRA-ATAQUE] ${defensoraCard.name} destruiu ${atacanteCard.name}! Você perde ${pcPerdido} PC.`, '#c84d2a');
        }
      } else if (atkD > 0) {
        const novaDefA = defA - atkD;
        if (npcAtaca) {
          setCampoNpc(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? { ...c, defAtual: novaDefA, defReduzidaTurno: true } : c) }));
        } else {
          setCampoJogador(prev => ({ ...prev, personagens: prev.personagens.map((c, i) => matchSlot(atacanteCard)(c, i) ? { ...c, defAtual: novaDefA, defReduzidaTurno: true } : c) }));
        }
      }
    }

    setCombatePendente(null);
  }, []);

  const jogadorIniciarFolclorica = useCallback(async (nomeFolc) => {
    const { carta: raw, sugestao } = await buscarCartaFuzzy(nomeFolc);
    if (!raw) return { ok: false, sugestao, msg: `Folclórica "${nomeFolc}" não encontrada.` };
    console.log('[FOLCLORICA] carta encontrada:', raw?.nome, '| nd:', raw?.nd, '| numero_descarte:', raw?.numero_descarte, '| slug:', raw?.slug, '| effect_blocks:', JSON.stringify(raw?.effect_blocks?.slice(0,2)));
    const folc = normalizeCardForSlot(raw);
    const nd = folc.nd ?? 0;
    console.log('[FOLCLORICA] nd após normalização:', nd);
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
    const normalizada = { ...normalizeCardForSlot(raw), entrou_turno_atual: true };
    const zona = categoriaParaZona(normalizada.category);

    // Verificar limite de turno antes de colocar (regra 20.0)
    const cat = (normalizada.category ?? '').toLowerCase();
    const tipo = cat.startsWith('folcl') ? 'folclorica'
      : cat === 'planta' ? 'planta'
      : (cat === 'ação' || cat === 'acao') ? 'acao'
      : (cat === 'apoio' || cat === 'equipamento') ? 'equipamento'
      : 'personagem';
    const atual = narracaoJogador.cartasJogadasNesteTurno[tipo] || 0;
    const limite = LIMITE_TURNO[tipo] ?? 1;
    if (atual >= limite) {
      return { carta: null, sugestao: null, limitExceeded: true, tipo, limite };
    }
    // Equipamentos nunca entram em slot próprio — se anexam a personagem compatível no campo
    if (isEquipamento(normalizada)) {
      const alvo = campoJogador.personagens.find(c => c && podeEquipar(normalizada, c));
      if (!alvo) {
        return { carta: null, sugestao: null, msg: `Nenhum personagem compatível em campo para equipar ${normalizada.name}. Coloque um personagem compatível primeiro.` };
      }
      setNarracaoJogador(prev => ({
        ...prev,
        cartasJogadasNesteTurno: { ...prev.cartasJogadasNesteTurno, equipamento: (prev.cartasJogadasNesteTurno.equipamento || 0) + 1 },
      }));
      setCampoJogador(prev => {
        const personagens = [...prev.personagens];
        const idx = personagens.findIndex(c => c?.name === alvo.name);
        if (idx === -1) return prev;
        const a = personagens[idx];
        const equipBonus = getEquipBonus(normalizada);
        personagens[idx] = {
          ...a,
          atkBase: a.atkBase ?? a.atk ?? 0,
          defBase: a.defBase ?? a.def ?? 0,
          atk: (a.atkBase ?? a.atk ?? 0) + equipBonus.atk,
          def: (a.defBase ?? a.def ?? 0) + equipBonus.def,
          pc: (a.pc ?? 0) + equipBonus.pc,
          effect_blocks: [...(a.effect_blocks ?? []), ...(normalizada.effect_blocks ?? [])],
          equipamentos: [...(a.equipamentos ?? []), normalizada],
        };
        return { ...prev, personagens };
      });
      return { carta: normalizada, sugestao: null, equipadoEm: alvo.name };
    }

    setNarracaoJogador(prev => ({
      ...prev,
      cartasJogadasNesteTurno: { ...prev.cartasJogadasNesteTurno, [tipo]: (prev.cartasJogadasNesteTurno[tipo] || 0) + 1 },
    }));

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
  }, [narracaoJogador]);

  const jogadorRevelarPlanta = useCallback(async (nomeCarta, slotIndex) => {
    const ocultaIdxs = campoJogador.plantas
      .map((p, i) => (p?.oculta ? i : -1))
      .filter(i => i !== -1);

    if (ocultaIdxs.length === 0) {
      return { ok: false, msg: 'Não há plantas viradas no campo para revelar. Use "coloco uma planta em campo" para jogar virada primeiro.' };
    }
    if (slotIndex === undefined && ocultaIdxs.length > 1) {
      return { ok: false, needsSlot: true, slots: ocultaIdxs, nomeCarta };
    }

    const { carta: raw, sugestao } = await buscarCartaFuzzy(nomeCarta);
    if (!raw) return { ok: false, sugestao };
    const normalizada = normalizeCardForSlot(raw);
    const targetIdx = slotIndex !== undefined ? slotIndex : ocultaIdxs[0];
    setCampoJogador(prev => {
      const plantas = [...prev.plantas];
      if (!plantas[targetIdx]?.oculta) return prev;
      plantas[targetIdx] = { ...normalizada, oculta: false };
      return { ...prev, plantas };
    });
    return { ok: true, carta: normalizada };
  }, [campoJogador]);

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
      const equipBonus = getEquipBonus(equip);
      personagens[idx] = {
        ...alvo,
        atkBase: alvo.atkBase ?? alvo.atk ?? 0,
        defBase: alvo.defBase ?? alvo.def ?? 0,
        atk: (alvo.atkBase ?? alvo.atk ?? 0) + equipBonus.atk,
        def: (alvo.defBase ?? alvo.def ?? 0) + equipBonus.def,
        pc: (alvo.pc ?? 0) + equipBonus.pc,
        effect_blocks: [...(alvo.effect_blocks ?? []), ...(equip.effect_blocks ?? [])],
        equipamentos: [...(alvo.equipamentos ?? []), equip],
      };
      return { ...prev, personagens };
    });
    return { ok: true, equipNome: equip.name, alvoNome };
  }, [campoJogador]);

  const jogadorAtacar = useCallback((nomeAtacante, nomeAlvo, refAtacante = null, refAlvo = null) => {
    const campoCurrent = campoJogadorRef.current;
    const buscarNoCampo = (campo, nome) => campo.personagens.reduce((best, c) => {
      if (!c) return best;
      const n = normStr(nome ?? '');
      const sim = Math.max(simBigramas(nome, c.name), n && normStr(c.name).includes(n) ? 1 : 0);
      return sim > (best?.sim ?? 0) ? { c, sim } : best;
    }, null)?.c;

    const atacante = refAtacante ?? (nomeAtacante
      ? buscarNoCampo(campoCurrent, nomeAtacante)
      : campoCurrent.personagens.find(c => c && !c.entrou_turno_atual));
    if (!atacante) return { ok: false, msg: `"${nomeAtacante}" não está em campo.` };
    if (!podeAtacar(atacante)) return { ok: false, msg: `${atacante.name} não pode atacar este turno (entrou agora).` };
    if (atacante.paralisado) return { ok: false, msg: `${atacante.name} está paralisado e não pode atacar (regra 27.0).` };
    if (atacante.imobilizado) return { ok: false, msg: `${atacante.name} está imobilizado e não pode atacar (regra 40.3).` };
    if (atacante.atacouNesteTurno) return { ok: false, msg: `${atacante.name} já atacou neste turno (regra 26.0).` };

    const alvo = refAlvo ?? (nomeAlvo ? buscarNoCampo(campoNpc, nomeAlvo) : null);
    if (!alvo) return { ok: false, msg: `"${nomeAlvo}" não encontrado no campo do NPC.` };

    // ATRAIR: forçar alvo com ATRAIR se existir (regra ATRAIR)
    const alvoAtrairNpc = campoNpc.personagens.filter(Boolean).find(c => temKeyword(c, KEYWORDS.ATRAIR));
    if (alvoAtrairNpc && alvo.name !== alvoAtrairNpc.name) {
      return { ok: false, msg: `${alvoAtrairNpc.name} tem ATRAIR — você deve atacar esta carta primeiro.` };
    }
    // PROTEGER: forçar alvo com PROTEGER se existir (regra PROTEGER)
    const alvoProtegerNpc = campoNpc.personagens.filter(Boolean).find(c => temKeyword(c, KEYWORDS.PROTEGER));
    if (alvoProtegerNpc && alvo.name !== alvoProtegerNpc.name) {
      return { ok: false, msg: `${alvoProtegerNpc.name} tem PROTEGER — você deve atacar esta carta protetora primeiro.` };
    }
    // FURIA: aplicar bônus de ATQ antes do combate (regra FÚRIA)
    const totalEmCampo = campoCurrent.personagens.filter(Boolean).length;
    const furiaBonus = calcularFuria(atacante, totalEmCampo);
    // _fieldIdx: identifica o slot exato — evita afetar cópias com o mesmo nome
    const atacanteIdx = campoCurrent.personagens.findIndex(c => c === atacante);
    const alvoIdx = campoNpc.personagens.findIndex(c => c === alvo);
    const atacanteParaCombate = furiaBonus > 0
      ? { ...atacante, atk: (atacante.atk ?? 0) + furiaBonus, furiaBonus, _fieldIdx: atacanteIdx }
      : { ...atacante, _fieldIdx: atacanteIdx };

    resolverCombateCompleto(atacanteParaCombate, { ...alvo, _fieldIdx: alvoIdx }, false);
    // Atualiza ref imediatamente para bloquear duplo-ataque na mesma rodada (regra 26.0)
    campoJogadorRef.current = {
      ...campoCurrent,
      personagens: campoCurrent.personagens.map((c, i) => i === atacanteIdx && c ? { ...c, atacouNesteTurno: true } : c),
    };
    setCampoJogador(prev => ({
      ...prev,
      personagens: prev.personagens.map((c, i) => i === atacanteIdx && c ? { ...c, atacouNesteTurno: true } : c),
    }));
    return { ok: true, atacanteNome: atacante.name, alvoNome: alvo.name };
  }, [campoNpc, resolverCombateCompleto]);

  const jogadorAtaqueDireto = useCallback((nomeAtacante) => {
    const campoCurrent = campoJogadorRef.current;
    const nAtk = normStr(nomeAtacante);
    const atacante = campoCurrent.personagens.find(c => c && normStr(c.name).includes(nAtk));
    if (!atacante) return { ok: false, msg: `"${nomeAtacante}" não está em campo.` };
    // INTIMIDAR: permite ataque direto ao PC mesmo com personagens NPC em campo (regra INTIMIDAR)
    if (campoNpc.personagens.some(Boolean) && !temKeyword(atacante, KEYWORDS.INTIMIDAR)) {
      return { ok: false, msg: 'O NPC tem personagens em campo. Ataque direto não é permitido enquanto houver personagens em campo (regra 28.0).' };
    }
    if (!podeAtacar(atacante)) return { ok: false, msg: `${atacante.name} não pode atacar este turno (entrou agora).` };
    if (atacante.paralisado) return { ok: false, msg: `${atacante.name} está paralisado e não pode atacar (regra 27.0).` };
    if (atacante.imobilizado) return { ok: false, msg: `${atacante.name} está imobilizado e não pode atacar (regra 40.3).` };
    if (atacante.atacouNesteTurno) return { ok: false, msg: `${atacante.name} já atacou neste turno (regra 26.0).` };
    const totalEmCampo = campoCurrent.personagens.filter(Boolean).length;
    const dano = (atacante.atk ?? 0) + calcularFuria(atacante, totalEmCampo);
    setPcNpc(p => Math.max(0, p - dano));
    setLog(prev => [...prev, { t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), text: `[COMBATE DIRETO] ${atacante.name} causou ${dano} de dano direto ao NPC!`, color: '#f5d27a' }]);
    campoJogadorRef.current = {
      ...campoCurrent,
      personagens: campoCurrent.personagens.map(c => c?.name === atacante.name ? { ...c, atacouNesteTurno: true } : c),
    };
    setCampoJogador(prev => ({
      ...prev,
      personagens: prev.personagens.map(c => c?.name === atacante.name ? { ...c, atacouNesteTurno: true } : c),
    }));
    return { ok: true, dano };
  }, [campoNpc]);

  const confirmarCombate = useCallback(() => {
    if (!combatePendente) return;
    if (combatePendente.atacante && combatePendente.alvo) {
      resolverCombateCompleto(combatePendente.atacante, combatePendente.alvo, true);
    } else {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setPcJogador(p => Math.max(0, p - combatePendente.dano));
      setLog(logs => [...logs, { t: now, text: `[COMBATE] Confirmado — ${combatePendente.atacanteNome} causou ${combatePendente.dano} de dano.`, color: '#c84d2a' }]);
      setCombatePendente(null);
    }
  }, [combatePendente, resolverCombateCompleto]);

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

  const entrarSaposCururu = useCallback(async (count) => {
    const ts = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const { carta: raw } = await buscarCartaFuzzy('sapo cururu');
    if (!raw) {
      setLog(prev => [...prev, { t: ts, text: '[SAPO CURURU] Carta não encontrada.', color: '#8ac46a' }]);
      setSapoCururuPendente(null);
      return;
    }
    const carta = { ...normalizeCardForSlot(raw), entrou_turno_atual: true };
    setCampoJogador(prev => {
      const personagens = [...prev.personagens];
      let adicionados = 0;
      for (let i = 0; i < personagens.length && adicionados < count; i++) {
        if (!personagens[i]) { personagens[i] = { ...carta }; adicionados++; }
      }
      return { ...prev, personagens };
    });
    setLog(prev => [...prev, { t: ts, text: `[SAPO CURURU] ${count} Sapo(s) Cururu entraram em campo!`, color: '#8ac46a' }]);
    setSapoCururuPendente(null);
  }, []);

  return {
    loading,
    deckNpc, maoNpc, campoNpc, esquecimentoNpc, pcNpc,
    campoJogador, pcJogador,
    turno, vezDoNpc, log, fimDeJogo, prontoParaJogar,
    combatePendente, folcloricaPendente, setFolcloricaPendente,
    narracaoJogador, setNarracaoJogador,
    deckJogadorVazio, setDeckJogadorVazio,
    folcloricasAtivasJogador, folcloricasAtivasNpc,
    sapoCururuPendente, setSapoCururuPendente, entrarSaposCururu,
    npcJogarCarta, jogadorJogarCarta, jogadorJogarPlantaVirada, jogadorRevelarPlanta, jogadorEquiparCarta,
    jogadorAtacar, jogadorAtaqueDireto, confirmarCombate, aplicarResultadoCombate,
    jogadorIniciarFolclorica, jogadorCompletarFolclorica, executarEfeitoFolclorica, jogadorExecutarEfeitoPlanta, ativarPlantaContraAtaque, resolverCombateCompleto,
    passarVez: npcExecutarTurno,
    esquecimentoJogador,
    iniciarJogo,
  };
}
