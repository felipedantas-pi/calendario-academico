/**
 * Visão "Calendário": legenda + 12 meses coloridos.
 *
 * Substitui as 12 tabelas pintadas à mão no Word: cada célula é calculada a partir dos
 * eventos (cor = categoria de maior prioridade do dia) e das regras de dia letivo.
 */
import { h } from '../lib/dom.js';
import {
  DIAS_SEMANA_INICIAL, MESES, diaDaSemana, diasNoMes, iso, somarDias,
} from '../core/datas.js';
import { indexarPorDia } from '../core/eventos.js';
import { dataLonga } from './comuns.js';

/** Legenda clicável: destaca no calendário só os dias da categoria escolhida. */
function renderLegenda(ctx) {
  const { categorias, store } = ctx;
  const destaque = store.obterUi().destaque;
  const botao = (cat) => h('button', {
    type: 'button',
    class: `legenda__item${destaque === cat.id ? ' legenda__item--ativo' : ''}`,
    'aria-pressed': String(destaque === cat.id),
    title: 'Clique para destacar apenas esta categoria',
    onclick: () => store.alterarUi({ destaque: destaque === cat.id ? null : cat.id }),
  }, h('span', { class: `legenda__cor legenda__cor--${cat.estilo}`, style: { '--cor': cat.cor } }), cat.nome);

  return h('section', { class: 'legenda card', 'aria-label': 'Legenda' },
    h('div', { class: 'legenda__cab' },
      h('h2', { class: 'legenda__titulo' }, 'Legenda'),
      h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.abrirCategorias() }, '🎨 Categorias e cores')),
    h('div', { class: 'legenda__lista' }, categorias.filter((c) => c.legenda).map(botao)),
    h('div', { class: 'legenda__lista legenda__lista--extra' },
      h('span', { class: 'legenda__sub' }, 'Marcadores:'),
      categorias.filter((c) => !c.legenda).map(botao)));
}

/** Uma célula de dia. */
function renderDia(ctx, dataIso, eventosDoDia) {
  const { calculo, categoriasPorId, store } = ctx;
  const destaque = store.obterUi().destaque;
  const estado = calculo.estadoPorDia.get(dataIso);
  const cat = estado ? categoriasPorId.get(estado) : null;
  const tipos = new Set(eventosDoDia.map((e) => e.tipo));
  const semana = diaDaSemana(dataIso);

  const classes = ['dia'];
  if (cat) classes.push('dia--cor');
  if (semana === 0 || semana === 6) classes.push('dia--fds');
  // categorias que não pintam o dia viram marcas (negrito, contorno, pontinho) na cor da categoria
  const marcas = {};
  for (const t of tipos) {
    const c = categoriasPorId.get(t);
    if (c && c.estilo !== 'fundo' && !marcas[c.estilo]) marcas[c.estilo] = c;
  }
  if (marcas.negrito) classes.push('dia--avaliacao');
  if (marcas.contorno) classes.push('dia--marco');
  if (marcas.marcador) classes.push('dia--marcador');
  if (dataIso === ctx.hoje) classes.push('dia--hoje');
  if (destaque && !(estado === destaque || tipos.has(destaque))) classes.push('dia--esmaecido');

  const titulos = eventosDoDia.map((e) => e.titulo);
  const rotulo = `${dataLonga(dataIso)}${titulos.length ? `: ${titulos.join('; ')}` : ''}`;

  return h('button', {
    type: 'button',
    class: classes.join(' '),
    dataset: { data: dataIso },
    style: {
      '--cor': cat?.cor,
      '--cat-texto': cat?.texto,
      '--cor-negrito': marcas.negrito?.alterada || marcas.negrito?.personalizada ? marcas.negrito.cor : null,
      '--cor-contorno': marcas.contorno?.cor,
      '--cor-marcador': marcas.marcador?.cor,
    },
    title: rotulo,
    'aria-label': rotulo,
    tabindex: eventosDoDia.length || dataIso.endsWith('-01') ? 0 : -1,
    onclick: () => ctx.acoes.abrirDia(dataIso),
  }, String(Number(dataIso.slice(8))));
}

/** Um mês completo (cabeçalho, dias da semana e células). */
function renderMes(ctx, mes, porDia) {
  const ano = ctx.cal.meta.ano;
  const primeiro = iso(ano, mes, 1);
  const vazios = diaDaSemana(primeiro);
  const total = diasNoMes(ano, mes);
  const letivos = ctx.calculo.porMes[mes - 1];

  const celulas = [];
  for (let i = 0; i < vazios; i += 1) celulas.push(h('span', { class: 'dia dia--vazio', 'aria-hidden': 'true' }));
  for (let d = 1; d <= total; d += 1) {
    const dataIso = iso(ano, mes, d);
    celulas.push(renderDia(ctx, dataIso, porDia.get(dataIso) ?? []));
  }

  return h('article', { class: 'mes card', 'aria-labelledby': `mes-${mes}` },
    h('header', { class: 'mes__topo' },
      h('h3', { id: `mes-${mes}`, class: 'mes__nome' }, MESES[mes - 1]),
      h('span', { class: 'mes__letivos', title: 'Dias letivos calculados' }, `${letivos} dias letivos`)),
    h('div', { class: 'mes__semana', 'aria-hidden': 'true' },
      DIAS_SEMANA_INICIAL.map((d, i) => h('span', { class: i === 0 || i === 6 ? 'fds' : '' }, d))),
    h('div', { class: 'mes__dias' }, celulas));
}

/** Setas movem o foco entre dias (←/→ = 1 dia, ↑/↓ = 1 semana), atravessando os meses. */
function navegarComSetas(e) {
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  const atual = e.target.closest?.('.dia[data-data]');
  if (!delta || !atual) return;
  const alvo = e.currentTarget.querySelector(`.dia[data-data="${somarDias(atual.dataset.data, delta)}"]`);
  if (alvo) {
    e.preventDefault();
    alvo.focus();
  }
}

export function renderVisaoCalendario(ctx) {
  const porDia = indexarPorDia(ctx.cal.eventos);
  const meses = Array.from({ length: 12 }, (_, i) => renderMes(ctx, i + 1, porDia));
  const grade = h('div', { class: 'meses', onkeydown: navegarComSetas }, meses);
  return h('div', { class: 'visao visao--calendario' },
    renderLegenda(ctx),
    h('p', { class: 'dica' }, 'Clique em um dia para ver ou adicionar eventos. As cores e a contagem de dias letivos são calculadas automaticamente.'),
    grade);
}
