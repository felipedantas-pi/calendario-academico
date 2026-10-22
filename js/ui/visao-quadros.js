/**
 * Visão "Resumo": quadros que no Word eram tabelas digitadas à parte
 * (dias letivos por mês, bimestres, férias coletivas, feriados). Aqui são derivados.
 */
import { h } from '../lib/dom.js';
import {
  MESES_ABREV, formatarBR, formatarPeriodos, intervalo, nomeDiaSemana,
} from '../core/datas.js';
import { datasDoEvento, ordenarEventos } from '../core/eventos.js';
import { seloCategoria } from './comuns.js';

const cartao = (titulo, nota, ...conteudo) => h('section', { class: 'card quadro' },
  h('header', { class: 'quadro__topo' }, h('h2', { class: 'quadro__titulo' }, titulo), nota && h('p', { class: 'quadro__nota' }, nota)),
  conteudo);

/** Barras: dias letivos calculados × informados no documento. */
function quadroDiasLetivos(ctx) {
  const { calculo, cal } = ctx;
  const informado = cal.meta.informado?.diasLetivosMes ?? [];
  const maximo = Math.max(23, ...calculo.porMes, ...informado);

  const colunas = MESES_ABREV.map((mes, i) => {
    const calc = calculo.porMes[i];
    const info = informado[i];
    const diverge = info !== undefined && info !== calc;
    return h('li', { class: `barra${diverge ? ' barra--diverge' : ''}` },
      h('span', { class: 'barra__valor' }, String(calc)),
      h('span', { class: 'barra__trilho', title: `${mes}: calculado ${calc}${info !== undefined ? ` · informado ${info}` : ''}` },
        h('span', { class: 'barra__preenchido', style: { height: `${(calc / maximo) * 100}%` } }),
        info !== undefined && h('span', { class: 'barra__informado', style: { bottom: `${(info / maximo) * 100}%` } })),
      h('span', { class: 'barra__mes' }, mes),
      info !== undefined && h('span', { class: 'barra__doc' }, diverge ? `doc: ${info}` : '✓'));
  });

  const semestres = cal.semestres.map((s) => {
    const calc = calculo.porSemestre[s.id] ?? 0;
    const info = cal.meta.informado?.diasLetivosSemestre?.[s.id];
    return h('div', { class: 'total' },
      h('span', { class: 'total__rotulo' }, `Semestre ${s.id}`),
      h('strong', { class: 'total__valor' }, String(calc)),
      info !== undefined && h('span', { class: `total__doc${info !== calc ? ' total__doc--diverge' : ''}` }, `informado: ${info}`));
  });

  return cartao('Dias letivos por mês', 'Barras = calculado a partir dos eventos · traço = valor digitado no documento original.',
    h('ol', { class: 'barras' }, colunas),
    h('div', { class: 'totais' }, semestres,
      h('div', { class: 'total' }, h('span', { class: 'total__rotulo' }, 'Ano letivo'), h('strong', { class: 'total__valor' }, String(calculo.total)))),
    h('p', { class: 'quadro__regra' }, `Regra: segunda a sexta dentro do semestre, exceto feriados, férias${cal.meta.regras.pontoFacultativoNaoLetivo ? ' e pontos facultativos' : ''}; somam-se os sábados letivos${cal.meta.regras.reposicaoContaComoLetivo ? ' e de reposição' : ''}. Altere em Configurações.`));
}

function quadroBimestres(ctx) {
  const { cal, calculo } = ctx;
  const linhas = cal.bimestres.map((b) => {
    const dias = intervalo(b.inicio, b.fim).filter((d) => calculo.letivos.has(d)).length;
    return h('tr', {},
      h('th', { scope: 'row' }, `${b.n}º bimestre`),
      h('td', {}, b.semestre),
      h('td', {}, `${formatarBR(b.inicio)} a ${formatarBR(b.fim)}`),
      h('td', { class: 'num' }, String(dias)));
  });
  return cartao('Bimestres e semestres', null,
    h('table', { class: 'tabela-simples' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Bimestre'), h('th', {}, 'Semestre'), h('th', {}, 'Período'), h('th', { class: 'num' }, 'Dias letivos'))),
      h('tbody', {}, linhas)));
}

function quadroFerias(ctx) {
  const ferias = ordenarEventos(ctx.cal.eventos.filter((e) => e.tipo === 'ferias'));
  const todos = new Set(ferias.flatMap(datasDoEvento));
  const informado = ctx.cal.meta.informado?.feriasDias;
  const linhas = ferias.map((ev) => h('tr', {},
    h('td', {}, ev.titulo),
    h('td', {}, ev.periodos.map((p) => (p.ate ? `${formatarBR(p.de)} a ${formatarBR(p.ate)}` : formatarBR(p.de))).join(' e ')),
    h('td', { class: 'num' }, `${datasDoEvento(ev).length} dias`)));
  return cartao('Férias coletivas', null,
    h('table', { class: 'tabela-simples' }, h('tbody', {}, linhas),
      h('tfoot', {}, h('tr', {}, h('th', { colspan: 2, scope: 'row' }, 'Total'),
        h('td', { class: 'num' }, `${todos.size} dias`, informado !== undefined && informado !== todos.size && h('span', { class: 'alerta alerta--aviso' }, `doc: ${informado}`))))));
}

function quadroFeriados(ctx) {
  const lista = ordenarEventos(ctx.cal.eventos.filter((e) => ['feriado', 'ponto_facultativo'].includes(e.tipo)));
  const linhas = lista.map((ev) => {
    const datas = datasDoEvento(ev);
    const fds = datas.length > 0 && datas.every((d) => ['sábado', 'domingo'].includes(nomeDiaSemana(d)));
    return h('tr', {},
      h('td', { class: 'nowrap' }, formatarPeriodos(ev.periodos) ? `${formatarPeriodos(ev.periodos)}/${datas[0].slice(5, 7)}` : '—',
        datas.length === 1 && h('span', { class: 'quadro__sem' }, ` ${nomeDiaSemana(datas[0]).slice(0, 3)}`)),
      h('td', {}, ev.titulo),
      h('td', {}, seloCategoria(ctx.categoriasPorId.get(ev.tipo), { compacto: true }), fds && h('span', { class: 'quadro__fds' }, 'fim de semana')));
  });
  return cartao('Feriados e pontos facultativos', 'Lista gerada dos eventos dessas categorias – não precisa ser digitada de novo.',
    h('table', { class: 'tabela-simples' }, h('tbody', {}, linhas)));
}

export function renderVisaoQuadros(ctx) {
  return h('div', { class: 'visao visao--quadros' },
    quadroDiasLetivos(ctx),
    h('div', { class: 'quadros-grade' }, quadroBimestres(ctx), quadroFerias(ctx)),
    quadroFeriados(ctx));
}
