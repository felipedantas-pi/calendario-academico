/**
 * Exportações: JSON, CSV e ICS (agenda). Geradores puros + utilitário de download.
 */
import { ordenarEventos } from '../core/eventos.js';
import { formatarBR, formatarPeriodos, somarDias } from '../core/datas.js';

/** Baixa um texto como arquivo (cria e revoga um Blob temporário). */
export function baixarArquivo(nome, conteudo, tipoMime) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipoMime};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const nomeBase = (cal) => `calendario-${cal.meta.campus ?? 'campus'}-${cal.meta.ano}`
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');

// ---------------- JSON ----------------
export const gerarJson = (cal) => `${JSON.stringify(cal, null, 2)}\n`;

// ---------------- CSV (abre direto no Excel) ----------------
const csvCampo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function gerarCsv(cal, nomesTipo) {
  const cab = ['Início', 'Fim', 'Dia(s)', 'Categoria', 'Evento', 'Observação'];
  const linhas = [];
  for (const ev of ordenarEventos(cal.eventos)) {
    const periodos = ev.periodos?.length ? ev.periodos : [null];
    for (const p of periodos) {
      linhas.push([
        p ? formatarBR(p.de) : '',
        p?.ate ? formatarBR(p.ate) : p ? formatarBR(p.de) : '',
        formatarPeriodos(ev.periodos),
        nomesTipo.get(ev.tipo) ?? ev.tipo,
        ev.titulo,
        [ev.obs, ev.pendencia].filter(Boolean).join(' | '),
      ]);
    }
  }
  // BOM + ponto e vírgula: separador padrão do Excel em português do Brasil
  return `\uFEFF${[cab, ...linhas].map((l) => l.map(csvCampo).join(';')).join('\r\n')}\r\n`;
}

// ---------------- ICS (Google Agenda, Outlook, Apple) ----------------
const escIcs = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dataIcs = (iso) => iso.replaceAll('-', '');

/** Dobra linhas longas em 75 octetos, como exige a RFC 5545. */
function dobrar(linha) {
  const partes = [];
  let resto = linha;
  while (resto.length > 74) {
    partes.push(resto.slice(0, 74));
    resto = ` ${resto.slice(74)}`;
  }
  partes.push(resto);
  return partes.join('\r\n');
}

export function gerarIcs(cal, nomesTipo) {
  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const linhas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calendario Academico//PT-BR//',
    'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escIcs(cal.meta.titulo)} – ${escIcs(cal.meta.campus)}`, 'X-WR-TIMEZONE:America/Fortaleza',
  ];
  for (const ev of cal.eventos) {
    (ev.periodos ?? []).forEach((p, i) => {
      const fim = p.ate ?? p.de;
      linhas.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}-${i}@calendario-academico`,
        `DTSTAMP:${agora}`,
        `DTSTART;VALUE=DATE:${dataIcs(p.de)}`,
        `DTEND;VALUE=DATE:${dataIcs(somarDias(fim, 1))}`, // em eventos de dia inteiro o fim é exclusivo
        `SUMMARY:${escIcs(ev.titulo)}`,
        `CATEGORIES:${escIcs(nomesTipo.get(ev.tipo) ?? ev.tipo)}`,
        ...(ev.obs ? [`DESCRIPTION:${escIcs(ev.obs)}`] : []),
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    });
  }
  linhas.push('END:VCALENDAR');
  return `${linhas.map(dobrar).join('\r\n')}\r\n`;
}
