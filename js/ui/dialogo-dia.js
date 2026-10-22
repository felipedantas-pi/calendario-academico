/**
 * Janela de detalhes de um dia: eventos, datas comemorativas e atalho para adicionar.
 */
import { h } from '../lib/dom.js';
import { indexarPorDia } from '../core/eventos.js';
import { formatarPeriodos } from '../core/datas.js';
import { abrirDialogo } from './dialogo.js';
import { dataLonga, seloCategoria } from './comuns.js';

export function abrirDialogoDia(ctx, dataIso) {
  const eventos = indexarPorDia(ctx.cal.eventos).get(dataIso) ?? [];
  const estado = ctx.calculo.estadoPorDia.get(dataIso);
  const [, mes, dia] = dataIso.split('-').map(Number);
  const comemorativas = ctx.cal.comemorativas.filter((c) => c.mes === mes && c.dia === dia);

  const itens = eventos.map((ev) => h('li', { class: 'dia-evento', style: { '--cor': ctx.categoriasPorId.get(ev.tipo)?.cor } },
    h('div', {},
      h('strong', {}, ev.titulo),
      h('div', { class: 'dia-evento__meta' },
        seloCategoria(ctx.categoriasPorId.get(ev.tipo), { compacto: true }),
        ev.periodos.length > 0 && (ev.periodos[0].ate || ev.periodos.length > 1) && h('span', {}, `Período: ${formatarPeriodos(ev.periodos)}`),
        ev.obs && h('span', {}, ev.obs))),
    h('button', {
      type: 'button', class: 'btn btn--neutro btn--pequeno',
      onclick: () => { document.querySelector('dialog[open]')?.close(); ctx.acoes.editarEvento(ev.id); },
    }, 'Editar')));

  abrirDialogo({
    titulo: dataLonga(dataIso),
    subtitulo: estado ? `Cor no calendário: ${ctx.categoriasPorId.get(estado)?.nome}` : 'Dia sem cor especial',
    corpo: h('div', {},
      itens.length ? h('ul', { class: 'dia-eventos' }, itens) : h('p', { class: 'vazio' }, 'Nenhum evento neste dia.'),
      comemorativas.length > 0 && h('section', { class: 'dia-comem' },
        h('h3', {}, 'Datas importantes'),
        h('ul', {}, comemorativas.map((c) => h('li', {}, c.titulo))))),
    botoes: [
      { rotulo: 'Fechar', aoClicar: (_, dlg) => dlg.close() },
      { rotulo: '+ Evento neste dia', variante: 'primario', aoClicar: (_, dlg) => { dlg.close(); ctx.acoes.novoEvento(dataIso); } },
    ],
  });
}
