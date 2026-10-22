/**
 * Utilitários de data – funções puras, sem DOM.
 *
 * Todas as datas trafegam como string ISO "AAAA-MM-DD". Os cálculos usam UTC
 * para que fuso horário e horário de verão nunca desloquem um dia.
 */

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const MESES_ABREV = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Cabeçalho do calendário do documento original: D S T Q Q S S. */
export const DIAS_SEMANA_INICIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const MS_DIA = 86_400_000;
const pad = (n, t = 2) => String(n).padStart(t, '0');

/** Monta "AAAA-MM-DD" a partir de ano, mês (1-12) e dia. */
export const iso = (ano, mes, dia) => `${pad(ano, 4)}-${pad(mes)}-${pad(dia)}`;

/** "2027-03-08" -> { ano: 2027, mes: 3, dia: 8 } */
export function partes(dataIso) {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  return { ano, mes, dia };
}

const paraUtc = (dataIso) => {
  const { ano, mes, dia } = partes(dataIso);
  return Date.UTC(ano, mes - 1, dia);
};
const deUtc = (ms) => {
  const d = new Date(ms);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

/** Valida se a string é uma data ISO existente (rejeita 2027-02-30). */
export function ehDataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  return deUtc(paraUtc(valor)) === valor;
}

/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (dataIso) => new Date(paraUtc(dataIso)).getUTCDay();
export const ehSabado = (dataIso) => diaDaSemana(dataIso) === 6;
export const ehDomingo = (dataIso) => diaDaSemana(dataIso) === 0;
export const ehFimDeSemana = (dataIso) => [0, 6].includes(diaDaSemana(dataIso));

export const somarDias = (dataIso, n) => deUtc(paraUtc(dataIso) + n * MS_DIA);
export const diferencaEmDias = (a, b) => Math.round((paraUtc(b) - paraUtc(a)) / MS_DIA);
export const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Compara duas datas ISO (serve em Array.sort). */
export const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Lista todas as datas de [de, ate], inclusive. Vazio se o intervalo for inválido. */
export function intervalo(de, ate = de) {
  const lista = [];
  if (!ehDataValida(de) || !ehDataValida(ate) || de > ate) return lista;
  for (let d = de; d <= ate; d = somarDias(d, 1)) lista.push(d);
  return lista;
}

/** "2027-03-08" -> "08/03/2027" */
export function formatarBR(dataIso) {
  if (!dataIso) return '';
  const { ano, mes, dia } = partes(dataIso);
  return `${pad(dia)}/${pad(mes)}/${ano}`;
}

/** "2027-03-08" -> "08/03" */
export function formatarCurto(dataIso) {
  const { mes, dia } = partes(dataIso);
  return `${pad(dia)}/${pad(mes)}`;
}

/**
 * Rótulo da coluna "DIA" do documento original.
 * Períodos de um mesmo mês são agrupados:  [21–25, 28]  ->  "21 a 25 e 28".
 * Períodos que cruzam meses mostram o mês:  "20/01 a 31/01".
 */
export function formatarPeriodos(periodos) {
  if (!periodos?.length) return '';
  const partesTxt = periodos.map(({ de, ate }) => {
    if (!ate || ate === de) return pad(partes(de).dia);
    const a = partes(de);
    const b = partes(ate);
    if (a.mes === b.mes && a.ano === b.ano) return `${pad(a.dia)} a ${pad(b.dia)}`;
    return `${formatarCurto(de)} a ${formatarCurto(ate)}`;
  });
  if (partesTxt.length === 1) return partesTxt[0];
  return `${partesTxt.slice(0, -1).join(', ')} e ${partesTxt.at(-1)}`;
}

/** Nome do dia da semana por extenso, ex.: "sábado". */
export const nomeDiaSemana = (dataIso) => DIAS_SEMANA[diaDaSemana(dataIso)];
