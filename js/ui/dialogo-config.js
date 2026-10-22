/**
 * Configurações do calendário: identificação, datas do ano letivo, semestres, bimestres e regras.
 * Reúne o que no Word ficava espalhado no cabeçalho e em duas tabelas laterais.
 */
import { h } from '../lib/dom.js';
import { abrirDialogo } from './dialogo.js';
import { mostrarToast } from './toast.js';

const campoTexto = (nome, rotulo, valor, extra = {}) =>
  h('label', { class: 'rotulo' }, h('span', {}, rotulo), h('input', { type: 'text', name: nome, class: 'campo', value: valor ?? '', ...extra }));
const campoData = (nome, rotulo, valor) =>
  h('label', { class: 'rotulo' }, h('span', {}, rotulo), h('input', { type: 'date', name: nome, class: 'campo', value: valor ?? '' }));

export function abrirDialogoConfig(ctx) {
  const cal = ctx.store.obterCal();
  const { meta } = cal;

  // ---- semestres e bimestres (listas editáveis) ----
  const linhasSem = h('div', { class: 'linhas' });
  const linhasBim = h('div', { class: 'linhas' });

  const linhaSemestre = (s = {}) => {
    const el = h('div', { class: 'linha-config' },
      h('input', { class: 'campo', 'aria-label': 'Identificador do semestre', placeholder: `${meta.ano}.1`, value: s.id ?? '', required: true, dataset: { campo: 'id' } }),
      h('input', { type: 'date', class: 'campo', 'aria-label': 'Início', value: s.inicio ?? '', required: true, dataset: { campo: 'inicio' } }),
      h('input', { type: 'date', class: 'campo', 'aria-label': 'Fim', value: s.fim ?? '', required: true, dataset: { campo: 'fim' } }),
      h('button', { type: 'button', class: 'btn btn--icone btn--perigo-suave', 'aria-label': 'Remover semestre', onclick: () => el.remove() }, '✕'));
    return el;
  };
  const linhaBimestre = (b = {}) => {
    const el = h('div', { class: 'linha-config' },
      h('input', { type: 'number', min: 1, class: 'campo campo--curto', 'aria-label': 'Número do bimestre', value: b.n ?? '', required: true, dataset: { campo: 'n' } }),
      h('input', { class: 'campo', 'aria-label': 'Semestre do bimestre', placeholder: `${meta.ano}.1`, value: b.semestre ?? '', required: true, dataset: { campo: 'semestre' } }),
      h('input', { type: 'date', class: 'campo', 'aria-label': 'Início', value: b.inicio ?? '', required: true, dataset: { campo: 'inicio' } }),
      h('input', { type: 'date', class: 'campo', 'aria-label': 'Fim', value: b.fim ?? '', required: true, dataset: { campo: 'fim' } }),
      h('button', { type: 'button', class: 'btn btn--icone btn--perigo-suave', 'aria-label': 'Remover bimestre', onclick: () => el.remove() }, '✕'));
    return el;
  };
  cal.semestres.forEach((s) => linhasSem.append(linhaSemestre(s)));
  cal.bimestres.forEach((b) => linhasBim.append(linhaBimestre(b)));

  const lerLinhas = (host) => [...host.children].map((el) => Object.fromEntries(
    [...el.querySelectorAll('[data-campo]')].map((i) => [i.dataset.campo, i.type === 'number' ? Number(i.value) : i.value.trim()])));

  const ptNaoLetivo = h('input', { type: 'checkbox', name: 'pontoFacultativoNaoLetivo', checked: meta.regras.pontoFacultativoNaoLetivo });
  const reposicaoLetivo = h('input', { type: 'checkbox', name: 'reposicaoContaComoLetivo', checked: meta.regras.reposicaoContaComoLetivo });
  const diasPorDia = h('input', { type: 'number', name: 'diasPorDiaDaSemana', class: 'campo campo--curto', min: 1, max: 60, required: true, value: meta.regras.diasPorDiaDaSemana ?? 20 });
  const modalidade = h('select', { name: 'modalidade', class: 'campo' },
    Object.entries(ctx.requisitos?.modalidades ?? {}).map(([id, m]) => h('option', { value: id, selected: (meta.modalidade ?? 'tecnico_integrado') === id }, `${m.nome} (${m.artigo})`)));

  const corpo = h('div', { class: 'config' },
    h('fieldset', { class: 'config__grupo' }, h('legend', {}, 'Identificação'),
      campoTexto('instituicao', 'Instituição', meta.instituicao, { required: true }),
      campoTexto('campus', 'Campus', meta.campus, { required: true }),
      campoTexto('titulo', 'Título', meta.titulo, { required: true }),
      campoTexto('subtitulo', 'Subtítulo (curso/modalidade)', meta.subtitulo),
      h('label', { class: 'rotulo' }, h('span', {}, 'Modalidade (define os itens obrigatórios da Organização Didática)'), modalidade)),
    h('fieldset', { class: 'config__grupo' }, h('legend', {}, 'Ano letivo'),
      campoData('inicio', 'Início', meta.inicio),
      campoData('termino', 'Término', meta.termino)),
    h('fieldset', { class: 'config__grupo config__grupo--cheio' }, h('legend', {}, 'Semestres letivos'),
      h('div', { class: 'linha-config linha-config--cab' }, h('span', {}, 'Identificador'), h('span', {}, 'Início'), h('span', {}, 'Fim'), h('span')),
      linhasSem,
      h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => linhasSem.append(linhaSemestre()) }, '+ Semestre')),
    h('fieldset', { class: 'config__grupo config__grupo--cheio' }, h('legend', {}, 'Bimestres'),
      h('div', { class: 'linha-config linha-config--cab linha-config--bim' }, h('span', {}, 'Nº'), h('span', {}, 'Semestre'), h('span', {}, 'Início'), h('span', {}, 'Fim'), h('span')),
      linhasBim,
      h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => linhasBim.append(linhaBimestre({ n: cal.bimestres.length + 1 })) }, '+ Bimestre')),
    h('fieldset', { class: 'config__grupo config__grupo--cheio' }, h('legend', {}, 'Regras de contagem de dias letivos'),
      h('label', { class: 'check' }, ptNaoLetivo, 'Pontos facultativos não contam como dia letivo'),
      h('label', { class: 'check' }, reposicaoLetivo, 'Sábados de reposição contam como dia letivo'),
      h('label', { class: 'rotulo' }, h('span', {}, 'Dias de cada dia da semana por semestre (meta do equilíbrio semanal)'), diasPorDia,
        h('small', {}, '20 segundas + 20 terças + … = 100 dias por semestre (mínimo do Art. 26 da Organização Didática).'))));

  abrirDialogo({
    titulo: 'Configurações do calendário',
    subtitulo: 'Estes dados alimentam o cabeçalho, as cores e a contagem de dias letivos.',
    largura: 'lg',
    corpo,
    aoEnviar: (dados, dlg) => {
      ctx.store.alterarCal((c) => {
        Object.assign(c.meta, {
          instituicao: dados.get('instituicao').trim(),
          campus: dados.get('campus').trim(),
          titulo: dados.get('titulo').trim(),
          subtitulo: dados.get('subtitulo').trim(),
          inicio: dados.get('inicio') || null,
          termino: dados.get('termino') || null,
        });
        c.meta.modalidade = dados.get('modalidade');
        c.meta.regras = {
          ...c.meta.regras,
          pontoFacultativoNaoLetivo: ptNaoLetivo.checked,
          reposicaoContaComoLetivo: reposicaoLetivo.checked,
          diasPorDiaDaSemana: Number(dados.get('diasPorDiaDaSemana')) || 20,
        };
        c.semestres = lerLinhas(linhasSem);
        c.bimestres = lerLinhas(linhasBim);
      });
      dlg.close();
      mostrarToast('Configurações salvas.', { acao: { rotulo: 'Desfazer', aoClicar: () => ctx.store.desfazer() } });
    },
    botoes: [
      { rotulo: 'Cancelar', aoClicar: (_, dlg) => dlg.close() },
      { rotulo: 'Salvar', variante: 'primario', submit: true },
    ],
  });
}
