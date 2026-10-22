/**
 * Cálculo de dias letivos e do "estado" (categoria dominante) de cada dia.
 *
 * No documento Word esses números e cores são digitados/pintados à mão; aqui são
 * derivados dos eventos, então mudam sozinhos quando um evento é editado.
 *
 * Regra de dia letivo (confere com as contagens de MAR, ABR, MAI, JUN, OUT e NOV
 * do documento de 2027):
 *   - dentro de um semestre letivo [início, fim];
 *   - segunda a sexta que não seja feriado, férias, recesso, prova final (nem ponto facultativo,
 *     configurável em meta.regras.pontoFacultativoNaoLetivo);
 *   - mais os sábados letivos (e os de reposição, se meta.regras.reposicaoContaComoLetivo).
 */
import { ehFimDeSemana, ehSabado, intervalo, partes } from './datas.js';
import { indexarPorDia } from './eventos.js';

/** Categorias de fundo por ordem de prioridade (feriado vence ponto facultativo, etc.). */
export function categoriaDominante(tipos, categoriasPorId) {
  let melhor = null;
  for (const t of tipos) {
    const c = categoriasPorId.get(t);
    if (!c || c.estilo !== 'fundo') continue;
    if (!melhor || c.prioridade < melhor.prioridade) melhor = c;
  }
  return melhor?.id ?? null;
}

/**
 * O dia não é letivo? (feriado, férias, recesso, prova final e – conforme a regra – ponto facultativo)
 * Prova final não conta: a Organização Didática (Art. 26) exclui o tempo dos exames finais.
 * @param {Iterable<string>} tipos  categorias dos eventos do dia
 */
export function diaBloqueado(tipos, categoriasPorId, regras = {}) {
  return [...tipos].some((t) => {
    const efeito = categoriasPorId.get(t)?.efeitoLetivo;
    return efeito === 'bloqueia' || (efeito === 'ponto' && regras.pontoFacultativoNaoLetivo !== false);
  });
}

/**
 * @param {object} cal  calendário (meta, semestres, eventos)
 * @param {Map<string, object>} categoriasPorId
 * @returns {{ estadoPorDia: Map<string,string>, letivos: Set<string>,
 *             porMes: number[], porSemestre: Record<string, number>, total: number }}
 */
export function calcularDiasLetivos(cal, categoriasPorId) {
  const regras = cal.meta?.regras ?? {};
  const porDia = indexarPorDia(cal.eventos);
  const estadoPorDia = new Map();
  const letivos = new Set();
  const porMes = Array(12).fill(0);
  const porSemestre = {};

  // 1) estado visual de cada dia que possui evento com cor de fundo
  for (const [dia, eventos] of porDia) {
    const dominante = categoriaDominante(eventos.map((e) => e.tipo), categoriasPorId);
    if (dominante) estadoPorDia.set(dia, dominante);
  }

  // 2) dias letivos dentro de cada semestre
  for (const sem of cal.semestres ?? []) {
    porSemestre[sem.id] = 0;
    for (const dia of intervalo(sem.inicio, sem.fim)) {
      const tipos = new Set((porDia.get(dia) ?? []).map((e) => e.tipo));
      const bloqueado = diaBloqueado(tipos, categoriasPorId, regras);
      let conta = false;
      if (ehSabado(dia)) {
        conta = tipos.has('sabado_letivo') || (tipos.has('sabado_reposicao') && !!regras.reposicaoContaComoLetivo);
        if (bloqueado) conta = false;
      } else if (!ehFimDeSemana(dia)) {
        conta = !bloqueado;
      }
      if (!conta) continue;
      letivos.add(dia);
      porMes[partes(dia).mes - 1] += 1;
      porSemestre[sem.id] += 1;
      // dia letivo "puro" só ganha a cor verde se nenhuma outra categoria de fundo o domina
      if (!estadoPorDia.has(dia)) estadoPorDia.set(dia, 'letivo');
    }
  }

  const total = Object.values(porSemestre).reduce((s, n) => s + n, 0);
  return { estadoPorDia, letivos, porMes, porSemestre, total };
}
