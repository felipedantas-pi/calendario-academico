/**
 * Janelas modais baseadas no elemento nativo <dialog> (foco preso, Esc e acessibilidade grátis).
 */
import { h } from '../lib/dom.js';

let contador = 0;

/**
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} [opcoes.subtitulo]
 * @param {Node|Node[]} opcoes.corpo
 * @param {Array<{rotulo:string, variante?:'primario'|'perigo'|'neutro', submit?:boolean, aoClicar?:Function}>} [opcoes.botoes]
 * @param {Function} [opcoes.aoEnviar]  chamada ao enviar o formulário já validado
 * @param {'sm'|'md'|'lg'} [opcoes.largura]
 * @returns {HTMLDialogElement}
 */
export function abrirDialogo({ titulo, subtitulo, corpo, botoes = [], aoEnviar, largura = 'md' }) {
  const idTitulo = `dlg-titulo-${++contador}`;
  const dlg = h('dialog', { class: `dialogo dialogo--${largura}`, 'aria-labelledby': idTitulo });

  const form = h('form', { class: 'dialogo__form', novalidate: false },
    h('header', { class: 'dialogo__topo' },
      h('div', {},
        h('h2', { id: idTitulo, class: 'dialogo__titulo' }, titulo),
        subtitulo && h('p', { class: 'dialogo__subtitulo' }, subtitulo)),
      h('button', { type: 'button', class: 'btn btn--icone', 'aria-label': 'Fechar', onclick: () => dlg.close() }, '✕')),
    h('div', { class: 'dialogo__corpo' }, corpo),
    botoes.length > 0 && h('footer', { class: 'dialogo__rodape' }, botoes.map((b) =>
      h('button', {
        type: b.submit ? 'submit' : 'button',
        class: `btn btn--${b.variante ?? 'neutro'}`,
        onclick: b.aoClicar && ((e) => b.aoClicar(e, dlg)),
      }, b.rotulo))));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.reportValidity()) aoEnviar?.(new FormData(form), dlg);
  });
  // clique no fundo escurecido fecha a janela
  dlg.addEventListener('mousedown', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());

  dlg.append(form);
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/** Pergunta Sim/Não. Resolve true se confirmado. */
export function confirmar(mensagem, { titulo = 'Confirmar', rotuloOk = 'Confirmar', perigo = false } = {}) {
  return new Promise((resolver) => {
    let resposta = false;
    const dlg = abrirDialogo({
      titulo,
      largura: 'sm',
      corpo: h('p', { class: 'dialogo__texto' }, mensagem),
      botoes: [
        { rotulo: 'Cancelar', aoClicar: (_, d) => d.close() },
        { rotulo: rotuloOk, variante: perigo ? 'perigo' : 'primario', aoClicar: (_, d) => { resposta = true; d.close(); } },
      ],
    });
    dlg.addEventListener('close', () => resolver(resposta));
  });
}
