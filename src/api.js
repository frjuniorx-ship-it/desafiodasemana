// Barrel de re-export — mantém compatibilidade com imports existentes
// e expõe toda a camada de API para quem importar de '../api'.

export * from './api/cartas.js';
export * from './api/desafios.js';
export * from './api/progresso.js';
export { adaptarCarta } from './api/adapter.js';

// Aliases de backward-compat usados pelos componentes anteriores
export { getDesafios as fetchDesafios, getDesafioById as fetchDesafio } from './api/desafios.js';
