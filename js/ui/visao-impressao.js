/**
 * Visão de impressão: reúne calendário, eventos, resumo e datas importantes em sequência.
 * É ativada automaticamente pelo evento `beforeprint` (menu Exportar → Imprimir, ou Ctrl+P)
 * e desfeita em `afterprint`; na tela normal nunca aparece.
 */
import { h } from '../lib/dom.js';
import { MESES } from '../core/datas.js';
import { renderVisaoCalendario } from './visao-calendario.js';
import { renderTabelaEventos } from './visao-eventos.js';
import { renderVisaoQuadros } from './visao-quadros.js';

function listaDatas(ctx) {
  const porMes = new Map();
  for (const c of [...ctx.cal.comemorativas].sort((a, b) => a.mes - b.mes || a.dia - b.dia)) {
    porMes.set(c.mes, [...(porMes.get(c.mes) ?? []), c]);
  }
  return h('div', { class: 'impressao__datas' }, [...porMes].map(([mes, itens]) => h('section', {},
    h('h3', {}, MESES[mes - 1]),
    h('ul', {}, itens.map((it) => h('li', {}, h('b', {}, String(it.dia).padStart(2, '0')), ` ${it.titulo}`))))));
}

export function renderVisaoImpressao(ctx) {
  return h('div', { class: 'impressao' },
    h('section', { class: 'impressao__secao' }, renderVisaoCalendario(ctx)),
    h('section', { class: 'impressao__secao impressao__quebra' }, h('h2', {}, 'Eventos'), renderTabelaEventos(ctx)),
    h('section', { class: 'impressao__secao impressao__quebra' }, renderVisaoQuadros(ctx)),
    h('section', { class: 'impressao__secao impressao__quebra' }, h('h2', {}, 'Datas importantes'), listaDatas(ctx)));
}
