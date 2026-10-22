/**
 * Modelo do calendário: criação de um ano novo e checagem estrutural de arquivos importados.
 * Funções puras, sem DOM.
 */
import { ehDataValida, iso } from './datas.js';
import { feriadosDoAno } from './feriados.js';
import { garantirIds } from './eventos.js';
import { validarPersonalizadas } from './categorias.js';

export const VERSAO_ESQUEMA = 1;

/**
 * Confere se um objeto lido de um arquivo tem o formato esperado.
 * @returns {string[]} lista de erros (vazia = formato aceito)
 */
export function validarEstrutura(obj) {
  const erros = [];
  if (!obj || typeof obj !== 'object') return ['O arquivo não contém um objeto JSON.'];
  if (!obj.meta || typeof obj.meta !== 'object') erros.push('Campo "meta" ausente.');
  else if (!Number.isInteger(obj.meta.ano)) erros.push('"meta.ano" deve ser um número inteiro.');
  if (!Array.isArray(obj.eventos)) erros.push('Campo "eventos" deve ser uma lista.');
  else {
    obj.eventos.forEach((e, i) => {
      if (typeof e?.titulo !== 'string') erros.push(`Evento ${i + 1}: "titulo" ausente.`);
      if (typeof e?.tipo !== 'string') erros.push(`Evento ${i + 1}: "tipo" ausente.`);
      if (!Array.isArray(e?.periodos)) erros.push(`Evento ${i + 1}: "periodos" deve ser uma lista.`);
    });
  }
  erros.push(...validarPersonalizadas(obj.categorias));
  for (const campo of ['semestres', 'bimestres']) {
    if (obj[campo] !== undefined && !Array.isArray(obj[campo])) erros.push(`"${campo}" deve ser uma lista.`);
  }
  return erros.slice(0, 8);
}

/** Preenche campos opcionais e ids, devolvendo um calendário pronto para uso. */
export function normalizarCalendario(bruto) {
  const cal = structuredClone(bruto);
  cal.versao ??= VERSAO_ESQUEMA;
  cal.meta.regras = { pontoFacultativoNaoLetivo: true, reposicaoContaComoLetivo: false, diasPorDiaDaSemana: 20, ...cal.meta.regras };
  cal.meta.modalidade ??= 'tecnico_integrado';
  cal.meta.informado ??= {};
  cal.meta.referenciasSuspeitas ??= [];
  cal.semestres ??= [];
  cal.bimestres ??= [];
  cal.comemorativas ??= [];
  garantirIds(cal.eventos);
  return cal;
}

/**
 * Esqueleto de um ano novo: já traz os feriados (inclusive os móveis, calculados pela Páscoa)
 * e as datas comemorativas. Semestres e bimestres vêm com datas sugeridas para edição.
 */
export function novoCalendario({ ano, campus, instituicao, titulo, subtitulo }, comemorativas = [], categorias = undefined) {
  const eventos = Object.entries(feriadosDoAno(ano)).map(([ref, f], i) => ({
    id: `ev${String(i + 1).padStart(3, '0')}`,
    tipo: f.tipo,
    titulo: f.titulo,
    ref,
    periodos: f.datas.length > 1 ? [{ de: f.datas[0], ate: f.datas.at(-1) }] : [{ de: f.datas[0] }],
  }));
  return normalizarCalendario({
    versao: VERSAO_ESQUEMA,
    meta: {
      ano,
      instituicao,
      campus,
      titulo: titulo || `Calendário Acadêmico ${ano}`,
      subtitulo: subtitulo ?? '',
      inicio: iso(ano, 2, 1),
      termino: iso(ano, 12, 20),
    },
    semestres: [
      { id: `${ano}.1`, inicio: iso(ano, 2, 1), fim: iso(ano, 6, 30) },
      { id: `${ano}.2`, inicio: iso(ano, 8, 1), fim: iso(ano, 12, 20) },
    ],
    bimestres: [
      { n: 1, semestre: `${ano}.1`, inicio: iso(ano, 2, 1), fim: iso(ano, 4, 30) },
      { n: 2, semestre: `${ano}.1`, inicio: iso(ano, 5, 1), fim: iso(ano, 6, 30) },
      { n: 3, semestre: `${ano}.2`, inicio: iso(ano, 8, 1), fim: iso(ano, 10, 8) },
      { n: 4, semestre: `${ano}.2`, inicio: iso(ano, 10, 11), fim: iso(ano, 12, 20) },
    ],
    eventos,
    comemorativas: structuredClone(comemorativas),
    ...(categorias?.length ? { categorias: structuredClone(categorias) } : {}), // cores personalizadas passam para o ano novo
  });
}

/** Garante que uma string seja data ISO válida ou null. */
export const dataOuNulo = (v) => (v && ehDataValida(v) ? v : null);
