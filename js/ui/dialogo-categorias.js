/**
 * "Categorias e cores": escolher a cor de cada categoria de evento e criar categorias novas.
 * O resultado é gravado em `calendario.categorias` (só as diferenças em relação ao padrão),
 * por isso vai junto com o rascunho do navegador e com o JSON exportado.
 */
import { h, trocarConteudo } from '../lib/dom.js';
import {
  CAMPOS_EDITAVEIS, EFEITOS_PERSONALIZADOS, ESTILOS, corDeTexto, extrairPersonalizadas, novoIdCategoria,
} from '../core/categorias.js';
import { abrirDialogo } from './dialogo.js';
import { mostrarToast } from './toast.js';

export function abrirDialogoCategorias(ctx) {
  const base = ctx.categoriasBase;
  const porIdBase = new Map(base.map((c) => [c.id, c]));
  const usos = new Map();
  for (const ev of ctx.cal.eventos) usos.set(ev.tipo, (usos.get(ev.tipo) ?? 0) + 1);

  // cópia de trabalho: só vira dado do calendário ao salvar
  let lista = ctx.categorias.map((c) => ({ ...c }));
  const corpo = h('div', { class: 'cats' });

  const previa = (cat) => h('span', { class: 'selo', style: { '--cor': cat.cor, '--cat-texto': corDeTexto(cat.cor) } }, cat.nome || 'Sem nome');

  function linha(cat) {
    const padrao = porIdBase.get(cat.id);
    const emUso = usos.get(cat.id) ?? 0;
    const chip = h('span', { class: 'cat__previa' }, previa(cat));
    const atualizarChip = () => trocarConteudo(chip, previa(cat));

    const cor = h('input', {
      type: 'color', class: 'cat__cor', value: cat.cor, 'aria-label': `Cor de ${cat.nome}`,
      oninput: (e) => { cat.cor = e.target.value.toUpperCase(); atualizarChip(); },
    });
    const nome = h('input', {
      type: 'text', class: 'campo', value: cat.nome, required: true, maxlength: 60, 'aria-label': 'Nome da categoria',
      oninput: (e) => { cat.nome = e.target.value; atualizarChip(); },
    });
    const estilo = h('select', {
      class: 'campo', disabled: !!padrao, title: padrao ? 'As categorias padrão têm o formato fixo' : null, 'aria-label': 'Como aparece no calendário',
      onchange: (e) => { cat.estilo = e.target.value; },
    }, Object.entries(ESTILOS).map(([v, rotulo]) => h('option', { value: v, selected: cat.estilo === v }, rotulo)));
    const efeito = h('select', {
      class: 'campo', disabled: !!padrao, title: padrao ? 'O efeito nos dias letivos das categorias padrão é definido pelas regras' : null, 'aria-label': 'Efeito nos dias letivos',
      onchange: (e) => { cat.efeitoLetivo = e.target.value; },
    }, padrao
      ? h('option', {}, 'Definido pelas regras')
      : Object.entries(EFEITOS_PERSONALIZADOS).map(([v, rotulo]) => h('option', { value: v, selected: cat.efeitoLetivo === v }, rotulo)));
    const prioridade = h('input', {
      type: 'number', class: 'campo', min: 1, max: 99, value: cat.prioridade, 'aria-label': 'Prioridade (menor vence)',
      title: 'Quando um dia tem duas categorias que pintam o fundo, vence o menor número',
      oninput: (e) => { cat.prioridade = Number(e.target.value) || cat.prioridade; },
    });

    const acao = padrao
      ? h('button', {
        type: 'button', class: 'btn btn--neutro btn--pequeno', title: 'Voltar à cor e ao nome padrão',
        disabled: CAMPOS_EDITAVEIS.every((campo) => cat[campo] === padrao[campo]),
        onclick: () => { Object.assign(cat, padrao); desenhar(); },
      }, 'Padrão')
      : h('button', {
        type: 'button', class: 'btn btn--icone btn--perigo-suave', disabled: emUso > 0, 'aria-label': `Remover ${cat.nome}`,
        title: emUso > 0 ? `Há ${emUso} evento(s) nesta categoria; mude a categoria deles antes de remover` : 'Remover categoria',
        onclick: () => { lista = lista.filter((c) => c !== cat); desenhar(); },
      }, '🗑');

    return h('div', { class: 'cat-linha' },
      cor, h('div', { class: 'cat__nome' }, nome, chip), estilo, efeito, prioridade,
      h('span', { class: 'cat__uso', title: 'Eventos nesta categoria' }, `${emUso}`), acao);
  }

  function desenhar() {
    trocarConteudo(corpo,
      h('div', { class: 'cat-linha cat-linha--cab' },
        h('span', {}, 'Cor'), h('span', {}, 'Nome'), h('span', {}, 'No calendário'), h('span', {}, 'Dias letivos'), h('span', {}, 'Prior.'), h('span', {}, 'Uso'), h('span')),
      lista.map(linha),
      h('div', { class: 'cats__rodape' },
        h('button', {
          type: 'button', class: 'btn btn--neutro btn--pequeno',
          onclick: () => {
            const id = novoIdCategoria('nova', new Set(lista.map((c) => c.id)));
            lista.push({ id, nome: 'Nova categoria', cor: '#3B82F6', texto: '#FFFFFF', estilo: 'fundo', prioridade: 15, efeitoLetivo: 'nenhum', personalizada: true, legenda: true });
            desenhar();
          },
        }, '+ Nova categoria'),
        h('small', {}, 'Dica: “Prior.” só importa para categorias que pintam o dia; vence o menor número.')));
  }
  desenhar();

  abrirDialogo({
    titulo: 'Categorias e cores',
    subtitulo: 'As cores valem para o calendário, a legenda, as tabelas e a impressão. Fica salvo neste navegador; exporte o JSON para tornar permanente.',
    largura: 'lg',
    corpo,
    aoEnviar: (_, dlg) => {
      const nomes = lista.map((c) => c.nome.trim().toLowerCase());
      if (new Set(nomes).size !== nomes.length) { mostrarToast('Há duas categorias com o mesmo nome.', { tipo: 'erro' }); return; }
      const personalizadas = extrairPersonalizadas(base, lista.map((c) => ({ ...c, nome: c.nome.trim() })));
      ctx.store.alterarCal((cal) => {
        if (personalizadas.length) cal.categorias = personalizadas;
        else delete cal.categorias;
      });
      dlg.close();
      mostrarToast('Cores salvas neste navegador. Exporte o JSON para torná-las permanentes.', { acao: { rotulo: 'Desfazer', aoClicar: () => ctx.store.desfazer() } });
    },
    botoes: [
      { rotulo: 'Restaurar cores padrão', variante: 'neutro', aoClicar: () => { lista = [...base.map((c) => ({ ...c })), ...lista.filter((c) => c.personalizada)]; desenhar(); } },
      { rotulo: 'Cancelar', aoClicar: (_, dlg) => dlg.close() },
      { rotulo: 'Salvar', variante: 'primario', submit: true },
    ],
  });
}
