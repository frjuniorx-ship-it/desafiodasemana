import { normStr } from '../hooks/useBattleState.js';

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

  // PASSAR VEZ
  if (/\b(passo|fim|termino|acabei|proximo turno|pass|nao tenho mais|sem jogada|finalizo)\b/.test(t)) {
    return { acao: 'passar_vez' };
  }

  // CONFIRMAR COMBATE
  if (/\b(confirmo|ok|aceito|sem resposta|confirmar|tudo certo|pode resolver)\b/.test(t)) {
    return { acao: 'confirmar_combate' };
  }

  // ATAQUE DIRETO COM CARTA — "ataco direto com Tibiriçá" (antes de "ataco X com Y")
  const mAtaqueDiretoComCarta = t.match(/(?:atac[oa]|ataquei|atacando)\s+(?:direto|diretamente)\s+(?:com|usando|pelo)\s+(?:o\s+|a\s+)?(.+)/);
  if (mAtaqueDiretoComCarta) {
    return { acao: 'ataque_direto', carta: limpar(mAtaqueDiretoComCarta[1]) };
  }

  // ATAQUE DIRETO GENÉRICO — vem antes de "ataco X com Y" para que "direto" não seja tratado como nome de alvo
  if (/(?:atac[oa]|ataque|mand[oa]|caus[oa])\s+(?:direto|nos?\s+pc|[ao]\s+pc|[ao]\s+jogador|na\s+vida|dano\s+direto)/.test(t)) {
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

  // ATIVAR PLANTA — antes de JOGAR CARTA (ambos usam "uso/ativo")
  const mPlanta = t.match(/(?:ativ(?:o|ei)|vir(?:o|ei))\s+(?:a\s+planta\s+)?(.+)/);
  if (mPlanta) {
    return { acao: 'ativar_planta', carta: limpar(mPlanta[1]) };
  }

  // DESCARTAR
  const mDescartar = t.match(/(?:descart(?:o|ei)|descartar)\s+(?:o\s+|a\s+)?(.+)/);
  if (mDescartar) {
    return { acao: 'descartar', carta: limpar(mDescartar[1]) };
  }

  // JOGAR PLANTA VIRADA — sem nome de carta (antes de JOGAR CARTA para não ser capturado pelo genérico)
  if (/(?:coloc[oa]|boto|bota|ponho|jog[oa]|baix[oa])\s+uma\s+planta/.test(t) ||
      /\bplanta\s+(?:em\s+campo|virada?|sem\s+revelar)\b/.test(t) ||
      /^planta\s+em\s+campo$/.test(t)) {
    return { acao: 'jogar_planta_virada' };
  }

  // JOGAR CARTA (padrão genérico com verbos expandidos — por último)
  const mJogar = t.match(/(?:jog(?:o|uei|ar)|baix(?:o|ei)|coloc[ao]|ponho|poe|desc(?:o|i)|entr(?:a|ou)|us(?:o|ei)|ativ(?:o|ei)|adiciono|boto|bota)\s+(?:o\s+|a\s+|um(?:a)?\s+)?(.+)/);
  if (mJogar) {
    return { acao: 'jogar_carta', carta: limpar(mJogar[1]), ...(zonaTexto ? { zona: zonaTexto } : {}) };
  }

  // REMOVER/SUBSTITUIR
  const mRemover = t.match(/(?:remov(?:o|i)|substitu(?:o|i)|troc(?:o|uei))\s+(?:o\s+|a\s+)?(.+)/);
  if (mRemover) {
    return { acao: 'remover', carta: limpar(mRemover[1]) };
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
