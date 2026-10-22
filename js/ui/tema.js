/**
 * Tema claro/escuro. Sem preferência salva, segue o sistema (prefers-color-scheme);
 * ao clicar no botão a escolha fica gravada no navegador.
 */
const CHAVE = 'calendario-academico:tema';
const raiz = document.documentElement;

const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento: vale só nesta sessão */ } };

export const temaAtual = () =>
  raiz.dataset.tema ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');

export function iniciarTema() {
  const salvo = ler();
  if (salvo === 'claro' || salvo === 'escuro') raiz.dataset.tema = salvo;
}

export function alternarTema() {
  const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  raiz.dataset.tema = novo;
  gravar(novo);
  return novo;
}
