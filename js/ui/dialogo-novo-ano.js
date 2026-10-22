/**
 * Cria o esqueleto de um novo ano letivo: feriados (inclusive os móveis, calculados pela
 * Páscoa) e datas comemorativas já vêm preenchidos.
 */
import { h } from '../lib/dom.js';
import { novoCalendario } from '../core/modelo.js';
import { abrirDialogo } from './dialogo.js';
import { mostrarToast } from './toast.js';

export function abrirDialogoNovoAno(ctx) {
  const { meta } = ctx.store.obterCal();
  const ano = h('input', { type: 'number', name: 'ano', class: 'campo', min: 2000, max: 2100, required: true, value: meta.ano + 1 });
  const campus = h('input', { type: 'text', name: 'campus', class: 'campo', required: true, value: meta.campus });
  const instituicao = h('input', { type: 'text', name: 'instituicao', class: 'campo', required: true, value: meta.instituicao });
  const subtitulo = h('input', { type: 'text', name: 'subtitulo', class: 'campo', value: meta.subtitulo });

  abrirDialogo({
    titulo: 'Novo ano letivo',
    subtitulo: 'Gera feriados (com Carnaval, Sexta-feira Santa e Corpus Christi do ano) e datas comemorativas.',
    corpo: h('div', { class: 'form-grade' },
      h('label', { class: 'rotulo' }, h('span', {}, 'Ano'), ano),
      h('label', { class: 'rotulo' }, h('span', {}, 'Campus'), campus),
      h('label', { class: 'rotulo rotulo--cheio' }, h('span', {}, 'Instituição'), instituicao),
      h('label', { class: 'rotulo rotulo--cheio' }, h('span', {}, 'Subtítulo (curso/modalidade)'), subtitulo),
      h('p', { class: 'dica rotulo--cheio' }, 'O calendário atual continua salvo neste navegador e pode ser reaberto em “Abrir ano”. Semestres e bimestres vêm com datas sugeridas: ajuste em Configurações.')),
    aoEnviar: (dados, dlg) => {
      const novo = novoCalendario({
        ano: Number(dados.get('ano')),
        campus: dados.get('campus').trim(),
        instituicao: dados.get('instituicao').trim(),
        subtitulo: dados.get('subtitulo').trim(),
      }, ctx.cal.comemorativas, ctx.cal.categorias);
      ctx.acoes.abrirCalendario(novo);
      dlg.close();
      mostrarToast(`Calendário ${novo.meta.ano} criado com ${novo.eventos.length} feriados/pontos facultativos.`);
    },
    botoes: [
      { rotulo: 'Cancelar', aoClicar: (_, dlg) => dlg.close() },
      { rotulo: 'Criar', variante: 'primario', submit: true },
    ],
  });
}
