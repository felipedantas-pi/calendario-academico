/**
 * Visão "Datas importantes": lista de datas comemorativas/profissionais (parte quase fixa
 * de um ano para o outro) com busca, filtro por mês, inclusão e remoção.
 */
import { h, trocarConteudo } from '../lib/dom.js';
import { MESES, diasNoMes } from '../core/datas.js';
import { normalizar } from '../core/eventos.js';
import { estadoVazio } from './comuns.js';

const ordenar = (lista) => [...lista].sort((a, b) => a.mes - b.mes || a.dia - b.dia || a.titulo.localeCompare(b.titulo, 'pt-BR'));

export function renderVisaoDatas(ctx) {
  const { store, cal } = ctx;
  const filtro = { busca: '', mes: 0, ...store.obterUi().filtroDatas };
  const host = h('div', { class: 'datas-grade' });
  const contador = h('span', { class: 'ev-contador', 'aria-live': 'polite' });

  const remover = (item) => store.alterarCal((c) => {
    c.comemorativas = c.comemorativas.filter((x) => !(x.mes === item.mes && x.dia === item.dia && x.titulo === item.titulo));
  });

  const atualizar = () => {
    const busca = normalizar(filtro.busca);
    const lista = ordenar(cal.comemorativas).filter((c) => (!filtro.mes || c.mes === filtro.mes) && (!busca || normalizar(c.titulo).includes(busca)));
    contador.textContent = `${lista.length} datas`;
    store.alterarUi({ filtroDatas: { ...filtro } }, { silencioso: true });
    if (!lista.length) return trocarConteudo(host, estadoVazio('Nenhuma data encontrada.'));
    const porMes = new Map();
    for (const c of lista) porMes.set(c.mes, [...(porMes.get(c.mes) ?? []), c]);
    return trocarConteudo(host, [...porMes].map(([mes, itens]) => h('section', { class: 'card datas-mes' },
      h('h3', { class: 'datas-mes__nome' }, MESES[mes - 1]),
      h('ul', { class: 'datas-lista' }, itens.map((it) => h('li', {},
        h('time', { class: 'datas-lista__dia' }, String(it.dia).padStart(2, '0')),
        h('span', {}, it.titulo),
        h('button', {
          type: 'button', class: 'btn btn--icone btn--perigo-suave', title: 'Remover', 'aria-label': `Remover ${it.titulo}`,
          onclick: () => remover(it),
        }, '✕')))))));
  };

  // formulário de inclusão
  const inDia = h('input', { type: 'number', class: 'campo campo--curto', min: 1, max: 31, required: true, placeholder: 'Dia', 'aria-label': 'Dia' });
  const inMes = h('select', { class: 'campo', required: true, 'aria-label': 'Mês' }, MESES.map((m, i) => h('option', { value: i + 1 }, m)));
  const inTitulo = h('input', { type: 'text', class: 'campo campo--grande', required: true, placeholder: 'Ex.: Dia do Bibliotecário', 'aria-label': 'Título' });
  const adicionar = (e) => {
    e.preventDefault();
    const mes = Number(inMes.value);
    const dia = Number(inDia.value);
    if (dia < 1 || dia > diasNoMes(cal.meta.ano, mes)) { inDia.setCustomValidity('Dia inexistente neste mês.'); inDia.reportValidity(); return; }
    inDia.setCustomValidity('');
    store.alterarCal((c) => { c.comemorativas.push({ mes, dia, titulo: inTitulo.value.trim() }); });
  };

  atualizar();
  return h('div', { class: 'visao visao--datas' },
    h('div', { class: 'barra-filtros card' },
      h('input', {
        type: 'search', class: 'campo', placeholder: 'Buscar data…', value: filtro.busca, 'aria-label': 'Buscar data',
        oninput: (e) => { filtro.busca = e.target.value; atualizar(); },
      }),
      h('select', {
        class: 'campo', 'aria-label': 'Filtrar por mês', onchange: (e) => { filtro.mes = Number(e.target.value); atualizar(); },
      }, h('option', { value: 0 }, 'Todos os meses'), MESES.map((m, i) => h('option', { value: i + 1, selected: filtro.mes === i + 1 }, m))),
      contador),
    h('form', { class: 'card form-inline', onsubmit: adicionar },
      h('strong', {}, 'Adicionar data'), inDia, inMes, inTitulo,
      h('button', { type: 'submit', class: 'btn btn--primario' }, 'Adicionar')),
    host);
}
