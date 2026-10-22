/**
 * Visão "Eventos": a tabela MÊS / DIA / EVENTOS do documento, agora pesquisável,
 * filtrável e editável. É gerada da lista de eventos – nunca digitada separadamente.
 */
import { h, trocarConteudo } from '../lib/dom.js';
import { MESES, formatarPeriodos } from '../core/datas.js';
import { agruparPorMes, normalizar, primeiraData } from '../core/eventos.js';
import { diaSemanaCurto, estadoVazio, seloCategoria } from './comuns.js';

function aplicarFiltros(ctx, filtro) {
  const busca = normalizar(filtro.busca);
  return ctx.cal.eventos.filter((ev) => {
    if (filtro.tipo && ev.tipo !== filtro.tipo) return false;
    if (filtro.mes) {
      const d = primeiraData(ev);
      if (filtro.mes === -1 ? d !== null : !d || Number(d.slice(5, 7)) !== filtro.mes) return false;
    }
    if (filtro.pendentes && !ctx.idsComProblema.has(ev.id)) return false;
    return !busca || normalizar(`${ev.titulo} ${ev.obs ?? ''} ${ev.pendencia ?? ''}`).includes(busca);
  });
}

function linhaEvento(ctx, ev) {
  const cat = ctx.categoriasPorId.get(ev.tipo);
  const primeira = primeiraData(ev);
  const problemas = ctx.problemasPorEvento.get(ev.id) ?? [];
  const pior = problemas.find((p) => p.nivel === 'erro') ?? problemas.find((p) => p.nivel === 'aviso');

  return h('tr', {
    class: 'ev-linha',
    style: { '--cor': cat?.cor ?? 'var(--borda)' },
    tabindex: 0,
    onclick: () => ctx.acoes.editarEvento(ev.id),
    onkeydown: (e) => { if (e.key === 'Enter') ctx.acoes.editarEvento(ev.id); },
  },
    h('td', { class: 'ev-dia', 'data-rotulo': 'Dia' },
      h('strong', {}, formatarPeriodos(ev.periodos) || (ev.diaOriginal ? `“${ev.diaOriginal}”` : '—')),
      primeira && ev.periodos.length === 1 && !ev.periodos[0].ate && h('span', { class: 'ev-dia__sem' }, diaSemanaCurto(primeira))),
    h('td', { class: 'ev-titulo', 'data-rotulo': 'Evento' },
      h('span', { class: 'ev-titulo__texto' }, ev.titulo),
      h('span', { class: 'ev-titulo__meta' },
        seloCategoria(cat, { compacto: true }),
        pior && h('span', { class: `alerta alerta--${pior.nivel}`, title: pior.detalhe }, pior.nivel === 'erro' ? 'erro' : 'revisar'),
        ev.obs && h('span', { class: 'ev-titulo__obs' }, ev.obs))),
    h('td', { class: 'ev-acoes' },
      h('button', {
        type: 'button', class: 'btn btn--icone', title: 'Duplicar', 'aria-label': `Duplicar ${ev.titulo}`,
        onclick: (e) => { e.stopPropagation(); ctx.acoes.duplicarEvento(ev.id); },
      }, '⧉'),
      h('button', {
        type: 'button', class: 'btn btn--icone btn--perigo-suave', title: 'Excluir', 'aria-label': `Excluir ${ev.titulo}`,
        onclick: (e) => { e.stopPropagation(); ctx.acoes.excluirEvento(ev.id); },
      }, '🗑')));
}

function tabela(ctx, eventos) {
  if (!eventos.length) return estadoVazio('Nenhum evento encontrado com esses filtros.');
  const grupos = agruparPorMes(eventos);
  const corpo = [];
  for (const [mes, lista] of grupos) {
    corpo.push(h('tbody', { class: 'ev-grupo' },
      h('tr', { class: 'ev-mes' }, h('th', { colspan: 3, scope: 'colgroup' }, mes ? MESES[mes - 1] : 'Sem data definida', h('span', { class: 'ev-mes__qtd' }, `${lista.length}`))),
      lista.map((ev) => linhaEvento(ctx, ev))));
  }
  return h('table', { class: 'tabela-eventos' },
    h('thead', { class: 'sr-only' }, h('tr', {}, h('th', {}, 'Dia'), h('th', {}, 'Evento'), h('th', {}, 'Ações'))),
    corpo);
}

/** Tabela completa, sem filtros nem barra de ferramentas (usada na impressão). */
export const renderTabelaEventos = (ctx) => tabela(ctx, ctx.cal.eventos);

export function renderVisaoEventos(ctx) {
  const { store } = ctx;
  const filtro = { busca: '', tipo: '', mes: 0, pendentes: false, ...store.obterUi().filtro };
  const salvar = () => store.alterarUi({ filtro: { ...filtro } }, { silencioso: true });

  const host = h('div', { class: 'ev-lista' });
  const contador = h('span', { class: 'ev-contador', 'aria-live': 'polite' });
  // só a lista é redesenhada ao filtrar, para o campo de busca não perder o foco
  const atualizar = () => {
    const lista = aplicarFiltros(ctx, filtro);
    contador.textContent = `${lista.length} de ${ctx.cal.eventos.length} eventos`;
    trocarConteudo(host, tabela(ctx, lista));
    salvar();
  };

  const campoBusca = h('input', {
    type: 'search', class: 'campo', placeholder: 'Buscar evento…', value: filtro.busca, 'aria-label': 'Buscar evento',
    oninput: (e) => { filtro.busca = e.target.value; atualizar(); },
  });
  const selectTipo = h('select', {
    class: 'campo', 'aria-label': 'Filtrar por categoria',
    onchange: (e) => { filtro.tipo = e.target.value; atualizar(); },
  }, h('option', { value: '' }, 'Todas as categorias'),
    ctx.categorias.map((c) => h('option', { value: c.id, selected: filtro.tipo === c.id }, c.nome)));
  const selectMes = h('select', {
    class: 'campo', 'aria-label': 'Filtrar por mês',
    onchange: (e) => { filtro.mes = Number(e.target.value); atualizar(); },
  }, h('option', { value: 0 }, 'Todos os meses'),
    MESES.map((m, i) => h('option', { value: i + 1, selected: filtro.mes === i + 1 }, m)),
    h('option', { value: -1, selected: filtro.mes === -1 }, 'Sem data'));
  const checkPend = h('input', {
    type: 'checkbox', checked: filtro.pendentes,
    onchange: (e) => { filtro.pendentes = e.target.checked; atualizar(); },
  });

  atualizar();
  return h('div', { class: 'visao visao--eventos' },
    h('div', { class: 'barra-filtros card' },
      campoBusca, selectTipo, selectMes,
      h('label', { class: 'check' }, checkPend, 'Só com pendência'),
      contador,
      h('button', { type: 'button', class: 'btn btn--primario', onclick: () => ctx.acoes.novoEvento() }, '+ Novo evento')),
    h('div', { class: 'card card--tabela' }, host));
}
