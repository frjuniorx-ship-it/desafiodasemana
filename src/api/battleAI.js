import { normStr } from '../hooks/useBattleState.js';

// ── Cache de cartas para classificação por tipo ─────────────────────────────
function simBigramas(a, b) {
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const na = norm(a), nb = norm(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bgs = s => { const bg = new Set(); for (let i = 0; i < s.length - 1; i++) bg.add(s[i] + s[i + 1]); return bg; };
  const bgA = bgs(na), bgB = bgs(nb);
  let inter = 0; bgA.forEach(g => { if (bgB.has(g)) inter++; });
  return (2 * inter) / (bgA.size + bgB.size);
}

const STOP_WORDS = new Set([
  'jogo','joguei','jogar','baixo','baixei','coloco','coloquei','ponho','poe','boto','bota',
  'desc','desci','entra','entrou','uso','usei','usar','ativo','ativei','ativar','adiciono',
  'ataco','ataquei','ataque','atacando',
  'equipo','equipei','equipar',
  'revelo','revelei','revelar','revela','descubro','descobri',
  'descarto','descartei','descartar',
  'combino','combinei','combinar',
  'o','a','os','as','um','uma','uns','umas','de','da','do','em','no','na','nos','nas',
  'com','sem','para','pro','pra','por','pelo','pela','e','ou',
  'campo','area','jogo','slot','posicao',
  'direto','diretamente','primeiro','segundo','terceiro',
]);

let _cartasCache = [];

export function inicializarCacheCartas(cartas) {
  if (Array.isArray(cartas) && cartas.length > 0) _cartasCache = cartas;
}

export function getCacheSize() { return _cartasCache.length; }

// Nomes de folclóricas já normalizados (sem acento, sem hífen, minúsculas)
const FOLCLORICAS_CONHECIDAS_NORM = [
  'boitata', 'quibungo', 'gorjala', 'pisadeira', 'saci', 'curupira',
  'iara', 'uirapuru', 'mao de cabelo', 'anhanga', 'cuca', 'lobisomem',
  'besta fera', 'vitoria regia', 'homem do saco', 'mula sem cabeca',
  'batatao', 'passaro fogo', 'barba ruiva',
];

function ehFolcloricaConhecida(texto) {
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/-/g, ' ');
  const t = norm(texto);
  return FOLCLORICAS_CONHECIDAS_NORM.some(f => t.includes(f) || f.includes(t));
}

function extrairNomeCarta(t) {
  return t.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w)).join(' ').trim();
}

function classificarPorTipo(carta) {
  const cat = normStr(carta.categoria || carta.category || carta.tipo || '');
  const cls = (carta.classe || carta.classes || []).map(c => normStr(c || ''));
  if (cat.includes('folcl') || cls.some(c => c.includes('folcl'))) return 'folclorica';
  if (cat.includes('planta') || cls.some(c => c === 'planta')) return 'planta';
  if (cat.includes('equip') || cls.some(c => c.includes('equip'))) return 'equipamento';
  if (cat.includes('personagem') || cls.some(c => c === 'personagem')) return 'personagem';
  return 'desconhecido';
}

function buscarCartaNoCache(nome) {
  if (!nome || _cartasCache.length === 0) return null;
  const n = normStr(nome);
  const nomeNorm = c => normStr(c.nome || c.name || '');
  let found = _cartasCache.find(c => nomeNorm(c) === n);
  if (found) return found;
  const palavras = n.split(' ').filter(p => p.length > 2);
  if (palavras.length > 0) {
    found = _cartasCache.find(c => {
      const cn = nomeNorm(c);
      return palavras.filter(p => cn.includes(p)).length >= Math.min(2, palavras.length);
    });
    if (found) return found;
  }
  const longas = n.split(' ').filter(p => p.length >= 4);
  if (longas.length > 0) {
    found = _cartasCache.find(c => longas.some(p => nomeNorm(c).includes(p)));
    if (found) return found;
  }
  let melhor = null, melhorSim = 0;
  for (const c of _cartasCache) {
    const sim = simBigramas(n, nomeNorm(c));
    if (sim > melhorSim) { melhorSim = sim; melhor = c; }
  }
  return melhorSim >= 0.35 ? melhor : null;
}

// Parser local de ações — zero custo, zero chamadas externas
export function processarAcaoBatalha(texto, estadoCampo) {
  const t = normStr(texto); // normaliza acentos, minúsculas, hífens→espaço

  // Remove sufixos e artigos que não fazem parte do nome da carta
  const limpar = (s) => s
    .replace(/\b(em campo|no campo|na area|em jogo|agora|ja|para o campo|pro campo|no primeiro slot|no segundo slot|no terceiro slot|em cima|embaixo)\b/g, '')
    .replace(/\b(a carta|o personagem|a planta|o equipamento|a folclorica|uma planta|um personagem)\b/g, '')
    .replace(/\bpc\b/g, '')
    .trim();

  // Detecta zona pelo contexto do texto (hint para quem chama)
  const zonaTexto = /\bfolcl/.test(t) ? 'folcloricas' : /\bplanta\b/.test(t) ? 'plantas' : null;

  // DECLARAR COMPRA — "comprei 2 cartas", "peguei uma carta"
  const mCompra = t.match(/(?:comprei|compro|peguei|tirei)\s+(\d+|uma|um|dois|duas|tres|tres)\s+carta/);
  if (mCompra) {
    const qtdMap = { 'uma': 1, 'um': 1, 'dois': 2, 'duas': 2, 'tres': 3 };
    const qtd = qtdMap[mCompra[1]] ?? parseInt(mCompra[1]) ?? 1;
    return { acao: 'declarar_compra', quantidade: qtd };
  }

  // DECLARAR MÃO — "tenho 3 cartas", "estou com 5 cartas na mão"
  const mMao = t.match(/(?:tenho|estou com|fiquei com)\s+(\d+|uma|um|dois|duas|tres|quatro|cinco|seis|sete|oito)\s+(?:carta|na\s*m[ao]o)/);
  if (mMao) {
    const qtdMap = { 'uma': 1, 'um': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8 };
    const qtd = qtdMap[mMao[1]] ?? parseInt(mMao[1]);
    return { acao: 'declarar_mao', quantidade: qtd };
  }

  // DECLARAR DECK VAZIO — jogador perde no início do próximo turno (regra 4.0)
  if (/(?:meu\s+baralho\s+zerou|nao\s+tenho\s+mais\s+cartas\s+(?:pra|para)\s+comprar|baralho\s+(?:vazio|zerou|acabou)|deck\s+(?:vazio|zerou|acabou)|sem\s+cartas\s+(?:pra|para)\s+comprar)/.test(t)) {
    return { acao: 'declarar_deck_vazio' };
  }

  // PASSAR VEZ
  if (/\b(passo|fim|termino|acabei|proximo turno|pass|nao tenho mais|sem jogada|finalizo)\b/.test(t)) {
    return { acao: 'passar_vez' };
  }

  // CONFIRMAR COMBATE
  if (/^(confirmo|ok|aceito|sem resposta|confirmar|confirmado|pode|segue|resolve|sim|tudo certo|pode resolver|vamos|vai|continua|next)\b/.test(t)) {
    return { acao: 'confirmar_combate' };
  }

  // ATAQUE DIRETO COM CARTA — "ataco direto com Tibiriçá" (antes de "ataco X com Y")
  const mAtaqueDiretoComCarta = t.match(/(?:atac[oa]|ataquei|atacando)\s+(?:direto|diretamente)\s+(?:com|usando|pelo)\s+(?:o\s+|a\s+)?(.+)/);
  if (mAtaqueDiretoComCarta) {
    return { acao: 'ataque_direto', carta: limpar(mAtaqueDiretoComCarta[1]) };
  }

  // ATAQUE DIRETO GENÉRICO — vem antes de "ataco X com Y" para que "direto" não seja tratado como nome de alvo
  if (/(?:atac[oa]|ataque|mand[oa]|caus[oa]|v[oó]|bate)\s+(?:direto|diretamente|nos?\s+pc|[ao]\s+pc|[ao]\s+jogador|na\s+vida|dano\s+direto)/.test(t)) {
    return { acao: 'ataque_direto' };
  }

  // ATACAR COM CARTA ESPECÍFICA — "ataco X com Y"
  const mAtacar = t.match(/(?:atac[oa]|ataquei|atacando)\s+(?:o\s+|a\s+)?(.+?)\s+(?:com|usando|pelo)\s+(?:o\s+|a\s+)?(.+)/);
  if (mAtacar) {
    return { acao: 'atacar', alvo: limpar(mAtacar[1]), carta: limpar(mAtacar[2]) };
  }
  // "Tibiriçá ataca Caapora" → carta=Tibiriçá, alvo=Caapora
  const mAtacarInverso = t.match(/(.+?)\s+(?:ataca|vai atacar)\s+(?:o\s+|a\s+)?(.+)/);
  if (mAtacarInverso) {
    return { acao: 'atacar', alvo: limpar(mAtacarInverso[2]), carta: limpar(mAtacarInverso[1]) };
  }

  // "ataco" ou "atacar" sozinho → modo seleção de atacante por clique
  if (/^(?:atac[oa]|atacar)$/.test(t)) {
    return { acao: 'selecionar_atacante' };
  }

  // ATACAR SEM ESPECIFICAR CARTA (usa primeiro disponível)
  const mAtacarSimples = t.match(/^(?:atac[oa]|ataquei|ataque)\s+(?:o\s+|a\s+)?(.+)/);
  if (mAtacarSimples) {
    return { acao: 'atacar', alvo: limpar(mAtacarSimples[1]), carta: null };
  }

  // EQUIPAR — se alvo é zona genérica ("campo", "area"…) não é equipar, cai para jogar_carta
  const mEquipar = t.match(/(?:equip(?:o|ei|ar)|coloc(?:o|ei))\s+(?:o\s+|a\s+)?(.+?)\s+(?:em|no|na|sobre|em cima de)\s+(?:o\s+|a\s+)?(.+)/);
  if (mEquipar) {
    const alvo = limpar(mEquipar[2]);
    if (alvo && !['campo', 'area', 'jogo', 'slot'].includes(alvo)) {
      return { acao: 'equipar', carta: limpar(mEquipar[1]), alvo };
    }
  }

  // JOGAR COM EQUIPAMENTO — "joguei Tibiriçá equipado com Arco e Flecha"
  const mComEquip = t.match(/(.+?)\s+equipad[oa]\s+com\s+(.+)/);
  if (mComEquip) {
    return {
      acao: 'jogar_com_equipamento',
      carta: limpar(mComEquip[1].replace(/^(?:jog(?:o|uei)|baix(?:o|ei)|desc(?:o|i)|coloc[ao]|bot[ao])\s+/, '')),
      equipamento: limpar(mComEquip[2]),
    };
  }

  // REVELAR PLANTA — "3 espaço de planta revelo capim limão", "revelo capim limão no slot 2", ou só "revelo capim limão"
  const mRevelarComSlot = t.match(/^(\d+)[°ºo]?\s+(?:espaco|slot|posic[ao]o?)(?:\s+de\s+planta)?\s+(?:rev[ei]l[oa]?|descubr[oa])\s+(?:a\s+planta\s+|o\s+|a\s+)?(.+)/);
  if (mRevelarComSlot) {
    return { acao: 'revelar_planta', carta: limpar(mRevelarComSlot[2]), slot: parseInt(mRevelarComSlot[1]) - 1 };
  }
  // "revelo [nome] no slot N" ou "revelo [nome] slot N"
  const mRevelarNomeSlot = t.match(/(?:rev[ei]l[oa]?|revela[nr]?|descubr[oa])\s+(?:a\s+planta\s+|o\s+|a\s+)?(.+?)\s+(?:no\s+slot|slot|na\s+posic[ao]o?)\s+(\d+)/);
  if (mRevelarNomeSlot) {
    return { acao: 'revelar_planta', carta: limpar(mRevelarNomeSlot[1]), slot: parseInt(mRevelarNomeSlot[2]) - 1 };
  }
  const mRevelar = t.match(/(?:rev[ei]l[oa]?|revela[nr]?|descubr[oa])\s+(?:a\s+planta\s+|o\s+|a\s+)?(.+)/);
  if (mRevelar) {
    return { acao: 'revelar_planta', carta: limpar(mRevelar[1]) };
  }

  // FOLCLÓRICA COM DESCARTE — "descarto X e ativo [nome folclórica]"
  const mFolcDesc = t.match(/descart(?:o|ei)\s+(?:o\s+|a\s+)?(.+?)\s+e\s+(?:ativ(?:o|ei)|us(?:o|ei)|jog(?:o|uei))\s+(?:a\s+folcl[oa]rica\s+|a\s+|o\s+)?(.+)/);
  if (mFolcDesc) {
    return { acao: 'folclorica_com_descarte', descarte: limpar(mFolcDesc[1]), carta: limpar(mFolcDesc[2]) };
  }

  // INICIAR FOLCLÓRICA — "ativo/uso/jogo [folclórica]" quando texto contém "folcl"
  if (/\bfolcl/.test(t)) {
    const mFolc = t.match(/(?:ativ(?:o|ei)|us(?:o|ei)|jog(?:o|uei)|baix(?:o|ei)|coloc[ao])\s+(?:a\s+folcl[oa]rica\s+|a\s+|o\s+)?(.+)/);
    if (mFolc) return { acao: 'iniciar_folclorica', carta: limpar(mFolc[1]) };
    const mFolcGen = t.match(/folcl[oa]rica\s+(.+)/);
    if (mFolcGen) return { acao: 'iniciar_folclorica', carta: limpar(mFolcGen[1]) };
  }

  // ATIVAR KEYWORD EXPLÍCITO — "ativo a FURIA da onça pintada", "forço ATRAVESSAR de Tibiriçá"
  // Deve vir ANTES de mPlanta (que também captura "ativo")
  const mAtivarKw = t.match(/(?:ativ(?:o|ei)|forc(?:o|ei)|aplic(?:o|ei))\s+(?:a\s+|o\s+|o\s+efeito\s+de\s+)?(furi[ao]|atravessar|veneno\s*mortal|ignorar|atrair|investir|intimidar|arruinar|imunizar|proteger|resistencia|regenerar|frenesi)\s+(?:d[aeo]s?|n[ao]s?|em)\s+(.+)/);
  if (mAtivarKw) {
    const normKw = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '_').trim();
    return { acao: 'ativar_keyword', keyword: normKw(mAtivarKw[1]), carta: limpar(mAtivarKw[2]) };
  }

  // ATIVAR PLANTA — antes de JOGAR CARTA (ambos usam "uso/ativo")
  const mPlanta = t.match(/(?:ativ(?:o|ei)|vir(?:o|ei))\s+(?:a\s+planta\s+)?(.+)/);
  if (mPlanta) {
    return { acao: 'ativar_planta', carta: limpar(mPlanta[1]) };
  }

  // DECLARAR DESCARTE
  const mDescartar = t.match(/(?:descart(?:o|ei)|descartar)\s+(?:o\s+|a\s+)?(.+)/);
  if (mDescartar) {
    return { acao: 'declarar_descarte', carta: limpar(mDescartar[1]) };
  }

  // JOGAR PLANTA VIRADA — sem nome de carta (antes de JOGAR CARTA para não ser capturado pelo genérico)
  if (/(?:coloc[oa]|boto|bota|ponho|jog[oa]|baix[oa])\s+uma\s+planta/.test(t) ||
      /\bplanta\s+(?:em\s+campo|virada?|sem\s+revelar)\b/.test(t) ||
      /^planta\s+em\s+campo$/.test(t)) {
    return { acao: 'jogar_planta_virada' };
  }

  // COMBINAR — "combine X com Y", "jogo X combinado com Y", "combino X com Y"
  const mCombinar = t.match(/(?:combin(?:o|ei|ar)|jog(?:o|uei).+?combinad[oa]\s+com)\s+(?:o\s+|a\s+)?(.+?)\s+(?:com|e)\s+(?:o\s+|a\s+)?(.+)/);
  if (mCombinar) {
    return { acao: 'combinar', carta1: limpar(mCombinar[1]), carta2: limpar(mCombinar[2]) };
  }

  // JOGAR CARTA (padrão genérico com verbos expandidos — por último)
  const mJogar = t.match(/(?:jog(?:o|uei|ar)|baix(?:o|ei)|coloc[ao]|ponho|poe|desc(?:o|i)|entr(?:a|ou)|us(?:o|ei)|ativ(?:o|ei)|adiciono|boto|bota)\s+(?:o\s+|a\s+|um(?:a)?\s+)?(.+)/);
  if (mJogar) {
    const cartaNome = limpar(mJogar[1]);
    if (ehFolcloricaConhecida(cartaNome)) {
      return { acao: 'iniciar_folclorica', carta: cartaNome };
    }
    return { acao: 'jogar_carta', carta: cartaNome, ...(zonaTexto ? { zona: zonaTexto } : {}) };
  }

  // REMOVER/SUBSTITUIR
  const mRemover = t.match(/(?:remov(?:o|i)|substitu(?:o|i)|troc(?:o|uei))\s+(?:o\s+|a\s+)?(.+)/);
  if (mRemover) {
    return { acao: 'remover', carta: limpar(mRemover[1]) };
  }

  // FALLBACK: extrai entidade pelo tipo quando nenhum padrão de verbo casou
  if (_cartasCache.length > 0) {
    const nomeExtraido = extrairNomeCarta(t);
    if (nomeExtraido.length >= 3) {
      const carta = buscarCartaNoCache(nomeExtraido);
      if (carta) {
        const nomeCarta = carta.nome || carta.name || nomeExtraido;
        const tipo = classificarPorTipo(carta);
        if (tipo === 'folclorica') return { acao: 'iniciar_folclorica', carta: nomeCarta };
        if (tipo === 'planta')     return { acao: 'revelar_planta',     carta: nomeCarta };
        return { acao: 'jogar_carta', carta: nomeCarta };
      }
    }
  }

  return null; // não reconheceu
}

// Gera dica contextual baseada no estado do campo — sem IA, lógica pura
export function gerarDicaContextual(estadoCampo) {
  const { pcNpc, pcJogador, campoNpc, campoJogador } = estadoCampo;

  // Situação de lethal
  const ataqueTotal = campoJogador.personagens
    .filter(Boolean)
    .filter(c => !c.entrou_turno_atual)
    .reduce((acc, c) => acc + (c.atk || c.atq || c.ataque || 0), 0);
  if (ataqueTotal >= pcNpc && campoNpc.personagens.filter(Boolean).length === 0) {
    return `⚔️ Você pode vencer agora! Ataque direto com todos (${ataqueTotal} de dano vs ${pcNpc} PC).`;
  }

  // NPC com PC baixo
  if (pcNpc <= 5) return `🎯 NPC com ${pcNpc} PC — pressione o ataque!`;

  // Jogador com PC baixo
  if (pcJogador <= 5) return `⚠️ Você está com ${pcJogador} PC — jogue cartas de defesa ou bloqueio.`;

  // Campo vazio do NPC
  if (campoNpc.personagens.filter(Boolean).length === 0) {
    return `🏹 Campo do NPC vazio — você pode atacar direto nos PC!`;
  }

  return null;
}
