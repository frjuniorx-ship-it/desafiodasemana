// Normaliza qualquer formato de carta da API para o modelo interno.
// Lida com dois shapes diferentes:
//   Shape A — GET /cartas:   { ataque, defesa, pontos_conhecimento, classes, tipo }
//   Shape B — GET /desafios/{id} deck: { atq, def, pc, classe, categoria }
export function adaptarCarta(raw) {
  const efeitoTexto = raw.magia || raw.combo_habilidade || raw.instinto || raw.encantamento || '';
  return {
    nome:             raw.nome             ?? '',
    atq:              raw.atq              ?? raw.ataque              ?? 0,
    def:              raw.def              ?? raw.defesa              ?? 0,
    pc:               raw.pc               ?? raw.pontos_conhecimento ?? 0,
    classe:           toArray(raw.classe   ?? raw.classes),
    categoria:        raw.categoria        ?? raw.tipo                ?? '',
    efeito:           efeitoTexto || raw.efeito || [],
    efeitoTexto,
    effect_blocks:    raw.effect_blocks    || [],
    slug:             raw.slug             ?? null,
    nd:               raw.nd               ?? null,
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
