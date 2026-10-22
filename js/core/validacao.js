/**
 * Validação do calendário – funções puras, sem DOM (roda no navegador e no Node).
 *
 * No documento Word nada confere nada: a mesma informação é digitada em até três
 * lugares (calendário colorido, tabela de eventos, tabela de feriados). Aqui cada
 * regra cruza esses dados e devolve uma lista de problemas para revisão.
 *
 * Cada problema: { nivel: 'erro'|'aviso'|'info', regra, titulo, detalhe, eventoId?, data? }
 */
import {
  comparar, ehDataValida, ehFimDeSemana, formatarBR, formatarCurto, nomeDiaSemana, partes,
} from './datas.js';
import { datasDoEvento, indexarPorDia } from './eventos.js';
import { feriadosDoAno } from './feriados.js';
import { calcularDiasLetivos } from './diasLetivos.js';
import { descreverPerda, equilibrioDoCalendario, sugerirAjustes } from './equilibrio.js';
import { avaliarMinimos, avaliarRequisitos, calcularPrazos } from './normas.js';

const ORDEM_NIVEL = { erro: 0, aviso: 1, info: 2 };

/**
 * @param {object} cal
 * @param {Map<string, object>} categoriasPorId
 * @param {Array} [comemorativas]
 * @param {{ requisitos?: object, hoje?: string }} [opcoes]
 *   `requisitos` = data/requisitos-od.json (liga as regras da Organização Didática);
 *   `hoje` = data ISO usada para dizer se um prazo já passou.
 */
export function validarCalendario(cal, categoriasPorId, comemorativas = [], { requisitos, hoje } = {}) {
  const problemas = [];
  const add = (nivel, regra, titulo, detalhe, extra = {}) =>
    problemas.push({ nivel, regra, titulo, detalhe, ...extra });

  const { meta, eventos } = cal;
  const calculo = calcularDiasLetivos(cal, categoriasPorId);
  const porDia = indexarPorDia(eventos);
  const refs = feriadosDoAno(meta.ano);
  const rot = (ev) => `“${ev.titulo}”`;

  for (const ev of eventos) {
    const datas = datasDoEvento(ev);

    if (!ev.titulo?.trim()) add('erro', 'titulo-vazio', 'Evento sem título', 'Preencha o título do evento.', { eventoId: ev.id });

    // --- datas ---
    for (const p of ev.periodos ?? []) {
      if (!ehDataValida(p.de) || (p.ate && !ehDataValida(p.ate))) {
        add('erro', 'data-invalida', 'Data inválida', `${rot(ev)} possui uma data que não existe no calendário.`, { eventoId: ev.id });
      } else if (p.ate && p.ate < p.de) {
        add('erro', 'periodo-invertido', 'Período invertido', `${rot(ev)}: o fim (${formatarBR(p.ate)}) vem antes do início (${formatarBR(p.de)}).`, { eventoId: ev.id });
      }
    }
    if (!datas.length) {
      add('aviso', 'sem-data', 'Evento sem data',
        `${rot(ev)} não tem data${ev.diaOriginal ? ` (no documento: “${ev.diaOriginal}”)` : ''} e por isso não aparece no calendário.`,
        { eventoId: ev.id });
    }
    const fora = datas.find((d) => partes(d).ano !== meta.ano);
    if (fora) add('aviso', 'fora-do-ano', 'Data fora do ano letivo', `${rot(ev)} tem data em ${partes(fora).ano}, mas o calendário é de ${meta.ano}.`, { eventoId: ev.id, data: fora });

    // --- sábados letivos / reposição ---
    if (ev.tipo === 'sabado_letivo' || ev.tipo === 'sabado_reposicao') {
      for (const d of datas.filter((x) => nomeDiaSemana(x) !== 'sábado')) {
        add('erro', 'sabado-nao-sabado', 'Sábado que não é sábado',
          `${rot(ev)} em ${formatarBR(d)}, que é ${nomeDiaSemana(d)}.`, { eventoId: ev.id, data: d });
      }
      for (const d of datas) {
        const outros = (porDia.get(d) ?? []).filter((e) => e.tipo === 'feriado');
        if (outros.length) add('erro', 'sabado-em-feriado', 'Sábado letivo em feriado', `${rot(ev)} em ${formatarBR(d)} coincide com ${rot(outros[0])}.`, { eventoId: ev.id, data: d });
      }
    }
    if (ev.tipo === 'sabado_letivo' && ev.compensa?.length && datas.length && datas.length !== ev.compensa.length) {
      add('aviso', 'compensa-quantidade', 'Sábados letivos × dias compensados',
        `${rot(ev)} lista ${datas.length} sábado(s), mas compensa ${ev.compensa.length} dia(s): ${ev.compensa.join(', ')}.`, { eventoId: ev.id });
    }

    // --- feriados móveis/fixos conferidos pela data oficial ---
    if (ev.ref && refs[ev.ref]) {
      const faltando = refs[ev.ref].datas.filter((d) => !datas.includes(d));
      if (faltando.length && datas.length) {
        add('erro', 'feriado-divergente', 'Feriado fora da data oficial',
          `${rot(ev)} deveria incluir ${faltando.map((d) => `${formatarCurto(d)} (${nomeDiaSemana(d)})`).join(' e ')} em ${meta.ano}.`,
          { eventoId: ev.id, data: faltando[0] });
      }
    }
    if (['feriado', 'ponto_facultativo'].includes(ev.tipo)) {
      const fds = datas.filter(ehFimDeSemana);
      if (fds.length && fds.length === datas.length) {
        add('info', 'feriado-fim-de-semana', 'Feriado em fim de semana',
          `${rot(ev)} cai em ${nomeDiaSemana(fds[0])} (${formatarBR(fds[0])}) e não altera os dias letivos.`, { eventoId: ev.id, data: fds[0] });
      }
    }

    // --- avaliações precisam começar e terminar em dias letivos (feriados no meio do período são normais) ---
    // (a prova final fica de fora: por norma, o tempo dos exames finais não é dia letivo)
    if (ev.tipo === 'avaliacao') {
      const pontas = (ev.periodos ?? []).flatMap((p) => [p.de, p.ate ?? p.de]).filter(ehDataValida);
      const naoLetivo = [...new Set(pontas)].filter((d) => !calculo.letivos.has(d)).sort(comparar);
      if (naoLetivo.length) {
        add('aviso', 'avaliacao-dia-nao-letivo', 'Avaliação em dia não letivo',
          `${rot(ev)}: ${naoLetivo.map(formatarCurto).join(', ')} não é dia letivo.`, { eventoId: ev.id, data: naoLetivo[0] });
      }
    }

    if (ev.pendencia) add('info', 'nota-do-documento', 'Observação do documento original', `${rot(ev)} — ${ev.pendencia}`, { eventoId: ev.id });
  }

  // --- marcos duplicados e coerência com semestres/bimestres ---
  const porMarco = new Map();
  for (const ev of eventos) for (const m of ev.marcos ?? []) {
    if (!porMarco.has(m)) porMarco.set(m, []);
    porMarco.get(m).push(ev);
  }
  const descreverMarco = (tipo, alvo) => ({
    inicio_semestre: `Início do semestre ${alvo}`,
    termino_semestre: `Término do semestre ${alvo}`,
    inicio_bimestre: `Início do ${alvo}º bimestre`,
    termino_bimestre: `Término do ${alvo}º bimestre`,
    termino_ano: 'Término do ano letivo',
  }[tipo] ?? tipo);
  for (const [marco, lista] of porMarco) {
    if (lista.length > 1) {
      const [tipo, alvo] = marco.split(':');
      const datasLista = lista.map((e) => datasDoEvento(e)[0]).map((d) => (d ? formatarBR(d) : 'sem data'));
      add('aviso', 'marco-duplicado', `${descreverMarco(tipo, alvo)} aparece ${lista.length}×`,
        `Datas informadas: ${datasLista.join(' e ')}. Mantenha apenas uma.`, { eventoId: lista[0].id });
    }
  }
  const dataDoMarco = (marco) => {
    const ev = (porMarco.get(marco) ?? []).find((e) => datasDoEvento(e).length);
    return ev ? { ev, data: datasDoEvento(ev)[0] } : null;
  };
  for (const s of cal.semestres ?? []) {
    for (const [tipo, campo] of [['inicio_semestre', 'inicio'], ['termino_semestre', 'fim']]) {
      const m = dataDoMarco(`${tipo}:${s.id}`);
      if (m && m.data !== s[campo]) {
        add('aviso', 'marco-vs-semestre', `${descreverMarco(tipo, s.id)} diverge`,
          `O evento marca ${formatarBR(m.data)}, mas o semestre está configurado com ${formatarBR(s[campo])}.`, { eventoId: m.ev.id });
      }
    }
  }
  for (const b of cal.bimestres ?? []) {
    for (const [tipo, campo] of [['inicio_bimestre', 'inicio'], ['termino_bimestre', 'fim']]) {
      const m = dataDoMarco(`${tipo}:${b.n}`);
      if (m && m.data !== b[campo]) {
        add('aviso', 'marco-vs-bimestre', `${descreverMarco(tipo, b.n)} diverge`,
          `O evento marca ${formatarBR(m.data)}, mas a tabela de bimestres diz ${formatarBR(b[campo])}.`, { eventoId: m.ev.id });
      }
    }
    const sem = (cal.semestres ?? []).find((s) => s.id === b.semestre);
    const primeiro = (cal.bimestres ?? []).filter((x) => x.semestre === b.semestre).sort((x, y) => x.n - y.n)[0];
    if (sem && primeiro?.n === b.n && b.inicio !== sem.inicio) {
      add('aviso', 'bimestre-vs-semestre', `${b.n}º bimestre começa antes do semestre`,
        `O ${b.n}º bimestre começa em ${formatarBR(b.inicio)}, mas o semestre ${sem.id} começa em ${formatarBR(sem.inicio)}.`);
    }
  }

  // --- cabeçalho ---
  const primeiroSem = [...(cal.semestres ?? [])].sort((a, b) => comparar(a.inicio, b.inicio))[0];
  if (primeiroSem && meta.inicio && meta.inicio !== primeiroSem.inicio) {
    add('aviso', 'inicio-divergente', 'Início do ano letivo diverge', `O cabeçalho diz ${formatarBR(meta.inicio)}, mas o 1º semestre começa em ${formatarBR(primeiroSem.inicio)}.`);
  }
  if (!meta.termino) {
    const fimAno = dataDoMarco('termino_ano')?.data ?? [...(cal.semestres ?? [])].map((s) => s.fim).sort(comparar).at(-1);
    add('aviso', 'termino-vazio', 'Término do ano letivo não preenchido',
      `No documento o campo está “${meta.terminoOriginal ?? 'vazio'}”.${fimAno ? ` Sugestão: ${formatarBR(fimAno)}.` : ''}`);
  }

  // --- contagem de dias letivos informada × calculada ---
  const inf = meta.informado ?? {};
  for (const [id, valor] of Object.entries(inf.diasLetivosSemestre ?? {})) {
    const calc = calculo.porSemestre[id];
    if (calc !== undefined && calc !== valor) {
      add('aviso', 'dias-letivos-semestre', `Dias letivos do semestre ${id}`, `Informado no cabeçalho: ${valor} · calculado pelo calendário: ${calc}.`);
    }
  }
  (inf.diasLetivosMes ?? []).forEach((valor, i) => {
    if (valor !== calculo.porMes[i]) {
      add('aviso', 'dias-letivos-mes', `Dias letivos de ${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][i]}`,
        `Informado na tabela: ${valor} · calculado pelo calendário: ${calculo.porMes[i]}.`);
    }
  });

  // --- férias ---
  if (inf.feriasDias != null) {
    const dias = new Set(eventos.filter((e) => e.tipo === 'ferias').flatMap(datasDoEvento)).size;
    if (dias !== inf.feriasDias) add('aviso', 'ferias-total', 'Total de dias de férias', `Informado: ${inf.feriasDias} · somado dos eventos: ${dias}.`);
  }

  // --- referências a outro campus ---
  const campus = (meta.campus ?? '').toLowerCase();
  for (const termo of meta.referenciasSuspeitas ?? []) {
    if (termo.toLowerCase() === campus) continue;
    const re = new RegExp(`\\b${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const achados = [
      ...eventos.filter((e) => re.test(e.titulo)).map((e) => ({ texto: e.titulo, eventoId: e.id })),
      ...comemorativas.filter((c) => re.test(c.titulo)).map((c) => ({ texto: `${c.titulo} (${String(c.dia).padStart(2, '0')}/${String(c.mes).padStart(2, '0')})` })),
    ];
    for (const a of achados) {
      add('aviso', 'referencia-suspeita', `Menciona “${termo}”`, `“${a.texto}” cita “${termo}”, mas o campus configurado é ${meta.campus}. Pode ser resto de outro calendário.`, { eventoId: a.eventoId });
    }
  }

  // --- sábado letivo e reposição no mesmo dia ---
  for (const [d, lista] of porDia) {
    const tipos = lista.map((e) => e.tipo);
    if (tipos.includes('sabado_letivo') && tipos.includes('sabado_reposicao')) {
      add('info', 'sabado-duplicado', 'Sábado letivo e de reposição no mesmo dia',
        `${formatarBR(d)} está marcado como sábado letivo e como sábado de reposição. O calendário mostra uma cor só; confirme se é intencional.`,
        { data: d, eventoId: lista.find((e) => e.tipo === 'sabado_reposicao').id });
    }
  }

  // --- equilíbrio semanal: cada dia da semana deve somar o mesmo nº de dias no semestre (padrão 20) ---
  for (const eq of equilibrioDoCalendario(cal, categoriasPorId)) {
    const sugestoes = sugerirAjustes(cal, categoriasPorId, eq);
    for (const d of eq.dias.filter((x) => x.saldo !== 0)) {
      const falta = d.saldo < 0;
      const sab = sugestoes.sabados.filter((s) => s.compensa === d.nome);
      const perdas = d.perdidos.slice(0, 3).map(descreverPerda).join('; ');
      add('aviso', 'equilibrio-semanal',
        `${eq.semestre} · ${d.nome}: ${d.total} de ${eq.alvo} dias`,
        falta
          ? `Faltam ${-d.saldo} ${d.nome}(s) (${d.disponiveis} dias disponíveis + ${d.compensados} sábado(s) letivo(s)).${perdas ? ` Dias perdidos: ${perdas}.` : ''}${sab.length ? ` Sugestão: sábado letivo em ${sab.map((s) => formatarBR(s.data).slice(0, 5)).join(', ')}.` : ''}`
          : `Sobram ${d.saldo} ${d.nome}(s): há mais sábados letivos compensando ${d.nome} do que dias perdidos. Confira o dia da semana informado em “compensa”.`,
        { regra: 'equilibrio-semanal', semestre: eq.semestre });
    }
    for (const sc of eq.semCompensa) {
      add('aviso', 'sabado-sem-compensa', 'Sábado letivo sem dia compensado',
        `“${sc.titulo}” tem ${sc.faltam} sábado(s) sem o dia da semana que repõe (campo “compensa”); não entra no equilíbrio semanal.`, { eventoId: sc.eventoId });
    }
    for (const inv of eq.nomesInvalidos) {
      add('erro', 'compensa-invalido', 'Dia compensado não reconhecido', `“${inv.nome}” não é segunda, terça, quarta, quinta ou sexta.`, { eventoId: inv.eventoId });
    }
  }

  // --- Organização Didática ---
  if (requisitos) {
    const mins = avaliarMinimos(cal, calculo, requisitos);
    for (const s of mins.semestres.filter((x) => !x.ok)) {
      add('aviso', 'minimo-semestre', `Semestre ${s.id} abaixo do mínimo`, `${s.total} dias letivos; o ${mins.artigo} exige no mínimo ${s.minimo} por semestre (sem contar os exames finais).`);
    }
    if (!mins.ano.ok) add('aviso', 'minimo-ano', 'Ano letivo abaixo do mínimo', `${mins.ano.total} dias letivos; o ${mins.artigo} exige no mínimo ${mins.ano.minimo}.`);

    // Art. 26: sem interrupção do bimestre ou do semestre
    for (const ev of eventos.filter((e) => ['ferias', 'recesso'].includes(e.tipo))) {
      const dentro = datasDoEvento(ev).find((d) => (cal.semestres ?? []).some((s) => d >= s.inicio && d <= s.fim));
      if (dentro) add('aviso', 'interrupcao-periodo', 'Interrupção de semestre', `“${ev.titulo}” em ${formatarBR(dentro)} cai dentro de um semestre letivo (${mins.artigo}: sem interrupção do bimestre ou semestre).`, { eventoId: ev.id, data: dentro });
    }

    const conf = avaliarRequisitos(cal, requisitos);
    for (const it of conf.itens.filter((x) => !x.atendido)) {
      add(it.opcional ? 'info' : 'aviso', 'requisito-od', `${conf.artigo} · ${it.n}: ${it.texto}`,
        it.detalhe ?? (it.opcional ? 'Nenhum registro (a norma diz “quando houver”).' : 'Item obrigatório sem nenhum evento no calendário.'));
    }

    const envio = calcularPrazos(cal, calculo, requisitos).find((p) => p.id === 'envio-proen');
    if (envio && hoje) {
      add(envio.data < hoje ? 'aviso' : 'info', 'prazo-proen', envio.data < hoje ? 'Prazo de envio à PROEN já passou' : 'Prazo de envio à PROEN',
        `${envio.titulo}: ${formatarBR(envio.data)}. ${envio.detalhe}`);
    }
  }

  return problemas.sort((a, b) => ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel]);
}

/** Contagem por nível, para os selos da interface. */
export function resumirProblemas(problemas) {
  return problemas.reduce((acc, p) => ({ ...acc, [p.nivel]: (acc[p.nivel] ?? 0) + 1 }), { erro: 0, aviso: 0, info: 0 });
}
