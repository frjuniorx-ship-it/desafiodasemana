// Parser local de ações — zero custo, zero chamadas externas
export function processarAcaoBatalha(texto, estadoCampo) {
  const t = texto.trim().toLowerCase();

  // PASSAR VEZ
  if (/^(passo|fim|termino|acabei|próximo turno|pass)/.test(t)) {
    return { acao: 'passar_vez' };
  }

  // CONFIRMAR COMBATE
  if (/^(confirmo|ok|aceito|sem resposta|confirmar)/.test(t)) {
    return { acao: 'confirmar_combate' };
  }

  // ATACAR COM CARTA ESPECÍFICA
  const mAtacar = t.match(/(?:ataco|ataquei|ataque|atacando)\s+(.+?)\s+(?:com|usando)\s+(.+)/);
  if (mAtacar) {
    return { acao: 'atacar', alvo: mAtacar[1].trim(), carta: mAtacar[2].trim() };
  }

  // ATAQUE DIRETO
  if (/(?:ataco|ataquei)\s+direto/.test(t) ||
      /ataco\s+(?:o\s+)?(?:pc|pontos)/.test(t)) {
    return { acao: 'ataque_direto' };
  }

  // ATACAR SEM ESPECIFICAR CARTA (usa primeiro disponível)
  const mAtacarSimples = t.match(/^(?:ataco|ataquei|ataque)\s+(.+)/);
  if (mAtacarSimples) {
    return { acao: 'atacar', alvo: mAtacarSimples[1].trim(), carta: null };
  }

  // EQUIPAR
  const mEquipar = t.match(/(?:equip(?:ei|o)|coloco|jogo)\s+(.+?)\s+(?:em|no|na|sobre|em cima de)\s+(.+)/);
  if (mEquipar) {
    return { acao: 'equipar', carta: mEquipar[1].trim(), alvo: mEquipar[2].trim() };
  }

  // ATIVAR PLANTA
  const mPlanta = t.match(/(?:ativo|ativa|uso)\s+(?:a\s+planta\s+)?(.+)/);
  if (mPlanta) {
    return { acao: 'ativar_planta', carta: mPlanta[1].trim() };
  }

  // DESCARTAR (para folclóricas)
  const mDescartar = t.match(/(?:descarto|descartar)\s+(.+)/);
  if (mDescartar) {
    return { acao: 'descartar', carta: mDescartar[1].trim() };
  }

  // JOGAR CARTA (padrão mais genérico, deve vir por último)
  const mJogar = t.match(/(?:jogu(?:ei|ar)|jogo|baixei|coloquei|desci|entrou|uso a carta)\s+(.+)/);
  if (mJogar) {
    let nome = mJogar[1].trim();
    // Remover "em campo", "no campo", "na área" do final
    nome = nome.replace(/\s+(?:em|no|na)\s+(?:campo|área|espaço).*/i, '').trim();
    // Detectar equipamento junto ("joguei Tibiriçá equipado com Arco & Flecha")
    const mComEquip = nome.match(/(.+?)\s+equipad[oa]\s+com\s+(.+)/i);
    if (mComEquip) {
      return {
        acao: 'jogar_com_equipamento',
        carta: mComEquip[1].trim(),
        equipamento: mComEquip[2].trim(),
      };
    }
    return { acao: 'jogar_carta', carta: nome };
  }

  // REMOVER/SUBSTITUIR
  const mRemover = t.match(/(?:remov[oi]|substituo|troco)\s+(.+)/);
  if (mRemover) {
    return { acao: 'remover', carta: mRemover[1].trim() };
  }

  // Não reconheceu — retorna null pra mostrar ajuda
  return null;
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
