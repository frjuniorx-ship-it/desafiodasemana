const AI_KEY = import.meta.env.VITE_ANTHROPIC_KEY ?? '';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `Você é o narrador estratégico de "Lendas & Batalhas", jogo de cartas da cultura brasileira.
Analise o estado do campo e a mensagem do jogador. Retorne SOMENTE um JSON com a ação.

Ações válidas:
{ "acao": "jogar", "carta": "<nome exato>" }
{ "acao": "atacar", "atacante": "<nome>", "alvo": "<nome>" }
{ "acao": "ataque_direto", "atacante": "<nome>" }
{ "acao": "equipar", "equipamento": "<nome>", "alvo": "<nome do personagem>" }
{ "acao": "confirmar" }
{ "acao": "passar" }
{ "acao": "responder", "texto": "<comentário estratégico em português, máx 2 frases>" }

Retorne SOMENTE o JSON, sem markdown, sem texto adicional.`;

export async function processarAcaoBatalha(mensagem, estado) {
  if (!AI_KEY) {
    return { acao: 'responder', texto: 'Configure VITE_ANTHROPIC_KEY no .env para habilitar a IA.' };
  }

  const content = `Estado do campo:\n${JSON.stringify(estado, null, 2)}\n\nJogador: "${mensagem}"`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[battleAI]', res.status, err);
      return { acao: 'responder', texto: 'A IA está indisponível no momento.' };
    }

    const data = await res.json();
    const raw = (data.content?.[0]?.text ?? '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { acao: 'responder', texto: raw || 'Sem resposta da IA.' };
    return JSON.parse(match[0]);
  } catch (e) {
    console.error('[battleAI] exceção:', e);
    return { acao: 'responder', texto: 'Erro de conexão com a IA.' };
  }
}
