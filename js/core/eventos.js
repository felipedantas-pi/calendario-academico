/**
 * Operações sobre a lista de eventos – funções puras, sem DOM.
 *
 * Um evento é:
 *   { id, tipo, titulo, periodos: [{ de, ate? }], marcos?, ref?, compensa?, obs?, pendencia?, diaOriginal? }
 * `periodos` aceita vários intervalos (ex.: "21 a 25 e 28"). Um evento sem períodos
 * é um evento "sem data" – aparece na lista e em Pendências, mas não no calendário.
 */
import { comparar, intervalo } from './datas.js';

/** Todas as datas ISO cobertas pelo evento, ordenadas e sem repetição. */
export function datasDoEvento(evento) {
  const set = new Set();
  for (const p of evento.periodos ?? []) {
    for (const d of intervalo(p.de, p.ate ?? p.de)) set.add(d);
  }
  return [...set].sort(comparar);
}

/** Primeira data do evento (para ordenar/agrupar) ou null se não houver. */
export function primeiraData(evento) {
  const menor = (evento.periodos ?? []).map((p) => p.de).filter(Boolean).sort(comparar)[0];
  return menor ?? null;
}

/** Índice data -> eventos que ocorrem nela. */
export function indexarPorDia(eventos) {
  const mapa = new Map();
  for (const ev of eventos) {
    for (const d of datasDoEvento(ev)) {
      if (!mapa.has(d)) mapa.set(d, []);
      mapa.get(d).push(ev);
    }
  }
  return mapa;
}

/** Ordena por data inicial (eventos sem data ficam por último) e depois por título. */
export function ordenarEventos(eventos) {
  return [...eventos].sort((a, b) => {
    const da = primeiraData(a);
    const db = primeiraData(b);
    if (da && db) return comparar(da, db) || a.titulo.localeCompare(b.titulo, 'pt-BR');
    if (da) return -1;
    if (db) return 1;
    return a.titulo.localeCompare(b.titulo, 'pt-BR');
  });
}

/** Agrupa eventos por mês (1–12) da primeira data; eventos sem data vão para a chave 0. */
export function agruparPorMes(eventos) {
  const grupos = new Map();
  for (const ev of ordenarEventos(eventos)) {
    const data = primeiraData(ev);
    const mes = data ? Number(data.slice(5, 7)) : 0;
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push(ev);
  }
  return grupos;
}

/** Próximo id livre no formato evNNN. */
export function novoId(eventos) {
  const maior = eventos.reduce((max, e) => Math.max(max, Number(/^ev(\d+)$/.exec(e.id)?.[1] ?? 0)), 0);
  return `ev${String(maior + 1).padStart(3, '0')}`;
}

/** Garante que todos os eventos tenham id único (usado ao importar arquivos). */
export function garantirIds(eventos) {
  const usados = new Set();
  for (const ev of eventos) {
    if (!ev.id || usados.has(ev.id)) ev.id = null;
    else usados.add(ev.id);
  }
  for (const ev of eventos) {
    if (!ev.id) {
      ev.id = novoId([...eventos.filter((e) => e.id)]);
    }
  }
  return eventos;
}

/** Normaliza texto para busca (minúsculas, sem acentos). */
export const normalizar = (txt) =>
  String(txt ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
