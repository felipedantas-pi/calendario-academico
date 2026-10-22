/**
 * Visão "Pendências": resultado da validação automática (js/core/validacao.js).
 */
import { h } from '../lib/dom.js';
import { resumirProblemas } from '../core/validacao.js';
import { estadoVazio } from './comuns.js';

const TITULO_NIVEL = { erro: 'Erros', aviso: 'Para revisar', info: 'Observações' };
const EXPLICA_NIVEL = {
  erro: 'Dados que não fazem sentido (data inexistente, sábado que não é sábado…).',
  aviso: 'Inconsistências entre partes do calendário. Confirme qual informação está correta.',
  info: 'Notas do documento original e fatos úteis; não exigem correção.',
};

function itemProblema(ctx, p) {
  const alvo = p.eventoId
    ? h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.editarEvento(p.eventoId) }, 'Abrir evento')
    : h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.abrirConfiguracoes() }, 'Abrir configurações');
  return h('li', { class: `pendencia pendencia--${p.nivel}` },
    h('div', { class: 'pendencia__texto' },
      h('strong', {}, p.titulo),
      h('span', {}, p.detalhe)),
    p.data && h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.abrirDia(p.data) }, 'Ver no calendário'),
    alvo);
}

export function renderVisaoPendencias(ctx) {
  const resumo = resumirProblemas(ctx.problemas);
  if (!ctx.problemas.length) {
    return h('div', { class: 'visao' }, h('div', { class: 'card' }, estadoVazio('✓ Nenhuma inconsistência encontrada.')));
  }
  const grupos = ['erro', 'aviso', 'info']
    .filter((n) => resumo[n] > 0)
    .map((nivel) => h('section', { class: 'card' },
      h('header', { class: 'quadro__topo' },
        h('h2', { class: 'quadro__titulo' }, `${TITULO_NIVEL[nivel]} `, h('span', { class: `contagem contagem--${nivel}` }, String(resumo[nivel]))),
        h('p', { class: 'quadro__nota' }, EXPLICA_NIVEL[nivel])),
      h('ul', { class: 'pendencias' }, ctx.problemas.filter((p) => p.nivel === nivel).map((p) => itemProblema(ctx, p)))));
  return h('div', { class: 'visao visao--pendencias' }, grupos);
}
