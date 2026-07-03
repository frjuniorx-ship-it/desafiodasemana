// ============================================================
// REGRAS OFICIAIS — LENDAS & BATALHAS
// Fonte: Livro de Regras v2023-05 + LB_Referência v30
// ============================================================

// CONDIÇÕES DE VITÓRIA (regra 4.0)
export const CONDICOES_VITORIA = {
  PC_ZERADO: 'pc_zerado',
  BARALHO_VAZIO: 'baralho_vazio', // sem cartas pra comprar no início do turno
};

// PC E BARALHO (regras 2.0 e 3.0)
export const PC_INICIAL = 20;
export const BARALHO_MIN = 40;
export const BARALHO_MAX = 80;

// MÃO E COMPRA (regras 9.0, 10.0, 11.0)
export const MAO_INICIAL = 5;
export const COMPRA_POR_TURNO = 1;
export const COMPRA_MAO_VAZIA = 3;
// Quem começa NÃO compra no primeiro turno (regra 10.0)

// SLOTS DO CAMPO (regra 6.0)
export const SLOTS = {
  personagens: 5,
  plantas: 3,
  folcloricas: Infinity,  // sem limite — lista lógica ilimitada (LB_Ref v30 §1.2)
  acao: Infinity,         // sem limite lógico, navegação visual limitada
};

// LIMITE DE CARTAS POR TURNO (regras 20.0 e 20.1)
export const LIMITE_TURNO = {
  personagem: 1,
  folclorica: 1,
  acao: 1,
  equipamento: 1,
  planta: 1,
};

// CÓPIAS POR BARALHO (regra 37.1)
export function maxCopias(carta) {
  // Sapo-Cururu: cópias ilimitadas (efeito específico da carta)
  if (carta.slug === 'sapo-cururu') return Infinity;
  // Cartas MC (Pindorama, Terra de Vera Cruz): até 2 cópias
  if (['pindorama', 'terra-de-vera-cruz'].includes(carta.slug)) return 2;
  if (carta.tipo === 'Planta' || carta.tipo === 'Folclórica') return 3;
  const pc = carta.pontos_conhecimento || carta.pc || 0;
  if (pc <= 3) return 4;
  if (pc <= 6) return 3;
  if (pc <= 8) return 2;
  return 1; // pc 9-10
}

// IDENTIFICAÇÃO DE TIPO DE CARTA
export function isPersonagem(carta) {
  return (
    carta.tipo === 'Histórica' ||
    carta.tipo === 'Fera' ||
    (carta.tipo === 'Apoio' && carta.mecanica?.includes('personagem'))
  );
}

export function isEquipamento(carta) {
  return carta.tipo === 'Apoio' && carta.mecanica?.includes('equipamento');
}

export function isAcaoRapida(carta) {
  return carta.tipo === 'Apoio' && carta.mecanica?.includes('acao_instantanea');
}

export function isAcaoContinua(carta) {
  return carta.tipo === 'Apoio' && (
    carta.mecanica?.includes('acao_continua') ||
    carta.mecanica?.includes('acao_turno')
  );
}

export function isFolclorica(carta) {
  return carta.tipo === 'Folclórica';
}

export function isPlanta(carta) {
  return carta.tipo === 'Planta';
}

// MODO DE ATIVAÇÃO DE PLANTAS (regra 35.0 + LB_Ref v30 §9.1)
// campo: carta.ativacao (string separada por vírgula, sem espaços)
export const ATIVACAO = {
  INSTANTANEA: 'Instantânea',
  ESPERA: 'Espera',
  CONTRA_ATAQUE: 'Contra-Ataque',
};

export function getModosAtivacao(carta) {
  if (!carta.ativacao) return [];
  return carta.ativacao.split(',');
}

export function isInstantanea(carta) {
  return getModosAtivacao(carta).includes(ATIVACAO.INSTANTANEA);
}

export function isEspera(carta) {
  return getModosAtivacao(carta).includes(ATIVACAO.ESPERA);
}

export function isContraAtaque(carta) {
  return getModosAtivacao(carta).includes(ATIVACAO.CONTRA_ATAQUE);
}

// TURNO DE ENTRADA — não pode atacar no turno que entrou (regra 21.0)
// Exceção: INVESTIR permite atacar no turno de entrada
export function podeAtacar(carta) {
  if (!carta.entrou_turno_atual) return true;
  return temKeyword(carta, 'investir');
}

// KEYWORDS PASSIVAS — slugs oficiais da API (LB_Ref v30 §7.2)
export const KEYWORDS = {
  ATRAVESSAR: 'atravessar',
  VENENO_MORTAL: 'veneno_mortal',
  IGNORAR: 'ignorar',
  ATRAIR: 'atrair',
  INVESTIR: 'investir',
  FURIA: 'furia',
  INTIMIDAR: 'intimidar',
  ARRUINAR: 'arruinar',
  IMUNIZAR: 'imunizar',
  PROTEGER: 'proteger',
  RESISTENCIA: 'resistencia',
  REGENERAR: 'regenerar',
  FRENESI: 'frenesi',
  ABSORVER_CONHECIMENTO: 'absorver_conhecimento',
  REMOCAO_ENCANTAMENTO: 'remocao_de_encantamento',
  REMOCAO_MAGIA: 'remocao_de_magia',
  IMOBILIZAR: 'imobilizar',
};

export function temKeyword(carta, keyword) {
  return carta.effect_blocks?.some(b =>
    b.actions?.some(a =>
      a.effect_reference?.some(e => e.slug === keyword)
    )
  ) || false;
}

// FÚRIA — cálculo do bônus (regra FÚRIA + clarificação oficial)
// Sozinha: +2 ATQ | Com 1 acompanhante: +1 ATQ | Com 2+: sem bônus
export function calcularFuria(carta, totalPersonagensEmCampo) {
  if (!temKeyword(carta, KEYWORDS.FURIA)) return 0;
  const acompanhantes = totalPersonagensEmCampo - 1;
  if (acompanhantes === 0) return 2;
  if (acompanhantes === 1) return 1;
  return 0;
}

// ATRAVESSAR — dano excedente vai ao PC (regra ATRAVESSAR)
export function calcularAtraves(atqAtacante, defDefensora) {
  const excedente = atqAtacante - defDefensora;
  return excedente > 0 ? excedente : 0;
}

// COMBATE — resolução básica (regras 22.0-24.0 e §7.1 LB_Ref)
// Retorna: { atacanteDestruido, defensoraDestruida, danoAoPC }
export function resolverCombate(atacante, defensora) {
  const defAposAtaque = (defensora.def || defensora.defesa || 0) - (atacante.atq || atacante.ataque || 0);
  const defAposContra = (atacante.def || atacante.defesa || 0) - (defensora.atq || defensora.ataque || 0);

  const defensoraDestruida = defAposAtaque <= 0;
  const atacanteDestruido = !temKeyword(atacante, KEYWORDS.IGNORAR) && defAposContra <= 0;

  let danoAoPC = 0;
  if (defensoraDestruida && temKeyword(atacante, KEYWORDS.ATRAVESSAR)) {
    danoAoPC = calcularAtraves(atacante.atq || atacante.ataque || 0, defensora.def || defensora.defesa || 0);
  }

  return { atacanteDestruido, defensoraDestruida, danoAoPC };
}

// PERDA DE PC (regras 42.0 e 44.0)
// Destruição → perde PC igual ao custo da carta
// Remoção → NÃO perde PC
export function pcPerdidoPorDestruicao(carta) {
  return carta.pontos_conhecimento || carta.pc || 0;
}

// EFEITOS NEGATIVOS — lista oficial do glossário
// Remoção NÃO é efeito negativo
export const EFEITOS_NEGATIVOS = [
  'paralisia', 'diminuir_atq_def', 'alterar_pc', 'arruinar', 'imobilizar'
];

// DESCARTE — pode vir da mão E/OU do campo (clarificação oficial)
// Restrições: carta sob efeito negativo, carta com magia/ação de turno ativa
export function podeSerDescartada(carta) {
  if (carta.paralisado) return false;
  if (carta.sob_efeito_adversario) return false;
  if (carta.acao_turno_ativa) return false;
  return true;
}

// SUBSTITUIÇÃO (regra 15.0)
// Só quando área está cheia. Não pode substituir carta sob efeito negativo.
export function podeSubstituir(carta) {
  return !carta.paralisado && !carta.arruinada && !carta.imobilizado;
}

// REGENERAÇÃO DE DEF (FAQ livro de regras)
// DEF reduzida regenera após turno completo (1 rodada de cada jogador)
// Regeneração é parcial — só do ataque mais antigo se sofreu múltiplos no mesmo turno

// CARTAS DO ESQUECIMENTO (regra 14.3)
// Trazidas do esquecimento: reativam efeitos + podem atacar sem turno de entrada
export const ESQUECIMENTO_REGRAS = {
  reativa_efeitos: true,
  pode_atacar_sem_turno_entrada: true,
};

// EQUIPAMENTOS (regra 31.2 e §8.2 LB_Ref)
// Nunca entram em campo sozinhos
// PC somado ao personagem equipado
// Não podem ser descartados individualmente após equipar
export function podeEquipar(equipamento, personagem) {
  if (!isEquipamento(equipamento)) return false;
  if (!personagem) return false;
  const classesEq = equipamento.classes || [];
  const classesPerso = personagem.classes || [];
  if (classesEq.length === 0) return true; // sem restrição de classe
  return classesEq.some(c => classesPerso.includes(c));
}

// FOLCLÓRICAS — Número de Descarte (regra 29.0)
export function podeSer_Jogada_Folclorica(carta, maoDisponivel) {
  if (!isFolclorica(carta)) return false;
  const nd = carta.nd || carta.numero_descarte || 0;
  // cartas disponíveis pra descartar = mão menos a própria carta
  const disponíveis = maoDisponivel.filter(c => c !== carta && podeSerDescartada(c));
  return disponíveis.length >= nd;
}

// TORRE DE EFEITOS (regra 39.0) — LIFO
// Efeitos não resolvem imediatamente
// Ambos os jogadores podem responder antes de resolver
// Último efeito anunciado resolve primeiro
export const TORRE_REGRAS = {
  ordem: 'LIFO',
  requer_alvo_anunciado: true,
  ambos_podem_responder: true,
};
