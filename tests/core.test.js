/**
 * Testes do núcleo (sem DOM). Rodam com `node --test tests/` ou `deno test -A tests/`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { ehDataValida, formatarPeriodos, intervalo, somarDias } from '../js/core/datas.js';
import { feriadosDoAno, pascoa } from '../js/core/feriados.js';
import { calcularDiasLetivos } from '../js/core/diasLetivos.js';
import { validarCalendario } from '../js/core/validacao.js';
import { normalizarCalendario, novoCalendario, validarEstrutura } from '../js/core/modelo.js';
import { cenariosDeFechamento, equilibrioDoCalendario, equilibrioDoSemestre, indiceDiaUtil, sugerirAjustes } from '../js/core/equilibrio.js';
import { avaliarMinimos, avaliarRequisitos, calcularPrazos, somarDiasUteis } from '../js/core/normas.js';
import { categoriasEfetivas, corDeTexto, extrairPersonalizadas, normalizarCor, novoIdCategoria } from '../js/core/categorias.js';
import { gerarCsv, gerarIcs } from '../js/export/arquivos.js';

const ler = async (rel) => JSON.parse(await readFile(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'));
const categorias = new Map((await ler('data/categorias.json')).map((c) => [c.id, c]));
const comemorativas = await ler('data/datas-comemorativas.json');
const requisitos = await ler('data/requisitos-od.json');
// os testes usam uma cópia FIXA (tests/fixtures): o arquivo data/calendario-2027.json é de trabalho e muda a cada edição
const carregarBase = async () => normalizarCalendario({ ...(await ler('tests/fixtures/calendario-2027-referencia.json')), comemorativas });

/** O 2027.1 como era antes de ser estendido até 16/07 (termina 28/06, sem os sábados de quinta, com o sábado de 13/03). */
const carregarAntesDaExtensao = async () => {
  const cal = await carregarBase();
  cal.semestres[0].fim = '2027-06-28';
  cal.eventos = cal.eventos.filter((e) => !['ev094', 'ev095'].includes(e.id));
  cal.eventos.push({ id: 'ant1', tipo: 'sabado_letivo', titulo: 'Sábado letivo (quarta)', periodos: [{ de: '2027-03-13' }], compensa: ['quarta'] });
  cal.eventos.find((e) => e.id === 'ev043').periodos = [{ de: '2027-07-01', ate: '2027-07-31' }];
  return cal;
};

test('datas: validação, intervalos e formatação do rótulo "DIA"', () => {
  assert.equal(ehDataValida('2027-02-29'), false);
  assert.equal(ehDataValida('2028-02-29'), true);
  assert.deepEqual(intervalo('2027-02-27', '2027-03-02'), ['2027-02-27', '2027-02-28', '2027-03-01', '2027-03-02']);
  assert.equal(somarDias('2027-12-31', 1), '2028-01-01');
  assert.equal(formatarPeriodos([{ de: '2027-06-21', ate: '2027-06-25' }, { de: '2027-06-28' }]), '21 a 25 e 28');
  assert.equal(formatarPeriodos([{ de: '2027-12-06', ate: '2027-12-07' }, { de: '2027-12-09', ate: '2027-12-11' }]), '06 a 07 e 09 a 11');
  assert.equal(formatarPeriodos([{ de: '2027-01-20', ate: '2027-02-02' }]), '20/01 a 02/02');
});

test('Páscoa e feriados móveis', () => {
  assert.equal(pascoa(2025), '2025-04-20');
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(pascoa(2027), '2027-03-28');
  assert.equal(pascoa(2028), '2028-04-16');
  const f = feriadosDoAno(2027);
  assert.deepEqual(f.carnaval.datas, ['2027-02-08', '2027-02-09']);
  assert.deepEqual(f.cinzas.datas, ['2027-02-10']);
  assert.deepEqual(f.sexta_santa.datas, ['2027-03-26']);
  assert.deepEqual(f.corpus_christi.datas, ['2027-05-27']);
  assert.deepEqual(feriadosDoAno(2028).carnaval.datas, ['2028-02-28', '2028-02-29']);
});

test('dias letivos de 2027 por mês (2027.1 estendido até 16/07; prova final não conta)', async () => {
  const cal = await carregarBase();
  const { porMes, porSemestre, total } = calcularDiasLetivos(cal, categorias);
  assert.deepEqual(porMes, [0, 0, 22, 22, 21, 23, 12, 22, 23, 20, 22, 13]);
  assert.deepEqual(porSemestre, { '2027.1': 100, '2027.2': 100 });
  assert.equal(total, 200);
});

test('março fecha em 22 dias letivos, como no documento', async () => {
  const cal = await carregarBase();
  assert.equal(calcularDiasLetivos(cal, categorias).porMes[2], 22);
});

test('regras configuráveis: ponto facultativo e sábado de reposição', async () => {
  const cal = await carregarBase();
  const padrao = calcularDiasLetivos(cal, categorias).porMes[4]; // maio
  cal.meta.regras.pontoFacultativoNaoLetivo = false;
  assert.equal(calcularDiasLetivos(cal, categorias).porMes[4], padrao + 2); // Corpus Christi 27 e 28
});

test('validação do calendário 2027: sem erros e com as inconsistências conhecidas', async () => {
  const cal = await carregarBase();
  const problemas = validarCalendario(cal, categorias, comemorativas, { requisitos, hoje: '2026-10-22' });
  const regras = new Set(problemas.map((p) => p.regra));
  assert.equal(problemas.filter((p) => p.nivel === 'erro').length, 0);
  for (const esperado of ['termino-vazio', 'ferias-total', 'requisito-od', 'sem-data']) {
    assert.ok(regras.has(esperado), `regra ${esperado} deveria disparar`);
  }
  for (const resolvido of ['marco-duplicado', 'bimestre-vs-semestre', 'minimo-semestre', 'minimo-ano', 'equilibrio-semanal']) {
    assert.ok(!regras.has(resolvido), `regra ${resolvido} não deveria mais disparar`);
  }
  assert.ok(!regras.has('feriado-divergente'), 'feriados móveis de 2027 estão nas datas certas');
});

test('validação detecta sábado letivo em dia que não é sábado e feriado na data errada', async () => {
  const cal = await carregarBase();
  cal.eventos.push({ id: 'x1', tipo: 'sabado_letivo', titulo: 'Sábado errado', periodos: [{ de: '2027-03-15' }] });
  cal.eventos.find((e) => e.ref === 'tiradentes').periodos = [{ de: '2027-04-22' }];
  const regras = validarCalendario(cal, categorias, comemorativas).filter((p) => p.nivel === 'erro').map((p) => p.regra);
  assert.ok(regras.includes('sabado-nao-sabado'));
  assert.ok(regras.includes('feriado-divergente'));
});

test('novo ano: gera feriados corretos e passa na validação sem erros', () => {
  const cal = novoCalendario({ ano: 2028, campus: 'Teste', instituicao: 'IFPI', titulo: '' }, comemorativas);
  assert.equal(cal.meta.titulo, 'Calendário Acadêmico 2028');
  assert.equal(cal.eventos.find((e) => e.ref === 'natal').periodos[0].de, '2028-12-25');
  assert.equal(validarCalendario(cal, categorias, comemorativas).filter((p) => p.nivel === 'erro').length, 0);
});

test('importação: estrutura inválida é rejeitada com mensagens', () => {
  assert.ok(validarEstrutura(null).length > 0);
  assert.ok(validarEstrutura({ meta: { ano: 2027 }, eventos: [{ titulo: 'x' }] }).length > 0);
  assert.deepEqual(validarEstrutura({ meta: { ano: 2027 }, eventos: [] }), []);
});

test('exportações: ICS (fim exclusivo) e CSV (BOM + ponto e vírgula)', async () => {
  const cal = await carregarBase();
  const nomes = new Map([...categorias].map(([id, c]) => [id, c.nome]));
  const ics = gerarIcs(cal, nomes);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20270426\r\nDTEND;VALUE=DATE:20270427/); // evento de 1 dia termina no dia seguinte
  assert.match(ics, /END:VCALENDAR\r\n$/);
  const csv = gerarCsv(cal, nomes);
  assert.ok(csv.startsWith('﻿"Início";"Fim"'));
});

// ---------------- equilíbrio semanal (20 de cada dia da semana) ----------------

test('equilíbrio semanal: reconhece o nome do dia da semana em vários formatos', () => {
  assert.equal(indiceDiaUtil('terça'), 1);
  assert.equal(indiceDiaUtil('Terça-feira'), 1);
  assert.equal(indiceDiaUtil('SEXTA'), 4);
  assert.equal(indiceDiaUtil('sábado'), -1);
});

test('equilíbrio semanal: 2027.2 fecha 20 de cada dia (sábado de 27/11 repõe a segunda 15/11)', async () => {
  const cal = await carregarBase();
  const eq = equilibrioDoCalendario(cal, categorias).find((e) => e.semestre === '2027.2');
  assert.deepEqual(eq.dias.map((d) => d.total), [20, 20, 20, 20, 20]);
  assert.equal(eq.total, 100);
  // com o dia compensado errado ("terça" em vez de "segunda") falta 1 segunda e sobra 1 terça
  cal.eventos.find((e) => e.id === 'ev077').compensa = ['quinta', 'terça'];
  const errado = equilibrioDoCalendario(cal, categorias).find((e) => e.semestre === '2027.2');
  assert.deepEqual([errado.dias[0].saldo, errado.dias[1].saldo], [-1, 1]);
  const sug = sugerirAjustes(cal, categorias, errado);
  assert.deepEqual(sug.sabados.map((x) => [x.data, x.compensa]), [['2027-12-04', 'segunda']]);
});

test('equilíbrio semanal: 2027.1 estendido até 16/07 com 2 sábados de quinta fecha 20 de cada dia', async () => {
  const cal = await carregarBase();
  const eq = equilibrioDoCalendario(cal, categorias).find((e) => e.semestre === '2027.1');
  assert.deepEqual(eq.dias.map((d) => d.total), [20, 20, 20, 20, 20]);
  assert.equal(eq.total, 100);
});

test('equilíbrio semanal: antes da extensão o 2027.1 não fechava (85 dias) e começar em 03/02 chegava perto', async () => {
  const cal = await carregarAntesDaExtensao();
  const sem = cal.semestres[0];
  const curto = equilibrioDoSemestre(cal, categorias, sem);
  assert.equal(curto.total, 85);
  const fev = equilibrioDoSemestre(cal, categorias, { ...sem, inicio: '2027-02-03' });
  assert.deepEqual(fev.dias.map((d) => d.total), [20, 19, 21, 19, 21]);
});

test('equilíbrio semanal: a meta é configurável e sábado sem dia compensado é apontado', async () => {
  const cal = await carregarAntesDaExtensao();
  cal.meta.regras.diasPorDiaDaSemana = 17;
  assert.ok(equilibrioDoSemestre(cal, categorias, cal.semestres[0]).dias.some((d) => d.saldo === 0));
  cal.eventos.push({ id: 'x2', tipo: 'sabado_letivo', titulo: 'Sábado sem compensa', periodos: [{ de: '2027-04-17' }] });
  const eq = equilibrioDoSemestre(cal, categorias, cal.semestres[0]);
  assert.equal(eq.semCompensa.at(-1).eventoId, 'x2');
});

test('validação aponta o desequilíbrio semanal com sugestão de sábado', async () => {
  const cal = await carregarAntesDaExtensao();
  const p = validarCalendario(cal, categorias, comemorativas, { requisitos });
  const quarta = p.find((x) => x.regra === 'equilibrio-semanal' && x.titulo.includes('2027.1 · quarta'));
  assert.match(quarta.detalhe, /24\/04/); // sábado seguinte ao Tiradentes (21/04)
});

// ---------------- Organização Didática ----------------

test('Art. 26: mínimos de 100 dias por semestre e 200 por ano', async () => {
  const cal = await carregarBase();
  const calculo = calcularDiasLetivos(cal, categorias);
  const m = avaliarMinimos(cal, calculo, requisitos);
  assert.ok(m.semestres.every((s) => s.ok)); // 100 + 100; a prova final não conta
  assert.equal(m.ano.ok, true);
  const antes = await carregarAntesDaExtensao();
  const mAntes = avaliarMinimos(antes, calcularDiasLetivos(antes, categorias), requisitos);
  assert.equal(mAntes.semestres.find((s) => s.id === '2027.1').ok, false);
  assert.equal(mAntes.ano.ok, false);
});

test('Art. 30: itens obrigatórios do técnico integrado', async () => {
  const cal = await carregarBase();
  let itens = avaliarRequisitos(cal, requisitos).itens;
  assert.deepEqual(itens.filter((i) => !i.atendido && !i.opcional).map((i) => i.n), ['IX']); // término do ano vazio
  assert.ok(itens.find((i) => i.n === 'XV').opcional); // recesso: "quando houver"
  cal.meta.termino = '2027-12-21';
  itens = avaliarRequisitos(cal, requisitos).itens;
  assert.equal(itens.filter((i) => !i.atendido && !i.opcional).length, 0);
  cal.eventos = cal.eventos.filter((e) => e.tipo !== 'conselho');
  assert.deepEqual(avaliarRequisitos(cal, requisitos).itens.filter((i) => !i.atendido && !i.opcional).map((i) => i.n), ['XX']);
});

test('prazos: envio à PROEN (90 dias antes), 15º dia letivo e dias úteis das provas', async () => {
  const cal = await carregarBase();
  const prazos = calcularPrazos(cal, calcularDiasLetivos(cal, categorias), requisitos);
  assert.equal(prazos.find((p) => p.id === 'envio-proen').data, '2026-12-01');
  assert.equal(prazos.find((p) => p.id === 'infrequencia-ingressante').data, '2027-03-19'); // 13/03 deixou de ser sábado letivo
  assert.equal(somarDiasUteis('2027-04-12', -7), '2027-04-01');
  assert.equal(somarDiasUteis('2027-04-16', 7, new Set(['2027-04-21'])), '2027-04-28'); // pula fim de semana e Tiradentes
});

test('2027.1 mantendo o início em 01/03: só sábados não fecha; estender o término em julho fecha', async () => {
  const cal = await carregarAntesDaExtensao();
  const eq = equilibrioDoCalendario(cal, categorias).find((e) => e.semestre === '2027.1');
  const c = cenariosDeFechamento(cal, categorias, eq);
  const por = (fim) => c.find((x) => x.fim === fim);
  assert.equal(por('2027-06-28').viavel, false); // faltam 15 dias e só há 12 sábados livres
  assert.equal(por('2027-06-28').sabados.length, 12);
  assert.equal(por('2027-07-09').viavel, true);
  assert.equal(por('2027-07-09').sabados.length, 6);
  assert.equal(por('2027-07-09').feriasConsumidas, 9);
  assert.equal(por('2027-07-16').sabados.length, 2);
  assert.deepEqual(por('2027-07-16').sobras, [{ nome: 'quarta', sobram: 1 }]);
});

// ---------------- categorias e cores personalizadas ----------------

const categoriasBase = await ler('data/categorias.json');

test('cores: texto claro/escuro conforme o contraste e normalização de hexadecimal', () => {
  assert.equal(corDeTexto('#000000'), '#FFFFFF');
  assert.equal(corDeTexto('#FFFF00'), '#1F2933'); // amarelo: texto escuro
  assert.equal(corDeTexto('#0070C0'), '#FFFFFF'); // azul das férias: texto claro
  assert.equal(normalizarCor('#abc'), '#AABBCC');
  assert.equal(normalizarCor('1f7a35'), '#1F7A35');
  assert.equal(normalizarCor('verde'), null);
});

test('categorias: sem personalização vale o padrão; alteração muda só o que foi pedido', () => {
  assert.deepEqual(categoriasEfetivas(categoriasBase), categoriasBase);
  const efetivas = categoriasEfetivas(categoriasBase, [{ id: 'feriado', cor: '#112233' }]);
  const feriado = efetivas.find((c) => c.id === 'feriado');
  assert.equal(feriado.cor, '#112233');
  assert.equal(feriado.texto, '#FFFFFF'); // recalculado pelo contraste
  assert.equal(feriado.nome, 'Feriados'); // o resto continua padrão
  assert.equal(efetivas.find((c) => c.id === 'ferias').cor, '#0070C0');
});

test('categorias: categoria nova entra na lista, na legenda (se pinta o dia) e vira dado do calendário', () => {
  const nova = { id: 'cat_semana_de_provas', nome: 'Semana de provas', cor: '#FFD700', estilo: 'fundo', prioridade: 12, efeitoLetivo: 'nenhum', personalizada: true };
  const efetivas = categoriasEfetivas(categoriasBase, [nova]);
  const c = efetivas.at(-1);
  assert.equal(c.legenda, true);
  assert.equal(c.texto, '#1F2933');
  assert.equal(c.personalizada, true);
  // ida e volta: o que sai do editor é só a diferença
  const editadas = efetivas.map((x) => (x.id === 'recesso' ? { ...x, cor: '#00FFAA' } : x));
  const guardado = extrairPersonalizadas(categoriasBase, editadas);
  assert.deepEqual(guardado.map((g) => g.id), ['recesso', 'cat_semana_de_provas']);
  assert.deepEqual(guardado[0], { id: 'recesso', cor: '#00FFAA' });
  assert.deepEqual(extrairPersonalizadas(categoriasBase, categoriasBase), []);
});

test('categorias: ids únicos para categorias novas e arquivo com cor inválida é rejeitado', () => {
  assert.equal(novoIdCategoria('Semana de Provas', new Set()), 'cat_semana_de_provas');
  assert.equal(novoIdCategoria('Semana de Provas', new Set(['cat_semana_de_provas'])), 'cat_semana_de_provas_2');
  assert.ok(validarEstrutura({ meta: { ano: 2027 }, eventos: [], categorias: [{ id: 'x', cor: 'azulzinho' }] }).length > 0);
  assert.deepEqual(validarEstrutura({ meta: { ano: 2027 }, eventos: [], categorias: [{ id: 'x', cor: '#123456' }] }), []);
});

test('categorias personalizadas passam para o calendário de um ano novo e uma nova categoria pode bloquear dias', async () => {
  const personalizadas = [{ id: 'feriado', cor: '#112233' }];
  assert.deepEqual(novoCalendario({ ano: 2028, campus: 'X', instituicao: 'Y', titulo: '' }, [], personalizadas).categorias, personalizadas);
  const cal = await carregarBase();
  const efetivas = categoriasEfetivas(categoriasBase, [{ id: 'cat_sem_aula', nome: 'Sem aula', cor: '#999999', estilo: 'fundo', prioridade: 11, efeitoLetivo: 'bloqueia', personalizada: true }]);
  const porId = new Map(efetivas.map((c) => [c.id, c]));
  const antes = calcularDiasLetivos(cal, porId).porMes[3];
  cal.eventos.push({ id: 'z1', tipo: 'cat_sem_aula', titulo: 'Semana sem aula', periodos: [{ de: '2027-04-05', ate: '2027-04-09' }] });
  assert.equal(calcularDiasLetivos(cal, porId).porMes[3], antes - 5);
});
