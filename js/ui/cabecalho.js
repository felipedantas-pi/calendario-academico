/**
 * Cabeçalho institucional (equivale ao topo fixo do documento: logo, instituição, campus,
 * título) e faixa de indicadores (Início, Término, Dias letivos).
 */
import { h } from '../lib/dom.js';
import { formatarBR } from '../core/datas.js';
import { resumirProblemas } from '../core/validacao.js';

export function renderMarca(ctx) {
  const { meta } = ctx.cal;
  return h('div', { class: 'marca' },
    h('img', { class: 'marca__logo', src: 'assets/img/logo-ifpi.png', alt: 'Instituto Federal do Piauí', width: 120, height: 44 }),
    h('div', { class: 'marca__texto' },
      h('p', { class: 'marca__inst' }, meta.instituicao),
      h('h1', { class: 'marca__titulo' }, `Campus ${meta.campus} · ${meta.titulo}`),
      meta.subtitulo && h('p', { class: 'marca__sub' }, meta.subtitulo)));
}

const kpi = (rotulo, valor, { nota, alerta, aoClicar, tipo } = {}) => {
  const el = h(aoClicar ? 'button' : 'div', {
    class: `kpi${alerta ? ' kpi--alerta' : ''}${tipo ? ` kpi--${tipo}` : ''}`,
    type: aoClicar ? 'button' : null,
    onclick: aoClicar,
  },
  h('span', { class: 'kpi__rotulo' }, rotulo),
  h('strong', { class: 'kpi__valor' }, valor),
  nota && h('span', { class: 'kpi__nota' }, nota));
  return el;
};

export function renderKpis(ctx) {
  const { meta, semestres } = ctx.cal;
  const resumo = resumirProblemas(ctx.problemas);
  const pendentes = resumo.erro + resumo.aviso;

  const dias = semestres.map((s) => {
    const calc = ctx.calculo.porSemestre[s.id] ?? 0;
    const info = meta.informado?.diasLetivosSemestre?.[s.id];
    const diverge = info !== undefined && info !== calc;
    const minimo = ctx.requisitos?.minimos?.diasSemestre ?? 0;
    const curto = calc < minimo;
    return kpi(`Dias letivos ${s.id}`, `${calc}`, {
      nota: curto ? `abaixo do mínimo (${minimo})` : diverge ? `documento informa ${info}` : info !== undefined ? 'confere com o documento' : 'calculado',
      alerta: diverge || curto,
    });
  });

  return h('section', { class: 'kpis', 'aria-label': 'Indicadores do ano letivo' },
    kpi('Início', meta.inicio ? formatarBR(meta.inicio) : 'a definir'),
    kpi('Término', meta.termino ? formatarBR(meta.termino) : 'a definir', { alerta: !meta.termino, nota: meta.termino ? null : 'campo vazio no documento' }),
    dias,
    kpi('Total no ano', String(ctx.calculo.total), { nota: 'dias letivos' }),
    kpi('Pendências', String(pendentes), {
      tipo: pendentes ? 'pendencias' : 'ok',
      nota: pendentes ? 'ver inconsistências' : 'tudo conferido',
      aoClicar: () => ctx.store.alterarUi({ aba: 'pendencias' }),
    }));
}
