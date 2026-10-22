/**
 * Janela de criação/edição de evento.
 */
import { h } from '../lib/dom.js';
import { ehDataValida, formatarBR } from '../core/datas.js';
import { novoId } from '../core/eventos.js';
import { NOMES_DIAS_UTEIS, indiceDiaUtil } from '../core/equilibrio.js';
import { feriadosDoAno } from '../core/feriados.js';
import { abrirDialogo } from './dialogo.js';
import { mostrarToast } from './toast.js';

/** Linha com os campos "de" e "até" de um período. */
function linhaPeriodo(periodo, aoRemover) {
  const de = h('input', { type: 'date', class: 'campo', value: periodo.de ?? '', 'aria-label': 'Data inicial' });
  const ate = h('input', { type: 'date', class: 'campo', value: periodo.ate ?? '', 'aria-label': 'Data final (opcional)' });
  const validar = () => {
    ate.setCustomValidity(ate.value && de.value && ate.value < de.value ? 'A data final não pode ser anterior à inicial.' : '');
  };
  de.addEventListener('input', validar);
  ate.addEventListener('input', validar);
  const el = h('div', { class: 'periodo' },
    h('label', { class: 'periodo__campo' }, h('span', {}, 'De'), de),
    h('label', { class: 'periodo__campo' }, h('span', {}, 'Até (opcional)'), ate),
    h('button', { type: 'button', class: 'btn btn--icone btn--perigo-suave', 'aria-label': 'Remover período', onclick: () => aoRemover(el) }, '✕'));
  el.ler = () => ({ de: de.value, ate: ate.value && ate.value !== de.value ? ate.value : undefined });
  return el;
}

/**
 * @param {object} ctx
 * @param {{ eventoId?: string, dataInicial?: string, modelo?: object }} [opcoes]
 *   eventoId edita; dataInicial pré-preenche a data; modelo ({tipo, titulo, periodos, compensa})
 *   pré-preenche um evento novo (usado nos atalhos "Sábado letivo", "Ponto facultativo"…)
 */
export function abrirDialogoEvento(ctx, { eventoId, dataInicial, modelo } = {}) {
  const { store, categorias } = ctx;
  const cal = store.obterCal();
  const existente = cal.eventos.find((e) => e.id === eventoId);
  const base = existente ?? {
    tipo: 'administrativo', titulo: '', periodos: dataInicial ? [{ de: dataInicial }] : [], ...modelo,
  };

  const titulo = h('input', { type: 'text', name: 'titulo', class: 'campo', required: true, value: base.titulo, maxlength: 240, autocomplete: 'off' });
  const tipo = h('select', { name: 'tipo', class: 'campo', required: true },
    h('optgroup', { label: 'Cores do calendário' }, categorias.filter((c) => c.legenda && !c.calculada).map((c) => h('option', { value: c.id, selected: base.tipo === c.id }, c.nome))),
    h('optgroup', { label: 'Marcadores' }, categorias.filter((c) => !c.legenda).map((c) => h('option', { value: c.id, selected: base.tipo === c.id }, c.nome))));

  // períodos (lista dinâmica)
  const listaPeriodos = h('div', { class: 'periodos' });
  const adicionarPeriodo = (p = {}) => listaPeriodos.append(linhaPeriodo(p, (el) => el.remove()));
  (base.periodos.length ? base.periodos : [{}]).forEach(adicionarPeriodo);

  // sábado letivo: quantos dias úteis de cada dia da semana este(s) sábado(s) repõe(m)
  const contagemInicial = NOMES_DIAS_UTEIS.map((_, i) => (base.compensa ?? []).filter((n) => indiceDiaUtil(n) === i).length);
  const contadores = NOMES_DIAS_UTEIS.map((nome, i) => h('label', { class: 'compensa__dia' },
    h('span', {}, nome.slice(0, 3)),
    h('input', { type: 'number', class: 'campo', min: 0, max: 5, value: contagemInicial[i], 'aria-label': `Quantas ${nome}s este sábado letivo repõe`, oninput: () => atualizarDica() })));
  const dica = h('small', { class: 'compensa__dica', 'aria-live': 'polite' });
  const blocoCompensa = h('div', { class: 'rotulo' },
    h('span', {}, 'Dias da semana que este sábado letivo repõe'),
    h('div', { class: 'compensa' }, contadores),
    dica,
    h('small', {}, 'Cada sábado repõe um dia útil perdido (feriado, ponto facultativo…). Se o evento tem 2 sábados, some 2 aqui.'));
  const mostrarCompensa = () => { blocoCompensa.hidden = tipo.value !== 'sabado_letivo'; atualizarDica(); };
  tipo.addEventListener('change', mostrarCompensa);

  // dica: situação do semestre (quais dias da semana ainda faltam) para a data escolhida
  function atualizarDica() {
    if (blocoCompensa.hidden) return;
    const primeira = [...listaPeriodos.querySelectorAll('input[type=date]')].map((i) => i.value).filter(Boolean).sort()[0];
    const eq = (ctx.equilibrio ?? []).find((e) => primeira && primeira >= e.inicio && primeira <= e.fim);
    if (!eq) { dica.textContent = primeira ? 'Esta data não está dentro de nenhum semestre cadastrado.' : 'Escolha a data para ver o que falta no semestre.'; return; }
    const faltam = eq.dias.filter((d) => d.saldo < 0).map((d) => `${d.nome} (${-d.saldo})`);
    const sobram = eq.dias.filter((d) => d.saldo > 0).map((d) => `${d.nome} (+${d.saldo})`);
    dica.textContent = `Semestre ${eq.semestre}: ${faltam.length ? `faltam ${faltam.join(', ')}` : 'nenhum dia da semana está faltando'}${sobram.length ? ` · sobram ${sobram.join(', ')}` : ''}.`;
  }
  listaPeriodos.addEventListener('input', atualizarDica);
  listaPeriodos.addEventListener('click', () => setTimeout(atualizarDica, 0));

  const refs = feriadosDoAno(cal.meta.ano);
  const ref = h('select', { name: 'ref', class: 'campo' },
    h('option', { value: '' }, '— nenhum —'),
    Object.entries(refs).map(([k, f]) => h('option', { value: k, selected: base.ref === k }, `${f.titulo} (${f.datas.map((d) => formatarBR(d).slice(0, 5)).join(' e ')})`)));
  const marcos = h('input', { type: 'text', name: 'marcos', class: 'campo', value: (base.marcos ?? []).join(', '), placeholder: 'inicio_bimestre:2, termino_semestre:2027.1' });
  const obs = h('textarea', { name: 'obs', class: 'campo', rows: 2 }, base.obs ?? '');
  const pendencia = h('textarea', { name: 'pendencia', class: 'campo', rows: 2, placeholder: 'Ex.: confirmar data com a coordenação' }, base.pendencia ?? '');

  const corpo = h('div', { class: 'form-grade' },
    h('label', { class: 'rotulo rotulo--cheio' }, h('span', {}, 'Título do evento'), titulo),
    h('label', { class: 'rotulo' }, h('span', {}, 'Categoria'), tipo),
    h('div', { class: 'rotulo' },
      h('span', {}, 'Data(s)'),
      listaPeriodos,
      h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => adicionarPeriodo() }, '+ Adicionar período'),
      h('small', {}, 'Use vários períodos para casos como “21 a 25 e 28”. Sem data, o evento fica em Pendências.')),
    h('div', { class: 'rotulo--cheio' }, blocoCompensa),
    h('label', { class: 'rotulo rotulo--cheio' }, h('span', {}, 'Observação'), obs),
    h('label', { class: 'rotulo rotulo--cheio' }, h('span', {}, 'Nota de revisão (aparece em Pendências)'), pendencia),
    h('details', { class: 'avancado rotulo--cheio' },
      h('summary', {}, 'Opções avançadas'),
      h('label', { class: 'rotulo' }, h('span', {}, 'Feriado de referência (confere a data oficial)'), ref),
      h('label', { class: 'rotulo' }, h('span', {}, 'Marcos (separados por vírgula)'), marcos)));

  const salvar = (_, dlg) => {
    const periodos = [...listaPeriodos.children].map((el) => el.ler()).filter((p) => p.de && ehDataValida(p.de));
    const novo = {
      id: existente?.id,
      tipo: tipo.value,
      titulo: titulo.value.trim(),
      periodos,
    };
    const lista = (txt) => txt.split(',').map((s) => s.trim()).filter(Boolean);
    if (tipo.value === 'sabado_letivo') {
      const compensa = contadores.flatMap((el, i) => Array(Math.max(0, Number(el.querySelector('input').value) || 0)).fill(NOMES_DIAS_UTEIS[i]));
      if (compensa.length) novo.compensa = compensa;
      // título automático: "Sábado letivo (terça, sexta)"
      if (compensa.length && (!novo.titulo || novo.titulo === 'Sábado letivo')) novo.titulo = `Sábado letivo (${compensa.join(', ')})`;
    }
    if (ref.value) novo.ref = ref.value;
    if (marcos.value.trim()) novo.marcos = lista(marcos.value);
    if (obs.value.trim()) novo.obs = obs.value.trim();
    if (pendencia.value.trim()) novo.pendencia = pendencia.value.trim();
    if (existente?.diaOriginal && !periodos.length) novo.diaOriginal = existente.diaOriginal;

    store.alterarCal((c) => {
      if (existente) c.eventos[c.eventos.findIndex((e) => e.id === existente.id)] = novo;
      else c.eventos.push({ ...novo, id: novoId(c.eventos) });
    });
    dlg.close();
    mostrarToast(existente ? 'Evento atualizado.' : 'Evento adicionado.', { acao: { rotulo: 'Desfazer', aoClicar: () => store.desfazer() } });
  };

  mostrarCompensa();
  abrirDialogo({
    titulo: existente ? 'Editar evento' : (base.rotuloDialogo ? `Registrar ${base.rotuloDialogo}` : 'Novo evento'),
    subtitulo: existente ? `ID ${existente.id}` : undefined,
    corpo,
    aoEnviar: salvar,
    botoes: [
      existente && { rotulo: 'Excluir', variante: 'perigo', aoClicar: (_, dlg) => { dlg.close(); ctx.acoes.excluirEvento(existente.id); } },
      { rotulo: 'Cancelar', aoClicar: (_, dlg) => dlg.close() },
      { rotulo: 'Salvar', variante: 'primario', submit: true },
    ].filter(Boolean),
  });
  setTimeout(() => titulo.focus(), 30);
}
