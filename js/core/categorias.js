/**
 * Categorias de evento (legenda e cores): padrão do projeto + personalizações do calendário.
 *
 * - `data/categorias.json` traz as categorias padrão (as que as regras de dias letivos conhecem).
 * - `calendario.categorias` guarda SÓ o que o usuário mudou na página:
 *     · categoria padrão  -> apenas os campos alterados:  { id: "feriado", cor: "#FF0000" }
 *     · categoria nova    -> objeto completo, com  `personalizada: true`
 *   Por isso o rascunho do navegador e o JSON exportado já levam as cores escolhidas.
 *
 * Funções puras, sem DOM.
 */

/** Campos que o usuário pode personalizar em uma categoria padrão. */
export const CAMPOS_EDITAVEIS = ['nome', 'cor', 'estilo', 'prioridade', 'efeitoLetivo'];

export const ESTILOS = {
  fundo: 'Pinta o dia inteiro (aparece na legenda)',
  negrito: 'Número em negrito e sublinhado',
  contorno: 'Contorno ao redor do dia',
  marcador: 'Pontinho no canto do dia',
};

/** Efeitos que uma categoria NOVA pode ter na contagem de dias letivos. */
export const EFEITOS_PERSONALIZADOS = {
  nenhum: 'Nenhum (apenas informativo)',
  bloqueia: 'Dia sem aula (não conta como letivo)',
  adiciona: 'Sábado extra (conta como dia letivo)',
};

/** Branco ou quase-preto, conforme o contraste com a cor de fundo (luminância WCAG). */
export function corDeTexto(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#1F2933';
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#1F2933' : '#FFFFFF';
}

/** "#abc" ou "#AABBCC" -> "#AABBCC"; devolve null se não for uma cor hexadecimal. */
export function normalizarCor(valor) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(valor ?? '').trim());
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${hex.toUpperCase()}`;
}

/**
 * Lista final de categorias: padrão + personalizações do calendário.
 * Uma cor alterada recalcula a cor do texto, a menos que o calendário traga `texto`.
 */
export function categoriasEfetivas(base, personalizadas = []) {
  const porId = new Map(personalizadas.map((p) => [p.id, p]));
  const resultado = base.map((cat) => {
    const ov = porId.get(cat.id);
    if (!ov) return cat;
    const mesclada = { ...cat, ...ov, alterada: true };
    if (ov.cor && !ov.texto) mesclada.texto = corDeTexto(ov.cor);
    return mesclada;
  });
  const idsBase = new Set(base.map((c) => c.id));
  for (const p of personalizadas) {
    if (idsBase.has(p.id)) continue;
    resultado.push({
      efeitoLetivo: 'nenhum', estilo: 'fundo', prioridade: 15, texto: corDeTexto(p.cor), ...p,
      personalizada: true, legenda: (p.estilo ?? 'fundo') === 'fundo',
    });
  }
  return resultado;
}

/**
 * Inverso de categoriasEfetivas: a partir da lista editada, devolve só as diferenças
 * em relação ao padrão (e as categorias novas completas) – é isso que vai para o JSON.
 */
export function extrairPersonalizadas(base, editadas) {
  const porId = new Map(base.map((c) => [c.id, c]));
  const saida = [];
  for (const cat of editadas) {
    const padrao = porId.get(cat.id);
    if (!padrao) {
      saida.push({ id: cat.id, nome: cat.nome, cor: cat.cor, estilo: cat.estilo, prioridade: cat.prioridade, efeitoLetivo: cat.efeitoLetivo, personalizada: true });
      continue;
    }
    const dif = { id: cat.id };
    for (const campo of CAMPOS_EDITAVEIS) if (cat[campo] !== padrao[campo]) dif[campo] = cat[campo];
    if (Object.keys(dif).length > 1) saida.push(dif);
  }
  return saida;
}

/** id curto e único para uma categoria nova: "cat_semana_de_provas". */
export function novoIdCategoria(nome, existentes) {
  const slug = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'nova';
  let id = `cat_${slug}`;
  for (let n = 2; existentes.has(id); n += 1) id = `cat_${slug}_${n}`;
  return id;
}

/** Erros de uma lista de categorias personalizadas lida de arquivo. */
export function validarPersonalizadas(lista) {
  if (lista === undefined) return [];
  if (!Array.isArray(lista)) return ['"categorias" deve ser uma lista.'];
  const erros = [];
  lista.forEach((c, i) => {
    if (typeof c?.id !== 'string') erros.push(`Categoria ${i + 1}: "id" ausente.`);
    if (c?.cor !== undefined && !normalizarCor(c.cor)) erros.push(`Categoria ${c?.id ?? i + 1}: cor inválida (${c.cor}).`);
  });
  return erros;
}
