/**
 * Avisos temporários no canto da tela (região aria-live, lida por leitores de tela).
 */
import { h } from '../lib/dom.js';

function regiao() {
  let el = document.getElementById('toasts');
  if (!el) {
    el = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  return el;
}

/**
 * @param {string} mensagem
 * @param {{ tipo?: 'ok'|'erro', acao?: { rotulo: string, aoClicar: Function }, duracao?: number }} [opcoes]
 */
export function mostrarToast(mensagem, { tipo = 'ok', acao, duracao = 6000 } = {}) {
  const toast = h('div', { class: `toast toast--${tipo}` },
    h('span', {}, mensagem),
    acao && h('button', {
      type: 'button', class: 'toast__acao',
      onclick: () => { acao.aoClicar(); toast.remove(); },
    }, acao.rotulo));
  regiao().append(toast);
  setTimeout(() => toast.remove(), duracao);
}
