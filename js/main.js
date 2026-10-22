/**
 * Ponto de entrada: carrega os dados, monta o estado e desenha a interface.
 *
 * Fluxo:  dados (JSON) → store → [calcular dias letivos + validar] → render das telas
 * Qualquer alteração passa por `store.alterarCal`, que dispara um novo ciclo.
 */
import { $, h, trocarConteudo } from './lib/dom.js';
import { calcularDiasLetivos } from './core/diasLetivos.js';
import { validarCalendario } from './core/validacao.js';
import { equilibrioDoCalendario, sugerirAjustes } from './core/equilibrio.js';
import { categoriasEfetivas } from './core/categorias.js';
import { avaliarMinimos, avaliarRequisitos, calcularPrazos } from './core/normas.js';
import { criarStore } from './state/store.js';
import {
  anoSalvo, carregarCalendarioBase, carregarReferencias, lerRascunho, listarAnosSalvos, salvarRascunho,
} from './state/repositorio.js';
import { criarAcoes } from './acoes.js';
import { iniciarTema } from './ui/tema.js';
import { renderBarraAcoes } from './ui/barra-acoes.js';
import { renderKpis, renderMarca } from './ui/cabecalho.js';
import { renderVisaoCalendario } from './ui/visao-calendario.js';
import { renderVisaoEventos } from './ui/visao-eventos.js';
import { renderVisaoQuadros } from './ui/visao-quadros.js';
import { renderVisaoDatas } from './ui/visao-datas.js';
import { renderVisaoPendencias } from './ui/visao-pendencias.js';
import { renderVisaoConformidade } from './ui/visao-conformidade.js';
import { renderVisaoImpressao } from './ui/visao-impressao.js';
import { resumirProblemas } from './core/validacao.js';
import { iso } from './core/datas.js';

const ARQUIVO_BASE = 'data/calendario-2027.json';

/** Abas da interface: id, rótulo e função que desenha a tela. */
const ABAS = [
  { id: 'calendario', rotulo: 'Calendário', render: renderVisaoCalendario },
  { id: 'eventos', rotulo: 'Eventos', render: renderVisaoEventos },
  { id: 'resumo', rotulo: 'Resumo', render: renderVisaoQuadros },
  { id: 'conformidade', rotulo: 'Conformidade', render: renderVisaoConformidade },
  { id: 'datas', rotulo: 'Datas importantes', render: renderVisaoDatas },
  { id: 'pendencias', rotulo: 'Pendências', render: renderVisaoPendencias },
];

/** Visão especial, usada só durante a impressão (não aparece nas abas). */
const VISAO_IMPRESSAO = { id: 'imprimir', render: renderVisaoImpressao };

async function iniciar() {
  iniciarTema();
  const raiz = $('#app');

  let referencias;
  let base;
  try {
    referencias = await carregarReferencias();
    base = await carregarCalendarioBase(ARQUIVO_BASE, referencias.comemorativas);
  } catch (erro) {
    trocarConteudo(raiz, mensagemDeErro(erro));
    return;
  }

  const textoBase = JSON.stringify(base);
  const anoInicial = anoSalvo() ?? base.meta.ano;
  const store = criarStore(lerRascunho(anoInicial) ?? structuredClone(base), {
    // ?imprimir=1 abre direto a visão de impressão (útil para gerar PDF automaticamente)
    aba: new URLSearchParams(location.search).has('imprimir') ? VISAO_IMPRESSAO.id
      : ABAS.some((a) => a.id === location.hash.slice(1)) ? location.hash.slice(1) : 'calendario', destaque: null, filtro: {}, filtroDatas: {},
  });

  const hoje = (() => { const d = new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); })();

  // ---- derivados: recalculados só quando o calendário muda (não a cada filtro digitado) ----
  let calAnterior = null;
  let derivados = {};
  function recalcular(cal) {
    if (cal === calAnterior) return;
    calAnterior = cal;
    // categorias = padrão do projeto + cores/categorias que o usuário personalizou neste calendário
    const categorias = categoriasEfetivas(referencias.categorias, cal.categorias);
    const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
    const calculo = calcularDiasLetivos(cal, categoriasPorId);
    const { requisitos } = referencias;
    const problemas = validarCalendario(cal, categoriasPorId, cal.comemorativas, { requisitos, hoje });
    const equilibrio = equilibrioDoCalendario(cal, categoriasPorId).map((eq) => ({ ...eq, sugestoes: sugerirAjustes(cal, categoriasPorId, eq) }));
    const normas = {
      minimos: avaliarMinimos(cal, calculo, requisitos),
      requisitos: avaliarRequisitos(cal, requisitos),
      prazos: calcularPrazos(cal, calculo, requisitos),
    };
    const problemasPorEvento = new Map();
    for (const p of problemas) {
      if (!p.eventoId) continue;
      problemasPorEvento.set(p.eventoId, [...(problemasPorEvento.get(p.eventoId) ?? []), p]);
    }
    const idsComProblema = new Set(problemas.filter((p) => p.eventoId && p.nivel !== 'info').map((p) => p.eventoId));
    derivados = { categorias, categoriasPorId, calculo, problemas, problemasPorEvento, idsComProblema, equilibrio, normas };
    if (!salvarRascunho(cal)) console.warn('Não foi possível salvar o rascunho (armazenamento indisponível).');
  }

  const contexto = () => {
    const cal = store.obterCal();
    recalcular(cal);
    return {
      store, cal, hoje, categoriasBase: referencias.categorias, requisitos: referencias.requisitos, ...derivados,
      anosDisponiveis: [...new Set([...listarAnosSalvos(), base.meta.ano])].sort((a, b) => a - b),
      acoes,
    };
  };
  const acoes = criarAcoes({ store, contexto, base, redesenhar: () => desenhar() });

  // ---- esqueleto da página (criado uma vez) ----
  const topo = h('header', { class: 'topo' });
  const kpis = h('div', { class: 'kpis-host' });
  const abas = h('div', { class: 'abas', role: 'tablist', 'aria-label': 'Seções do calendário' });
  const painel = h('main', { id: 'conteudo', class: 'conteudo', tabindex: -1 });
  const rodape = h('footer', { class: 'rodape' });
  trocarConteudo(raiz, topo, kpis, abas, painel, rodape);

  let ultimaAba = null;
  function desenhar() {
    const ctx = contexto();
    const ui = store.obterUi();
    const aba = ui.aba === VISAO_IMPRESSAO.id ? VISAO_IMPRESSAO : (ABAS.find((a) => a.id === ui.aba) ?? ABAS[0]);
    const resumo = resumirProblemas(ctx.problemas);

    document.title = `${ctx.cal.meta.titulo} – Campus ${ctx.cal.meta.campus}`;
    trocarConteudo(topo, renderMarca(ctx), renderBarraAcoes(ctx));
    trocarConteudo(kpis, renderKpis(ctx));
    trocarConteudo(abas, ABAS.map((a) => h('button', {
      type: 'button', role: 'tab', id: `aba-${a.id}`, class: `aba${a.id === aba.id ? ' aba--ativa' : ''}`,
      'aria-selected': String(a.id === aba.id), 'aria-controls': 'conteudo',
      onclick: () => store.alterarUi({ aba: a.id }),
    }, a.rotulo, a.id === 'pendencias' && resumo.erro + resumo.aviso > 0 && h('span', { class: 'aba__selo' }, String(resumo.erro + resumo.aviso)))));
    painel.setAttribute('aria-labelledby', `aba-${aba.id}`);
    painel.setAttribute('role', 'tabpanel');

    if (aba !== VISAO_IMPRESSAO && location.hash.slice(1) !== aba.id) history.replaceState(null, '', `#${aba.id}`);

    // ao editar, preserva a rolagem; ao trocar de aba, volta ao início da seção
    const rolagem = aba.id === ultimaAba ? window.scrollY : 0;
    ultimaAba = aba.id;
    trocarConteudo(painel, aba.render(ctx));
    window.scrollTo({ top: rolagem });

    const editado = JSON.stringify(ctx.cal) !== textoBase;
    trocarConteudo(rodape,
      h('span', {}, editado ? '● Edições salvas apenas neste navegador – exporte o JSON para guardar ou versionar.' : 'Versão original do documento (sem edições).'),
      h('span', {}, 'Calendário Acadêmico IFPI · protótipo · dados transcritos do documento “Calendário Acadêmico 2027”'));
  }

  store.assinar(desenhar);
  window.addEventListener('hashchange', () => {
    if (ABAS.some((a) => a.id === location.hash.slice(1))) store.alterarUi({ aba: location.hash.slice(1) });
  });

  // impressão: antes de imprimir troca para a visão que reúne todas as seções; depois volta
  let abaAntesDeImprimir = null;
  window.addEventListener('beforeprint', () => {
    abaAntesDeImprimir = store.obterUi().aba;
    store.alterarUi({ aba: VISAO_IMPRESSAO.id });
  });
  window.addEventListener('afterprint', () => {
    if (abaAntesDeImprimir) store.alterarUi({ aba: abaAntesDeImprimir });
    abaAntesDeImprimir = null;
  });

  // fecha menus abertos ao clicar fora ou apertar Esc
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.menu[open]').forEach((m) => { if (!m.contains(e.target)) m.removeAttribute('open'); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('details.menu[open]').forEach((m) => m.removeAttribute('open'));
    const campo = e.target.closest?.('input, textarea, select, dialog');
    if ((e.ctrlKey || e.metaKey) && !campo) {
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.refazer() : store.desfazer(); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); store.refazer(); }
    }
  });

  desenhar();
}

function mensagemDeErro(erro) {
  const arquivo = location.protocol === 'file:';
  return h('div', { class: 'erro-carga card' },
    h('h1', {}, 'Não foi possível carregar o calendário'),
    h('p', {}, erro.message),
    arquivo && h('p', {}, 'A página foi aberta direto do disco (file://). Navegadores bloqueiam módulos e arquivos locais nesse modo. ',
      'Rode um servidor local, por exemplo: ', h('code', {}, 'python -m http.server 5173'), ' e acesse http://localhost:5173.'));
}

iniciar();
