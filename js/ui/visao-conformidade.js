/**
 * Visão "Conformidade": o calendário conferido contra a Organização Didática do IFPI
 * (RN 143/2022) e contra a regra de 20 dias por dia da semana em cada semestre.
 *
 *   1. Equilíbrio semanal  – segundas…sextas por semestre; sábados letivos repõem o que falta
 *   2. Mínimos (Art. 26)   – 100 dias por semestre, 200 por ano
 *   3. Itens obrigatórios  – lista do Art. 30 (ou 31/32, conforme a modalidade)
 *   4. Prazos calculados   – envio à PROEN, 15º dia letivo, entrega/devolução de provas
 */
import { h } from '../lib/dom.js';
import { diferencaEmDias, formatarBR, formatarCurto, nomeDiaSemana } from '../core/datas.js';
import { cenariosDeFechamento, equilibrioDoSemestre, indiceDiaUtil } from '../core/equilibrio.js';
import { datasDoEvento } from '../core/eventos.js';

const cartao = (titulo, nota, ...conteudo) => h('section', { class: 'card quadro' },
  h('header', { class: 'quadro__topo' }, h('h2', { class: 'quadro__titulo' }, titulo), nota && h('p', { class: 'quadro__nota' }, nota)),
  conteudo);

// ---------------- 1. equilíbrio semanal ----------------
function tabelaSemestre(eq) {
  const linhas = eq.dias.map((d) => {
    const estado = d.saldo === 0 ? 'ok' : d.saldo < 0 ? 'falta' : 'sobra';
    const perdidos = d.perdidos.length
      ? h('details', { class: 'perdidos' },
        h('summary', {}, `${d.perdidos.length} perdido(s)`),
        h('ul', {}, d.perdidos.map((p) => h('li', {}, `${formatarCurto(p.data)} – ${p.motivo}`))))
      : h('span', { class: 'quadro__nota' }, '—');
    return h('tr', { class: `eq-linha eq-linha--${estado}` },
      h('th', { scope: 'row' }, d.nome),
      h('td', { class: 'num' }, String(d.disponiveis)),
      h('td', { class: 'num' }, d.compensados ? `+ ${d.compensados}` : '+ 0'),
      h('td', { class: 'num' }, h('strong', {}, `${d.total} / ${eq.alvo}`)),
      h('td', {}, h('span', { class: `eq-selo eq-selo--${estado}` }, estado === 'ok' ? '✓ fecha' : estado === 'falta' ? `faltam ${-d.saldo}` : `sobram ${d.saldo}`)),
      h('td', {}, perdidos));
  });
  return h('table', { class: 'tabela-simples eq-tabela' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Dia'), h('th', { class: 'num' }, 'Dias com aula'), h('th', { class: 'num' }, 'Sábados letivos'),
      h('th', { class: 'num' }, 'Total'), h('th', {}, 'Situação'), h('th', {}, 'Dias perdidos'))),
    h('tbody', {}, linhas),
    h('tfoot', {}, h('tr', {}, h('th', { scope: 'row', colspan: 3 }, 'Total do semestre'),
      h('td', { class: 'num' }, `${eq.total} / ${eq.metaTotal}`), h('td', { colspan: 2 }))));
}

function sugestoesSemestre(ctx, eq) {
  const s = eq.sugestoes;
  if (!s) return null;
  const itens = [];

  // sobra em um dia e falta em outro: provavelmente o dia compensado foi digitado errado
  const sobram = eq.dias.filter((d) => d.saldo > 0);
  const faltam = eq.dias.filter((d) => d.saldo < 0 && d.perdidos.length > 0);
  for (const sobra of sobram) {
    const falta = faltam.find((f) => f.saldo < 0);
    const ev = ctx.cal.eventos.find((e) => e.tipo === 'sabado_letivo' && (e.compensa ?? []).some((n) => indiceDiaUtil(n) === sobra.indice)
      && datasDoEvento(e)[0] >= eq.inicio && datasDoEvento(e)[0] <= eq.fim);
    if (!falta || !ev) continue;
    itens.push(h('li', {},
      h('span', {}, h('strong', {}, `Trocar “${sobra.nome}” por “${falta.nome}”`), ` em “${ev.titulo}”: sobra ${sobra.nome} e falta ${falta.nome} (${falta.perdidos.map((p) => formatarCurto(p.data)).join(', ')} perdido).`),
      h('button', { type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.editarEvento(ev.id) }, 'Editar')));
  }

  for (const sab of s.sabados) {
    itens.push(h('li', {},
      h('span', {}, h('strong', {}, `${formatarBR(sab.data).slice(0, 5)} (sáb)`), ` repõe ${sab.compensa}${sab.perdidoEm ? ` ${formatarCurto(sab.perdidoEm)}` : ''} – ${sab.motivo}`),
      h('button', {
        type: 'button', class: 'btn btn--neutro btn--pequeno',
        onclick: () => ctx.acoes.novoEvento(undefined, {
          tipo: 'sabado_letivo', titulo: '', periodos: [{ de: sab.data }], compensa: [sab.compensa], rotuloDialogo: 'sábado letivo',
        }),
      }, 'Registrar')));
  }
  if (s.faltaEstender.length) {
    itens.push(h('li', { class: 'sugestao--aviso' }, h('span', {},
      `Ainda faltariam ${s.faltaEstender.map((f) => `${f.faltam} ${f.nome}`).join(', ')} sem dia perdido para repor: o semestre é curto demais. `,
      s.inicioSugerido ? `Começando em ${formatarBR(s.inicioSugerido)} (${nomeDiaSemana(s.inicioSugerido)}) o balanço fecharia. ` : '',
      s.terminoSugerido ? `Terminando em ${formatarBR(s.terminoSugerido)} também fecharia. ` : '',
      !s.inicioSugerido && !s.terminoSugerido ? 'Não há como fechar sem invadir o semestre vizinho.' : '')));
  }
  // E se o semestre começasse na data da tabela de bimestres (quando ela é anterior)?
  const primeiroBim = ctx.cal.bimestres.filter((b) => b.semestre === eq.semestre).sort((a, b) => a.n - b.n)[0];
  if (primeiroBim && primeiroBim.inicio < eq.inicio) {
    const alt = equilibrioDoSemestre(ctx.cal, ctx.categoriasPorId, { id: eq.semestre, inicio: primeiroBim.inicio, fim: eq.fim });
    itens.push(h('li', {}, h('span', {},
      `Se o semestre começasse em ${formatarBR(primeiroBim.inicio)} (data do 1º bimestre na tabela de bimestres), os totais seriam `,
      h('strong', {}, alt.dias.map((d) => `${d.nome.slice(0, 3)} ${d.total}`).join(' · ')), ` = ${alt.total} dias.`)));
  }
  if (!itens.length) return null;
  return h('div', { class: 'sugestoes' }, h('h3', {}, 'Como fechar'), h('ul', {}, itens));
}

/** Cenários: mantendo o início, quanto estender o término e quantos sábados letivos completam o semestre. */
function cenarios(ctx, eq) {
  const lista = cenariosDeFechamento(ctx.cal, ctx.categoriasPorId, eq);
  const resumoSab = (sabados) => {
    const por = {};
    for (const s of sabados) por[s.compensa] = (por[s.compensa] ?? 0) + 1;
    return Object.entries(por).map(([n, q]) => `${q} ${n}${q > 1 ? 's' : ''}`).join(', ');
  };
  const linhas = lista.map((c, i) => h('tr', { class: c.viavel ? '' : 'cenario--inviavel' },
    h('td', { class: 'nowrap' }, h('strong', {}, formatarBR(c.fim)), h('span', { class: 'quadro__sem' }, i === 0 ? ' atual' : ` +${c.semanas} sem.`)),
    h('td', { class: 'num' }, c.feriasConsumidas ? `${c.feriasConsumidas} dias` : '—'),
    h('td', {}, c.sabados.length
      ? h('details', { class: 'perdidos' },
        h('summary', {}, `${c.sabados.length} (${resumoSab(c.sabados)})`),
        h('ul', {}, c.sabados.map((s) => h('li', {}, `${formatarBR(s.data).slice(0, 5)} repõe ${s.compensa}${s.perdidoEm ? ` ${formatarCurto(s.perdidoEm)}` : ''}`))))
      : '0'),
    h('td', {}, c.viavel
      ? h('span', { class: 'eq-selo eq-selo--ok' }, '✓ fecha')
      : h('span', { class: 'eq-selo eq-selo--falta' }, `faltam ${c.faltaEstender.reduce((t, f) => t + f.faltam, 0)} dias`),
    c.sobras.length > 0 && h('small', { class: 'quadro__nota' }, ` · sobra(m): ${c.sobras.map((o) => `${o.sobram} ${o.nome}`).join(', ')} (dispense sábados desse dia)`))));
  return h('div', { class: 'sugestoes' },
    h('h3', {}, `Cenários mantendo o início em ${formatarBR(eq.inicio)}`),
    h('table', { class: 'tabela-simples' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Término'), h('th', { class: 'num' }, 'Férias consumidas'), h('th', {}, 'Sábados letivos necessários'), h('th', {}, 'Resultado'))),
      h('tbody', {}, linhas)),
    h('p', { class: 'quadro__nota' }, 'Estender o término ocupa dias de férias docentes depois do fim atual; as datas de bimestre, conselho e férias precisam ser movidas junto. Os sábados são sugestões: dias perdidos primeiro, o resto espalhado.'));
}

function quadroEquilibrio(ctx) {
  const alvo = ctx.cal.meta.regras.diasPorDiaDaSemana;
  const semestres = ctx.equilibrio.map((eq) => {
    const fecha = eq.dias.every((d) => d.saldo === 0);
    return h('div', { class: 'eq-semestre' },
      h('h3', { class: 'eq-semestre__titulo' }, `Semestre ${eq.semestre} `,
        h('span', { class: 'quadro__nota' }, `${formatarBR(eq.inicio)} a ${formatarBR(eq.fim)}`),
        h('span', { class: `eq-selo eq-selo--${fecha ? 'ok' : 'falta'}` }, fecha ? '✓ fecha' : 'não fecha')),
      tabelaSemestre(eq),
      eq.semCompensa.length > 0 && h('p', { class: 'alerta alerta--aviso eq-aviso' },
        `${eq.semCompensa.length} evento(s) de sábado letivo sem o dia compensado: ${eq.semCompensa.map((x) => x.titulo).join('; ')}`),
      sugestoesSemestre(ctx, eq),
      !fecha && eq.dias.some((d) => d.saldo < 0) && cenarios(ctx, eq));
  });
  return cartao(`Equilíbrio semanal: ${alvo} de cada dia da semana`,
    `Em cada semestre, segunda, terça, quarta, quinta e sexta devem somar ${alvo} dias com aula (${alvo * 5} dias no total). Quando um feriado, ponto facultativo ou outro motivo tira um dia, um sábado letivo o repõe.`,
    semestres);
}

// ---------------- 2. mínimos ----------------
function quadroMinimos(ctx) {
  const { minimos } = ctx.normas;
  const linha = (rotulo, o) => h('tr', {},
    h('th', { scope: 'row' }, rotulo),
    h('td', { class: 'num' }, String(o.total)),
    h('td', { class: 'num' }, `mín. ${o.minimo}`),
    h('td', {}, h('span', { class: `eq-selo eq-selo--${o.ok ? 'ok' : 'falta'}` }, o.ok ? '✓ atende' : `faltam ${o.minimo - o.total}`)));
  return cartao(`Mínimos de dias letivos (${minimos.artigo})`, 'Não contam os dias reservados a exames finais (Prova Final).',
    h('table', { class: 'tabela-simples' }, h('tbody', {},
      minimos.semestres.map((s) => linha(`Semestre ${s.id}`, s)), linha('Ano letivo', minimos.ano))));
}

// ---------------- 3. itens obrigatórios ----------------
function quadroRequisitos(ctx) {
  const { requisitos } = ctx.normas;
  const pendentes = requisitos.itens.filter((i) => !i.atendido && !i.opcional).length;
  const linhas = requisitos.itens.map((it) => h('li', { class: `req req--${it.atendido ? 'ok' : it.opcional ? 'opcional' : 'falta'}` },
    h('span', { class: 'req__marca', 'aria-hidden': 'true' }, it.atendido ? '✓' : it.opcional ? '–' : '✕'),
    h('div', {},
      h('span', {}, h('b', {}, `${it.n} `), it.texto),
      it.detalhe && h('small', {}, it.detalhe),
      !it.atendido && it.opcional && h('small', {}, 'Sem registro (a norma diz “quando houver”).')),
    it.eventoIds.length > 0 && h('button', {
      type: 'button', class: 'btn btn--neutro btn--pequeno', onclick: () => ctx.acoes.editarEvento(it.eventoIds[0]),
    }, it.eventoIds.length > 1 ? `${it.eventoIds.length} eventos` : 'Ver evento')));
  return cartao(`Itens obrigatórios do calendário (${requisitos.artigo})`,
    `${requisitos.nome}. ${pendentes ? `${pendentes} item(ns) obrigatório(s) sem registro.` : 'Todos os itens obrigatórios têm registro.'} A verificação procura categorias e palavras-chave nos títulos.`,
    h('ul', { class: 'requisitos' }, linhas));
}

// ---------------- 4. prazos ----------------
function quadroPrazos(ctx) {
  const prazos = ctx.normas.prazos;
  if (!prazos.length) return null;
  const linhas = prazos.map((p) => {
    const dias = diferencaEmDias(ctx.hoje, p.data);
    const status = dias < 0 ? `passou há ${-dias} dia(s)` : dias === 0 ? 'hoje' : `em ${dias} dia(s)`;
    return h('tr', { class: dias < 0 ? 'prazo--passou' : '' },
      h('td', { class: 'nowrap' }, h('strong', {}, formatarBR(p.data)), h('span', { class: 'quadro__sem' }, ` ${nomeDiaSemana(p.data).slice(0, 3)}`)),
      h('td', {}, h('span', {}, p.titulo), h('small', { class: 'prazo__det' }, `${p.detalhe} (${p.artigo})`)),
      h('td', { class: 'nowrap quadro__nota' }, status));
  });
  return cartao('Prazos calculados pela norma', 'Datas derivadas do calendário; dias úteis ignoram fins de semana e feriados.',
    h('table', { class: 'tabela-simples' }, h('tbody', {}, linhas)));
}

export function renderVisaoConformidade(ctx) {
  return h('div', { class: 'visao visao--conformidade' },
    quadroEquilibrio(ctx), h('div', { class: 'quadros-grade' }, quadroMinimos(ctx)), quadroRequisitos(ctx), quadroPrazos(ctx));
}
