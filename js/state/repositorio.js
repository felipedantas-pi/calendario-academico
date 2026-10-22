/**
 * Persistência: arquivos de dados do projeto (data/*.json), rascunho local e importação.
 *
 * O rascunho fica no localStorage do navegador (por ano) – nada é enviado a servidor.
 * Para compartilhar o calendário, use Exportar → JSON e versione o arquivo no GitHub.
 */
import { normalizarCalendario, validarEstrutura } from '../core/modelo.js';

const CHAVE_RASCUNHO = (ano) => `calendario-academico:rascunho:${ano}`;
const CHAVE_ANO = 'calendario-academico:ano-atual';

/** Lê um JSON do projeto. Caminhos são relativos à página (funciona em subpasta do GitHub Pages). */
async function lerJson(caminho) {
  const resp = await fetch(new URL(caminho, document.baseURI));
  if (!resp.ok) throw new Error(`Não foi possível carregar ${caminho} (HTTP ${resp.status}).`);
  return resp.json();
}

/** Dados fixos da instituição: categorias/legenda, datas comemorativas e normas da Organização Didática. */
export async function carregarReferencias() {
  const [categorias, comemorativas, requisitos] = await Promise.all([
    lerJson('data/categorias.json'),
    lerJson('data/datas-comemorativas.json'),
    lerJson('data/requisitos-od.json'),
  ]);
  return { categorias, comemorativas, requisitos };
}

/** Calendário original do projeto (sem alterações locais). */
export async function carregarCalendarioBase(arquivo, comemorativas) {
  const bruto = await lerJson(arquivo);
  bruto.comemorativas ??= comemorativas;
  return normalizarCalendario(bruto);
}

// --- rascunho local (localStorage pode falhar em modo privado, por isso o try/catch) ---

export function lerRascunho(ano) {
  try {
    const txt = localStorage.getItem(CHAVE_RASCUNHO(ano));
    if (!txt) return null;
    const obj = JSON.parse(txt);
    return validarEstrutura(obj).length ? null : normalizarCalendario(obj);
  } catch {
    return null;
  }
}

export function salvarRascunho(cal) {
  try {
    localStorage.setItem(CHAVE_RASCUNHO(cal.meta.ano), JSON.stringify(cal));
    localStorage.setItem(CHAVE_ANO, String(cal.meta.ano));
    return true;
  } catch {
    return false;
  }
}

export function apagarRascunho(ano) {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO(ano));
  } catch { /* sem armazenamento disponível: nada a apagar */ }
}

/** Anos que possuem rascunho salvo neste navegador (ordem crescente). */
export function listarAnosSalvos() {
  try {
    const prefixo = CHAVE_RASCUNHO('');
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefixo))
      .map((k) => Number(k.slice(prefixo.length)))
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function anoSalvo() {
  try {
    return Number(localStorage.getItem(CHAVE_ANO)) || null;
  } catch {
    return null;
  }
}

/** Converte o texto de um arquivo .json em calendário, ou lança Error com mensagem amigável. */
export function importarJson(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const erros = validarEstrutura(obj);
  if (erros.length) throw new Error(`Formato inesperado:\n• ${erros.join('\n• ')}`);
  return normalizarCalendario(obj);
}
