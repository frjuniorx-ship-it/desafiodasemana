import { useState } from 'react';

const KEY = 'lendas_progresso_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

export function useProgress() {
  const [progress, setProgress] = useState(load);

  function markWon(npcId) {
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const next = { ...progress, [String(npcId)]: { resultado: 'vitoria', data: date } };
    setProgress(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function getState(npcId, sortedIds) {
    const id = String(npcId);
    if (progress[id]?.resultado === 'vitoria') return 'won';
    const idx = sortedIds.indexOf(id);
    const allPrevWon = sortedIds.slice(0, idx).every(i => progress[i]?.resultado === 'vitoria');
    return allPrevWon ? 'available' : 'locked';
  }

  function getDate(npcId) {
    return progress[String(npcId)]?.data || '';
  }

  return { markWon, getState, getDate };
}
