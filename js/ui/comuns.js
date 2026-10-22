/**
 * Pequenos componentes visuais reutilizados por várias telas.
 */
import { h } from '../lib/dom.js';
import { MESES, nomeDiaSemana, partes } from '../core/datas.js';

/** Etiqueta colorida com o nome da categoria (a cor vem de data/categorias.json). */
export function seloCategoria(categoria, { compacto = false } = {}) {
  if (!categoria) return null;
  return h('span', {
    class: `selo${compacto ? ' selo--compacto' : ''}`,
    style: { '--cor': categoria.cor, '--cat-texto': categoria.texto },
  }, categoria.nome);
}

/** "2027-03-13" -> "sábado, 13 de março de 2027" */
export function dataLonga(dataIso) {
  const { ano, mes, dia } = partes(dataIso);
  return `${nomeDiaSemana(dataIso)}, ${dia} de ${MESES[mes - 1].toLowerCase()} de ${ano}`;
}

/** "sábado" -> "Sáb" */
export const diaSemanaCurto = (dataIso) => {
  const nome = nomeDiaSemana(dataIso);
  return nome.slice(0, 3).replace(/^./, (c) => c.toUpperCase());
};

/** Cartão-vazio padrão. */
export const estadoVazio = (texto) => h('p', { class: 'vazio' }, texto);
