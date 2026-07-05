// Normaliza qualquer formato de carta da API para o modelo interno.
// Lida com dois shapes diferentes:
//   Shape A — GET /cartas:   { ataque, defesa, pontos_conhecimento, classes, tipo }
//   Shape B — GET /desafios/{id} deck: { atq, def, pc, classe, categoria }

function extrairBonusDeEffectBlocks(effect_blocks) {
  if (!effect_blocks?.length) return { atqBonus: 0, defBonus: 0, pcBonus: 0 };
  let atqBonus = 0, defBonus = 0, pcBonus = 0;
  effect_blocks.forEach(bloco => {
    (bloco.actions || []).forEach(action => {
      if (['modify_attack', 'modify_stats'].includes(action.type)) {
        atqBonus += action.value_attack || 0;
      }
      if (['modify_defense', 'modify_stats'].includes(action.type)) {
        defBonus += action.value_defense || 0;
      }
      if (action.type === 'gain_pc') {
        pcBonus += action.value_pc || 0;
      }
    });
  });
  return { atqBonus, defBonus, pcBonus };
}

// Extrai o número de descartes necessários para jogar a carta.
// Usa || em vez de ?? para ignorar 0 (valor padrão inteiro da API) e buscar o campo real.
function extrairND(raw) {
  const topLevel = raw.numero_descarte || raw.nd_value || raw.nd || 0;
  if (topLevel > 0) return topLevel;
  for (const bloco of (raw.effect_blocks || [])) {
    for (const action of (bloco.actions || [])) {
      if (action.type === 'discard_cards') {
        const n = action.value ?? action.count ?? action.quantidade ?? action.value_discard ?? 0;
        if (n > 0) return n;
      }
    }
  }
  return null;
}

export function adaptarCarta(raw) {
  const efeitoTexto = raw.magia || raw.combo_habilidade || raw.instinto || raw.encantamento || '';
  const bonus = extrairBonusDeEffectBlocks(raw.effect_blocks);
  return {
    nome:             raw.nome             ?? '',
    atq:              raw.atq   || raw.ataque              || bonus.atqBonus || 0,
    def:              raw.def   || raw.defesa              || bonus.defBonus || 0,
    pc:               raw.pc    || raw.pontos_conhecimento || bonus.pcBonus  || 0,
    classe:           toArray(raw.classe   ?? raw.classes),
    categoria:        raw.categoria        ?? raw.tipo                ?? '',
    efeito:           efeitoTexto || raw.efeito || [],
    efeitoTexto,
    effect_blocks:    raw.effect_blocks    || [],
    slug:             raw.slug ? raw.slug.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : null,
    nd:               extrairND(raw),
    numero_descarte:  extrairND(raw),
    mecanica:         toArray(raw.mecanica ?? raw.mecanicas ?? []),
    magia:            raw.magia            ?? null,
    combo_habilidade: raw.combo_habilidade ?? null,
    instinto:         raw.instinto         ?? null,
    encantamento:     raw.encantamento     ?? null,
    ativacao:         raw.ativacao         ?? null,
    imagemUrl:        raw.imagem_url       ?? '',
    imagem_url:       raw.imagem_url       ?? '',
    imagemIlustracao: raw.imagem_ilustracao ?? '',
  };
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
