/**
 * Mini-biblioteca de DOM (≈ 40 linhas) para não depender de framework.
 *
 *   h('button', { class: 'btn', onclick: fn, 'aria-label': 'x' }, 'Texto', outroNo)
 *
 * - `class` aceita string; `dataset` aceita objeto; atributos `on*` viram event listeners;
 * - valores false/null/undefined são ignorados (permite `cond && {...}`);
 * - filhos podem ser strings, nós, arrays (achatados) ou vazios.
 * Textos entram sempre como TextNode, nunca como HTML – por isso não há risco de injeção.
 */
export function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(attrs ?? {})) {
    if (valor === false || valor == null) continue;
    if (chave === 'class') el.className = valor;
    else if (chave === 'dataset') Object.assign(el.dataset, valor);
    else if (chave === 'style' && typeof valor === 'object') aplicarEstilo(el, valor);
    else if (chave.startsWith('on') && typeof valor === 'function') el.addEventListener(chave.slice(2), valor);
    else if (valor === true) el.setAttribute(chave, '');
    else el.setAttribute(chave, valor);
  }
  anexar(el, filhos);
  return el;
}

/** Aplica um objeto de estilos; propriedades "--x" (variáveis CSS) exigem setProperty. */
function aplicarEstilo(el, estilos) {
  for (const [prop, valor] of Object.entries(estilos)) {
    if (valor == null) continue;
    if (prop.startsWith('--')) el.style.setProperty(prop, valor);
    else el.style[prop] = valor;
  }
}

function anexar(pai, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f === false || f == null) continue;
    pai.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

/** Substitui todo o conteúdo de um elemento. */
export function trocarConteudo(el, ...filhos) {
  el.replaceChildren();
  anexar(el, filhos);
  return el;
}

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
