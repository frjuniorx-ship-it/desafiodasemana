export const MOCK_DESAFIOS = [
  {
    id: 9001,
    titulo: 'Padre Anchieta',
    frase_flavor: 'A fé é a armadura que nenhuma lâmina rompe',
    dificuldade: 3,
    cor_assinatura: '#4A2C6E',
    status: 'ativo',
    recompensa_tipo: 'titulo',
    recompensa_valor: 'Bandeirante da Fé',
    posicao_grade: 1,
    imagem_url: '',
  },
];

export function getDesafiosMock() {
  return Promise.resolve(MOCK_DESAFIOS);
}
