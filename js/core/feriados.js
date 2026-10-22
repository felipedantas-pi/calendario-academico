/**
 * Feriados e pontos facultativos de referência para um ano.
 *
 * É a parte "móvel" do calendário: Carnaval, Sexta-feira Santa, Páscoa e
 * Corpus Christi dependem da data da Páscoa e mudam todo ano; os demais são fixos.
 * O módulo é usado (1) para gerar a base de um ano novo e (2) para conferir se
 * os eventos digitados à mão (campo `ref`) caem na data certa.
 */
import { iso, somarDias } from './datas.js';

/**
 * Domingo de Páscoa – algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
 * @returns {string} data ISO
 */
export function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(ano, mes, dia);
}

/**
 * Tabela de referência: chave -> { titulo, tipo, datas[] }.
 * A chave é a mesma usada no campo `ref` dos eventos.
 */
export function feriadosDoAno(ano) {
  const p = pascoa(ano);
  return {
    confraternizacao: { titulo: 'Confraternização Universal – feriado nacional', tipo: 'feriado', datas: [iso(ano, 1, 1)] },
    carnaval: { titulo: 'Carnaval (ponto facultativo)', tipo: 'ponto_facultativo', datas: [somarDias(p, -48), somarDias(p, -47)] },
    cinzas: { titulo: 'Quarta-feira de Cinzas (ponto facultativo até às 14h)', tipo: 'ponto_facultativo', datas: [somarDias(p, -46)] },
    sexta_santa: { titulo: 'Paixão de Cristo / Sexta-feira Santa – feriado nacional', tipo: 'feriado', datas: [somarDias(p, -2)] },
    pascoa: { titulo: 'Páscoa', tipo: 'comemorativo', datas: [p] },
    tiradentes: { titulo: 'Tiradentes – feriado nacional', tipo: 'feriado', datas: [iso(ano, 4, 21)] },
    trabalho: { titulo: 'Dia Mundial do Trabalho – feriado nacional', tipo: 'feriado', datas: [iso(ano, 5, 1)] },
    corpus_christi: { titulo: 'Corpus Christi (ponto facultativo)', tipo: 'ponto_facultativo', datas: [somarDias(p, 60)] },
    independencia: { titulo: 'Independência do Brasil – feriado nacional', tipo: 'feriado', datas: [iso(ano, 9, 7)] },
    aparecida: { titulo: 'Nossa Senhora Aparecida – feriado nacional', tipo: 'feriado', datas: [iso(ano, 10, 12)] },
    piaui: { titulo: 'Dia do Piauí – feriado estadual', tipo: 'feriado', datas: [iso(ano, 10, 19)] },
    servidor: { titulo: 'Dia do Servidor Público – ponto facultativo', tipo: 'ponto_facultativo', datas: [iso(ano, 10, 28)] },
    finados: { titulo: 'Finados – feriado nacional', tipo: 'feriado', datas: [iso(ano, 11, 2)] },
    republica: { titulo: 'Proclamação da República – feriado nacional', tipo: 'feriado', datas: [iso(ano, 11, 15)] },
    consciencia_negra: { titulo: 'Dia Nacional da Consciência Negra – feriado nacional', tipo: 'feriado', datas: [iso(ano, 11, 20)] },
    natal: { titulo: 'Natal – feriado nacional', tipo: 'feriado', datas: [iso(ano, 12, 25)] },
  };
}
