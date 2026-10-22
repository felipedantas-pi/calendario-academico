/**
 * Normas da Organização Didática do IFPI (RN 143/2022) aplicadas ao calendário.
 * As regras numéricas e a lista de itens obrigatórios vêm de data/requisitos-od.json,
 * para que mudanças na norma sejam mudanças de dados, não de código.
 *
 * Funções puras, sem DOM.
 */
import { comparar, ehFimDeSemana, somarDias } from './datas.js';
import { datasDoEvento, normalizar } from './eventos.js';

export const MODALIDADE_PADRAO = 'tecnico_integrado';

/** Art. 26: mínimos de dias de trabalho acadêmico efetivo (exames finais não contam). */
export function avaliarMinimos(cal, calculo, requisitos) {
  const { diasAno, diasSemestre, artigo } = requisitos.minimos;
  const semestres = (cal.semestres ?? []).map((s) => {
    const total = calculo.porSemestre[s.id] ?? 0;
    return { id: s.id, total, minimo: diasSemestre, ok: total >= diasSemestre };
  });
  return { artigo, ano: { total: calculo.total, minimo: diasAno, ok: calculo.total >= diasAno }, semestres };
}

/**
 * Confere os itens que a norma exige no calendário da modalidade (ex.: Art. 30).
 * @returns {{ artigo: string, nome: string, itens: Array<{ n, texto, opcional, atendido, eventoIds, detalhe }> }}
 */
export function avaliarRequisitos(cal, requisitos) {
  const modalidade = requisitos.modalidades[cal.meta.modalidade ?? MODALIDADE_PADRAO]
    ?? requisitos.modalidades[MODALIDADE_PADRAO];
  const comData = cal.eventos.filter((e) => datasDoEvento(e).length > 0);
  const marcos = new Map();
  for (const ev of comData) for (const m of ev.marcos ?? []) marcos.set(m, [...(marcos.get(m) ?? []), ev.id]);

  const itens = modalidade.itens.map((item) => {
    const v = item.verifica ?? {};
    let atendido = false;
    let eventoIds = [];
    let detalhe = null;

    if (v.especial === 'automatico') {
      atendido = true; // dias letivos e contagem mensal são calculados pelo sistema
    } else if (v.especial === 'ano') {
      atendido = !!(cal.meta.inicio && cal.meta.termino);
      if (!atendido) detalhe = `Falta preencher o ${cal.meta.inicio ? 'término' : 'início'} do ano letivo (Configurações).`;
    } else if (v.especial === 'periodos') {
      const faltando = [];
      for (const s of cal.semestres ?? []) {
        for (const m of [`inicio_semestre:${s.id}`, `termino_semestre:${s.id}`]) if (!marcos.has(m)) faltando.push(m);
      }
      for (const b of cal.bimestres ?? []) {
        for (const m of [`inicio_bimestre:${b.n}`, `termino_bimestre:${b.n}`]) if (!marcos.has(m)) faltando.push(m);
      }
      atendido = faltando.length === 0 && (cal.semestres?.length ?? 0) > 0;
      if (!atendido) detalhe = faltando.length ? `Sem evento datado para: ${faltando.join(', ')}.` : 'Nenhum semestre cadastrado.';
    } else if (v.especial === 'prazos_notas') {
      const achados = comData.filter((e) => /prazo.*(digita|nota)|lancamento de notas/.test(normalizar(e.titulo)));
      eventoIds = achados.map((e) => e.id);
      const precisa = cal.bimestres?.length ?? 1;
      atendido = achados.length >= precisa;
      if (!atendido) detalhe = `Encontrado(s) ${achados.length} prazo(s); a norma pede um por bimestre (${precisa}).`;
    } else {
      const re = v.titulo ? new RegExp(v.titulo) : null;
      const achados = comData.filter((e) => v.tipos?.includes(e.tipo) || (re && re.test(normalizar(e.titulo))));
      eventoIds = achados.map((e) => e.id);
      atendido = achados.length > 0;
    }
    return { n: item.n, texto: item.texto, opcional: !!item.opcional, atendido, eventoIds, detalhe };
  });
  return { artigo: modalidade.artigo, nome: modalidade.nome, itens };
}

// ---------------- prazos derivados ----------------

/** Soma (ou subtrai, se n < 0) dias úteis, pulando fins de semana e as datas em `pulos`. */
export function somarDiasUteis(dataIso, n, pulos = new Set()) {
  const passo = n < 0 ? -1 : 1;
  let data = dataIso;
  let restantes = Math.abs(n);
  while (restantes > 0) {
    data = somarDias(data, passo);
    if (!ehFimDeSemana(data) && !pulos.has(data)) restantes -= 1;
  }
  return data;
}

/**
 * Prazos que a norma manda calcular a partir das datas do calendário.
 * @returns {Array<{ id: string, artigo: string, titulo: string, data: string, detalhe: string }>}
 */
export function calcularPrazos(cal, calculo, requisitos) {
  const prazos = [];
  const feriados = new Set(cal.eventos.filter((e) => e.tipo === 'feriado').flatMap(datasDoEvento));
  const inicio = cal.meta.inicio ?? [...(cal.semestres ?? [])].map((s) => s.inicio).sort(comparar)[0];

  if (inicio) {
    const { diasAntesDoInicio, analiseDiasUteis, artigo } = requisitos.envioProen;
    const envio = somarDias(inicio, -diasAntesDoInicio);
    prazos.push({
      id: 'envio-proen', artigo, data: envio,
      titulo: 'Último dia para enviar a proposta à Pró-Reitoria de Ensino',
      detalhe: `${diasAntesDoInicio} dias antes do início do período letivo. A PROEN analisa em até ${analiseDiasUteis} dias úteis (até ${somarDiasUteis(envio, analiseDiasUteis, feriados).split('-').reverse().join('/')} se enviado nesse dia); o período só começa após aprovação do Conselho Superior.`,
    });

    const { diasLetivos, artigo: artInfreq } = requisitos.infrequencia;
    const letivos = [...calculo.letivos].filter((d) => d >= inicio).sort(comparar);
    if (letivos.length >= diasLetivos) {
      prazos.push({
        id: 'infrequencia-ingressante', artigo: artInfreq, data: letivos[diasLetivos - 1],
        titulo: `${diasLetivos}º dia letivo: fim do prazo de infrequência do ingressante`,
        detalhe: 'Ingressante que não comparecer nos primeiros 15 dias letivos, sem justificativa, tem a matrícula cancelada.',
      });
    }
  }

  const { diasUteis, artigo: artAv } = requisitos.prazosAvaliacao;
  for (const ev of cal.eventos) {
    const periodo = ev.tipo === 'avaliacao' && /periodo de avalia/.test(normalizar(ev.titulo));
    const datas = datasDoEvento(ev);
    if (!periodo || !datas.length) continue;
    prazos.push({
      id: `originais-${ev.id}`, artigo: artAv, data: somarDiasUteis(datas[0], -diasUteis, feriados),
      titulo: `Entrega dos originais à Coordenação – ${ev.titulo}`,
      detalhe: `${diasUteis} dias úteis antes da aplicação (${datas[0].split('-').reverse().join('/')}).`,
    });
    prazos.push({
      id: `devolucao-${ev.id}`, artigo: artAv, data: somarDiasUteis(datas.at(-1), diasUteis, feriados),
      titulo: `Devolução das provas corrigidas – ${ev.titulo}`,
      detalhe: `Até ${diasUteis} dias úteis após a realização (${datas.at(-1).split('-').reverse().join('/')}).`,
    });
  }
  return prazos.sort((a, b) => comparar(a.data, b.data));
}
