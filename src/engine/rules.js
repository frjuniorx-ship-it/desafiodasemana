// ============================================================
// REGRAS OFICIAIS — LENDAS & BATALHAS
// Fonte: Livro de Regras v2023-05 + LB_Referência
// ============================================================

// CONDIÇÕES DE VITÓRIA (regra 4.0)
// Vence quem zerar os PC do adversário OU esvaziar o baralho adversário
// (se o jogador não tem cartas pra comprar no início do turno, perde)

// PC INICIAL (regra 3.0)
export const PC_INICIAL = 20;

// TAMANHO DO BARALHO (regra 2.0)
export const BARALHO_MIN = 40;
export const BARALHO_MAX = 80;

// MÃO INICIAL (regra 9.0)
export const MAO_INICIAL = 5;
// Compra no início de cada rodada: 1 carta (regra 10.0)
// Quem começa NÃO compra no primeiro turno (regra 10.0)
// Mão vazia: compra 3 cartas (regra 11.0)
export const COMPRA_MAO_VAZIA = 3;

// CARTAS POR TURNO (regra 20.0 e 20.1)
export const LIMITE_TURNO = {
  personagem: 1,      // 1 personagem (ou combinação)
  folclorica: 1,      // 1 folclórica
  acao: 1,            // 1 carta de ação
  equipamento: 1,     // 1 equipamento
  planta: 1,          // 1 planta
};

// SLOTS DO CAMPO (regra 6.0)
export const SLOTS = {
  personagens: 5,
  plantas: 3,
  folcloricas: Infinity,  // sem limite
  acao: 1,
};

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

// TURNO DE ENTRADA — personagem não pode atacar no turno que entrou (regra 21.0)
// exceto se tiver efeito INVESTIR
export function podeAtacar(carta) {
  if (carta.entrou_turno_atual) {
    const temInvestir = carta.effect_blocks?.some(b =>
      b.actions?.some(a =>
        a.effect_reference?.some(e => e.slug === 'investir')
      )
    );
    return temInvestir;
  }
  return true;
}

// COPIAS POR BARALHO (regra 37.1)
export function maxCopias(carta) {
  if (carta.tipo === 'Planta' || carta.tipo === 'Folclórica') return 3;
  const pc = carta.pontos_conhecimento || carta.pc || 0;
  if (pc <= 3) return 4;
  if (pc <= 6) return 3;
  if (pc <= 8) return 2;
  return 1;
}

// PERDA DE PC (regra 42.0 e 44.0)
// Destruição → perde PC igual ao custo da carta
// Remoção → NÃO perde PC
export const REMOCAO_NAO_PERDE_PC = true;

// ATAQUE DIRETO (regra 28.0)
// Permitido quando adversário não tem personagens em campo
// Se adversário tem plantas mas não personagens, pode atacar direto
// e adversário pode virar uma planta pra tentar bloquear (regra 28.1)

// VENENO MORTAL (glossário)
// Ao contra-atacar, remove o personagem atacante (não destrói — sem perda de PC)
// Só ativa se a carta estiver CONTRA-ATACANDO, não atacando

// ATRAVESSAR (glossário)
// Sobra de dano vai direto pro PC do adversário
// Ex: ATQ 8 vs DEF 3 → carta destruída + 5 de dano direto no PC

// FÚRIA (glossário — MUTÁVEL)
// Sozinha em campo: +2 ATQ
// Com 1 outro personagem: +1 ATQ
// Com 2 ou mais outros personagens: sem bônus

// INTIMIDAR (glossário)
// Ao entrar em campo: -1 ATQ em todas as cartas adversárias já em campo
// Efeito some se a carta com INTIMIDAR sair de campo

// NÚMERO DE DESCARTE — folclóricas (regra 29.0)
// Campo nd da carta = quantas cartas devem ser descartadas pra ativar a magia
// Descarte pode vir da mão E/OU do campo (exceto cartas sob efeito negativo,
// cartas com duração de turno ativa, magias/encantamentos ativos)

// TORRE DE EFEITOS (regra 39.0)
// Efeitos não resolvem imediatamente — ficam em fila LIFO
// Primeiro efeito anunciado fica na base, últimos resolvem primeiro
// Ambos os jogadores podem responder antes de resolver

// REGENERAÇÃO DE DEFESA (FAQ do livro de regras)
// DEF reduzida por combate regenera após o turno completo
// (1 rodada de cada jogador = 1 turno completo)
// Regeneração é parcial: só regenera do ataque mais antigo se sofreu múltiplos

// REMOÇÃO vs DESTRUIÇÃO
// Destruição: carta vai pro esquecimento E jogador perde PC
// Remoção: carta vai pro esquecimento SEM perda de PC
// Imunidade a efeitos negativos NÃO protege de remoção
// (remoção não está na lista de efeitos negativos do glossário)

// EFEITOS NEGATIVOS (glossário) — lista oficial:
// Paralisia, Diminuir ATQ/DEF, Alterar PC, Arruinar, Imobilizar
// Remoção NÃO é efeito negativo

// SUBSTITUIÇÃO (regra 15.0 e glossário)
// Trocar uma carta em campo por outra da mão (mesma zona)
// Carta substituída vai pro esquecimento SEM perda de PC (é remoção)
