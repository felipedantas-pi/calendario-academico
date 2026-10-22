#!/usr/bin/env node
/**
 * Valida um arquivo de calendário usando o MESMO núcleo da interface web.
 *
 *   node scripts/validar.mjs                        # valida data/calendario-2027.json
 *   node scripts/validar.mjs data/outro.json        # valida outro arquivo
 *   node scripts/validar.mjs --estrito              # falha (exit 1) se houver avisos
 *
 * Por padrão só erros quebram o comando; avisos e observações são apenas listados,
 * pois o calendário pode estar "em elaboração".
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCalendario, resumirProblemas } from '../js/core/validacao.js';
import { calcularDiasLetivos } from '../js/core/diasLetivos.js';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const estrito = args.includes('--estrito');
const arquivo = args.find((a) => !a.startsWith('--')) ?? 'data/calendario-2027.json';

const ler = async (caminho) => JSON.parse(await readFile(resolve(raiz, caminho), 'utf8'));
const cal = await ler(arquivo);
const categorias = new Map((await ler('data/categorias.json')).map((c) => [c.id, c]));
const comemorativas = await ler('data/datas-comemorativas.json');

const requisitos = await ler('data/requisitos-od.json');
const hoje = new Date().toISOString().slice(0, 10);
const problemas = validarCalendario(cal, categorias, comemorativas, { requisitos, hoje });
const resumo = resumirProblemas(problemas);
const calculo = calcularDiasLetivos(cal, categorias);

const icone = { erro: '✖', aviso: '▲', info: 'ℹ' };
console.log(`\n${cal.meta.titulo} – campus ${cal.meta.campus}\n${'─'.repeat(60)}`);
for (const p of problemas) console.log(`${icone[p.nivel]} [${p.regra}] ${p.titulo}\n    ${p.detalhe}`);
console.log(`${'─'.repeat(60)}\nDias letivos calculados por mês: ${calculo.porMes.join(' ')}`);
console.log(`Por semestre: ${Object.entries(calculo.porSemestre).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`Resumo: ${resumo.erro} erro(s), ${resumo.aviso} aviso(s), ${resumo.info} observação(ões)\n`);

process.exit(resumo.erro > 0 || (estrito && resumo.aviso > 0) ? 1 : 0);
