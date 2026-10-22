/**
 * Barra de ações do topo: desfazer/refazer, novo evento, menus Exportar e Mais, tema.
 */
import { h } from '../lib/dom.js';
import { temaAtual } from './tema.js';

/** Item de menu; fecha o menu ao clicar. */
const item = (rotulo, aoClicar, { dica, perigo } = {}) => h('button', {
  type: 'button', role: 'menuitem', class: `menu__item${perigo ? ' menu__item--perigo' : ''}`,
  onclick: (e) => { e.currentTarget.closest('details')?.removeAttribute('open'); aoClicar(); },
}, h('span', {}, rotulo), dica && h('small', {}, dica));

const menu = (rotulo, ...itens) => h('details', { class: 'menu' },
  h('summary', { class: 'btn btn--neutro' }, rotulo, h('span', { 'aria-hidden': 'true' }, ' ▾')),
  h('div', { class: 'menu__lista', role: 'menu' }, itens));

export function renderBarraAcoes(ctx) {
  const { store, acoes } = ctx;

  const anos = ctx.anosDisponiveis.map((ano) => item(
    `${ano}${ano === ctx.cal.meta.ano ? ' (atual)' : ''}`, () => acoes.abrirAno(ano)));

  const entrada = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true, 'aria-hidden': 'true',
    onchange: (e) => { acoes.importarArquivo(e.target.files[0]); e.target.value = ''; },
  });

  // menu principal de cadastro: botão verde, com os tipos de registro mais usados
  const registrar = menu('+ Registrar',
    item('Evento', () => acoes.novoEvento(), { dica: 'reunião, semana temática, prazo…' }),
    item('Sábado letivo', () => acoes.registrar('sabado_letivo', 'sábado letivo', 'Sábado letivo'), { dica: 'repõe um dia útil perdido' }),
    item('Ponto facultativo', () => acoes.registrar('ponto_facultativo', 'ponto facultativo', 'Ponto facultativo')),
    item('Feriado', () => acoes.registrar('feriado', 'feriado')),
    item('Sábado de reposição de aulas', () => acoes.registrar('sabado_reposicao', 'sábado de reposição', 'Sábado de reposição')),
    item('Recesso escolar', () => acoes.registrar('recesso', 'recesso escolar', 'Recesso escolar')),
    item('Prova final', () => acoes.registrar('prova_final', 'prova final', 'Prova final')));
  registrar.querySelector('summary').classList.replace('btn--neutro', 'btn--primario');

  return h('div', { class: 'acoes' },
    h('button', { type: 'button', class: 'btn btn--icone', title: 'Desfazer (Ctrl+Z)', 'aria-label': 'Desfazer', disabled: !store.podeDesfazer(), onclick: () => store.desfazer() }, '↶'),
    h('button', { type: 'button', class: 'btn btn--icone', title: 'Refazer (Ctrl+Y)', 'aria-label': 'Refazer', disabled: !store.podeRefazer(), onclick: () => store.refazer() }, '↷'),
    registrar,
    menu('Exportar',
      item('Imprimir / salvar como PDF', acoes.imprimir, { dica: 'layout A4 do calendário' }),
      item('Planilha (CSV)', acoes.exportarCsv, { dica: 'abre no Excel' }),
      item('Agenda (ICS)', acoes.exportarIcs, { dica: 'Google Agenda, Outlook' }),
      item('Backup (JSON)', acoes.exportarJson, { dica: 'para versionar no GitHub' })),
    menu('Mais',
      item('Configurações…', acoes.abrirConfiguracoes, { dica: 'campus, semestres, regras' }),
      item('Categorias e cores…', acoes.abrirCategorias, { dica: 'escolher cores, criar categorias' }),
      item('Novo ano letivo…', acoes.novoAno, { dica: 'gera feriados do ano' }),
      item('Importar JSON…', () => entrada.click()),
      anos.length > 1 && h('div', { class: 'menu__grupo' }, 'Abrir ano', anos),
      item('Restaurar original', acoes.restaurarOriginal, { perigo: true, dica: 'descarta edições deste ano' })),
    h('button', {
      type: 'button', class: 'btn btn--icone', 'aria-label': 'Alternar tema claro/escuro',
      title: `Tema ${temaAtual() === 'escuro' ? 'escuro' : 'claro'}`, onclick: acoes.alternarTema,
    }, temaAtual() === 'escuro' ? '☀' : '☾'),
    entrada);
}
