/**
 * Equilíbrio semanal: cada dia da semana deve somar o mesmo número de dias letivos no semestre
 * (padrão: 20 segundas, 20 terças, 20 quartas, 20 quintas e 20 sextas = 100 dias, o mínimo do
 * Art. 26 da Organização Didática do IFPI).
 *
 * Quando um feriado, ponto facultativo, férias etc. "come" uma terça-feira, essa terça precisa ser
 * reposta por um SÁBADO LETIVO que declare qual dia da semana compensa (`compensa: ["terça"]`).
 *
 * Funções puras, sem DOM.
 */
import { comparar, diaDaSemana, formatarBR, intervalo, nomeDiaSemana } from './datas.js';
import { diaBloqueado } from './diasLetivos.js';
import { datasDoEvento, indexarPorDia, normalizar } from './eventos.js';

export const PADRAO_DIAS_POR_DIA_DA_SEMANA = 20;
export const NOMES_DIAS_UTEIS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta'];

/** "Terça-feira", "terca", "TERÇA" -> 1 (índice em NOMES_DIAS_UTEIS) ou -1 se não reconhecer. */
export function indiceDiaUtil(texto) {
  const t = normalizar(texto).trim();
  return NOMES_DIAS_UTEIS.findIndex((n) => t.startsWith(normalizar(n)));
}

export const metaPorDia = (cal) => cal.meta?.regras?.diasPorDiaDaSemana ?? PADRAO_DIAS_POR_DIA_DA_SEMANA;

/**
 * Balanço de um semestre.
 * @returns {{ semestre: string, inicio: string, fim: string, alvo: number,
 *   dias: Array<{ indice: number, nome: string, disponiveis: number, compensados: number,
 *                 total: number, saldo: number, perdidos: Array<{data: string, motivo: string}> }>,
 *   total: number, metaTotal: number,
 *   semCompensa: Array<{ eventoId: string, titulo: string, faltam: number }>,
 *   nomesInvalidos: Array<{ eventoId: string, nome: string }> }}
 */
export function equilibrioDoSemestre(cal, categoriasPorId, sem) {
  const alvo = metaPorDia(cal);
  const regras = cal.meta?.regras ?? {};
  const porDia = indexarPorDia(cal.eventos);

  const dias = NOMES_DIAS_UTEIS.map((nome, i) => ({
    indice: i, nome, disponiveis: 0, compensados: 0, total: 0, saldo: 0, perdidos: [],
  }));

  for (const data of intervalo(sem.inicio, sem.fim)) {
    const semana = diaDaSemana(data);
    if (semana < 1 || semana > 5) continue;
    const eventos = porDia.get(data) ?? [];
    const alvoDia = dias[semana - 1];
    if (diaBloqueado(eventos.map((e) => e.tipo), categoriasPorId, regras)) {
      const motivo = eventos.find((e) => diaBloqueado([e.tipo], categoriasPorId, regras))?.titulo ?? 'Dia sem aula';
      alvoDia.perdidos.push({ data, motivo });
    } else {
      alvoDia.disponiveis += 1;
    }
  }

  const semCompensa = [];
  const nomesInvalidos = [];
  for (const ev of cal.eventos) {
    if (ev.tipo !== 'sabado_letivo') continue;
    const datas = datasDoEvento(ev);
    // o sábado pertence ao semestre da sua primeira data
    if (!datas.length || datas[0] < sem.inicio || datas[0] > sem.fim) continue;
    let reconhecidos = 0;
    for (const nome of ev.compensa ?? []) {
      const i = indiceDiaUtil(nome);
      if (i < 0) nomesInvalidos.push({ eventoId: ev.id, nome });
      else { dias[i].compensados += 1; reconhecidos += 1; }
    }
    if (reconhecidos < datas.length) semCompensa.push({ eventoId: ev.id, titulo: ev.titulo, faltam: datas.length - reconhecidos });
  }

  for (const d of dias) {
    d.total = d.disponiveis + d.compensados;
    d.saldo = d.total - alvo;
  }
  return {
    semestre: sem.id, inicio: sem.inicio, fim: sem.fim, alvo, dias,
    total: dias.reduce((s, d) => s + d.total, 0), metaTotal: alvo * 5, semCompensa, nomesInvalidos,
  };
}

export const equilibrioDoCalendario = (cal, categoriasPorId) =>
  (cal.semestres ?? []).map((sem) => equilibrioDoSemestre(cal, categoriasPorId, sem));

const fechou = (eq) => eq.dias.every((d) => d.saldo >= 0);

/**
 * Sábados livres do semestre (sem feriado/férias e ainda sem sábado letivo ou de reposição).
 */
function sabadosLivres(cal, categoriasPorId, sem, usados) {
  const porDia = indexarPorDia(cal.eventos);
  const regras = cal.meta?.regras ?? {};
  return intervalo(sem.inicio, sem.fim).filter((d) => {
    if (diaDaSemana(d) !== 6 || usados.has(d)) return false;
    const tipos = (porDia.get(d) ?? []).map((e) => e.tipo);
    return !diaBloqueado(tipos, categoriasPorId, regras) && !tipos.includes('sabado_letivo') && !tipos.includes('sabado_reposicao');
  });
}

/**
 * Sugestões para fechar o balanço:
 *  1. `sabados`: para cada dia perdido, o primeiro sábado livre depois dele ("repor no sábado seguinte");
 *     se ainda faltar, sábados de complemento espalhados pelo semestre (um semestre curto não tem dia perdido a repor);
 *  2. `faltaEstender`: o que ainda falta quando não há mais sábados livres – é preciso mudar início/término;
 *  3. `terminoSugerido` / `inicioSugerido`: datas que fechariam o balanço mantendo a outra ponta
 *     (só com `buscarLimites`, pois cada busca recalcula o semestre várias vezes).
 */
export function sugerirAjustes(cal, categoriasPorId, eq, { buscarLimites = true } = {}) {
  const sem = { id: eq.semestre, inicio: eq.inicio, fim: eq.fim };
  const usados = new Set();
  const sabados = [];
  const restante = []; // [{ nome, faltam }] depois de repor os dias perdidos

  for (const dia of eq.dias) {
    let faltam = -dia.saldo;
    if (faltam <= 0) continue;
    for (const perdido of dia.perdidos) {
      if (faltam <= 0) break;
      const sabado = sabadosLivres(cal, categoriasPorId, sem, usados).find((s) => s > perdido.data);
      if (!sabado) continue;
      usados.add(sabado);
      sabados.push({ semestre: eq.semestre, data: sabado, compensa: dia.nome, perdidoEm: perdido.data, motivo: perdido.motivo });
      faltam -= 1;
    }
    if (faltam > 0) restante.push({ nome: dia.nome, faltam });
  }

  // complemento: sábados livres espalhados ao longo do semestre
  const precisa = restante.reduce((t, r) => t + r.faltam, 0);
  const livres = sabadosLivres(cal, categoriasPorId, sem, usados);
  const faltaEstender = [];
  if (precisa > 0) {
    const escolhidos = livres.length <= precisa
      ? livres
      : Array.from({ length: precisa }, (_, k) => livres[Math.floor(((k + 0.5) * livres.length) / precisa)]);
    const pendentes = restante.flatMap((r) => Array(r.faltam).fill(r.nome));
    escolhidos.forEach((data, k) => {
      sabados.push({ semestre: eq.semestre, data, compensa: pendentes[k], perdidoEm: null, motivo: 'Complemento: o semestre tem menos dias que a meta' });
    });
    for (const r of restante) {
      const sobrou = pendentes.slice(escolhidos.length).filter((n) => n === r.nome).length;
      if (sobrou > 0) faltaEstender.push({ nome: r.nome, faltam: sobrou });
    }
  }

  const sugestoes = { sabados: sabados.sort((a, b) => comparar(a.data, b.data)), faltaEstender, terminoSugerido: null, inicioSugerido: null };
  if (buscarLimites && faltaEstender.length) {
    // alarga o semestre até fechar, sem invadir o semestre vizinho (limite de 20 semanas)
    const outros = (cal.semestres ?? []).filter((o) => o.id !== eq.semestre);
    const proximo = outros.map((o) => o.inicio).filter((i) => i > eq.fim).sort(comparar)[0] ?? '9999-12-31';
    const anterior = outros.map((o) => o.fim).filter((f) => f < eq.inicio).sort(comparar).at(-1) ?? '0000-01-01';
    for (let n = 1; n <= 140 && !sugestoes.terminoSugerido; n += 1) {
      const fim = somar(eq.fim, n);
      if (fim >= proximo) break;
      if (fechou(equilibrioDoSemestre(cal, categoriasPorId, { ...sem, fim }))) sugestoes.terminoSugerido = fim;
    }
    for (let n = 1; n <= 140 && !sugestoes.inicioSugerido; n += 1) {
      const inicio = somar(eq.inicio, -n);
      if (inicio <= anterior) break;
      if (fechou(equilibrioDoSemestre(cal, categoriasPorId, { ...sem, inicio }))) sugestoes.inicioSugerido = inicio;
    }
  }
  return sugestoes;
}

/**
 * Cenários para fechar um semestre MANTENDO o início: estender o término (sexta-feira a sexta-feira,
 * até 6 semanas) e completar o que faltar com sábados letivos.
 * As férias que ficam depois do término original são ignoradas na conta (o semestre as "consome");
 * `feriasConsumidas` diz quantos dias de férias isso representa.
 *
 * @returns {Array<{ fim: string, semanas: number, totais: number[], sabados: object[],
 *                   viavel: boolean, feriasConsumidas: number, faltaEstender: object[] }>}
 */
export function cenariosDeFechamento(cal, categoriasPorId, eq) {
  const ferias = new Set(cal.eventos.filter((e) => e.tipo === 'ferias').flatMap(datasDoEvento));
  const calSemFerias = { ...cal, eventos: cal.eventos.filter((e) => !(e.tipo === 'ferias' && datasDoEvento(e).some((d) => d > eq.fim))) };
  const fins = [eq.fim];
  for (let d = somar(eq.fim, 1); d <= somar(eq.fim, 42); d = somar(d, 1)) if (diaDaSemana(d) === 5) fins.push(d);

  return fins.map((fim) => {
    const eqC = equilibrioDoSemestre(calSemFerias, categoriasPorId, { id: eq.semestre, inicio: eq.inicio, fim });
    const sug = sugerirAjustes(calSemFerias, categoriasPorId, eqC, { buscarLimites: false });
    return {
      fim,
      semanas: Math.round((new Date(`${fim}T00:00:00Z`) - new Date(`${eq.fim}T00:00:00Z`)) / (7 * 86_400_000)),
      totais: eqC.dias.map((d) => d.total),
      saldos: eqC.dias.map((d) => d.saldo),
      sabados: sug.sabados,
      viavel: sug.faltaEstender.length === 0, // sobras não impedem: basta dispensar sábados letivos desse dia da semana
      faltaEstender: sug.faltaEstender,
      sobras: eqC.dias.filter((d) => d.saldo > 0).map((d) => ({ nome: d.nome, sobram: d.saldo })),
      feriasConsumidas: intervalo(somar(eq.fim, 1), fim).filter((d) => ferias.has(d)).length,
    };
  });
}

function somar(dataIso, n) {
  const [a, m, d] = dataIso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Texto curto "terça 07/09 (Independência…)" usado em mensagens. */
export const descreverPerda = (p) => `${nomeDiaSemana(p.data)} ${formatarBR(p.data).slice(0, 5)} (${p.motivo})`;
