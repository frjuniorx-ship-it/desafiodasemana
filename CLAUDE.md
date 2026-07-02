# Desafio da Semana — Lendas & Batalhas

Projeto React + Vite hospedado em GitHub Pages (frjuniorx-ship-it.github.io/desafiodasemana).
API WordPress em https://lendasebatalhas.com.br/wp-json/lendas/v1/

## Regras obrigatórias
- Nunca alterar src/engine/rules.js sem aprovação explícita
- Alterações cirúrgicas apenas — nunca reescrever arquivos inteiros
- Ler o arquivo completo antes de qualquer edição
- Apresentar diagnóstico antes de propor código
- Preservar toda lógica de estado e API já funcionando

## Arquitetura
- Estado centralizado em src/hooks/useBattleState.js
- Regras do jogo em src/engine/rules.js (fonte oficial)
- API em src/api/ com adapter normalizando shapes da WordPress API
- Parser de ações do jogador em src/api/battleAI.js (zero chamadas externas)
- Motor heurístico do NPC em useBattleState.js (npcExecutarTurno)

## Contexto do jogo
- Lendas & Batalhas é um TCG brasileiro com regras próprias
- Nunca assumir regras de outros card games (Magic, Yu-Gi-Oh, etc.)
- Regras oficiais estão em src/engine/rules.js
- Remoção ≠ Destruição (remoção não gera perda de PC)
- Destruição: carta vai ao esquecimento + dono perde PC igual ao custo
