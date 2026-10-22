/**
 * Ações do usuário (comandos). Concentra o que as telas disparam – editar, excluir,
 * importar, exportar – para que as telas só desenhem e chamem `ctx.acoes.*`.
 */
import { novoId } from './core/eventos.js';
import { alternarTema } from './ui/tema.js';
import { abrirDialogoEvento } from './ui/dialogo-evento.js';
import { abrirDialogoDia } from './ui/dialogo-dia.js';
import { abrirDialogoConfig } from './ui/dialogo-config.js';
import { abrirDialogoNovoAno } from './ui/dialogo-novo-ano.js';
import { abrirDialogoCategorias } from './ui/dialogo-categorias.js';
import { confirmar } from './ui/dialogo.js';
import { mostrarToast } from './ui/toast.js';
import { apagarRascunho, importarJson, lerRascunho } from './state/repositorio.js';
import { baixarArquivo, gerarCsv, gerarIcs, gerarJson, nomeBase } from './export/arquivos.js';

/**
 * @param {object} deps
 * @param {object} deps.store
 * @param {() => object} deps.contexto   devolve o contexto atual (calendário + derivados)
 * @param {object} deps.base             calendário original do projeto
 * @param {() => void} deps.redesenhar
 */
export function criarAcoes({ store, contexto, base, redesenhar }) {
  const desfazerToast = { rotulo: 'Desfazer', aoClicar: () => store.desfazer() };
  const nomesTipo = () => new Map(contexto().categorias.map((c) => [c.id, c.nome]));

  const acoes = {
    editarEvento: (eventoId) => abrirDialogoEvento(contexto(), { eventoId }),
    novoEvento: (dataInicial, modelo) => abrirDialogoEvento(contexto(), { dataInicial, modelo }),
    /** Atalho do menu "Registrar": abre o formulário já com a categoria escolhida. */
    registrar: (tipo, rotulo, titulo = '') => abrirDialogoEvento(contexto(), { modelo: { tipo, titulo, rotuloDialogo: rotulo } }),
    abrirDia: (dataIso) => abrirDialogoDia(contexto(), dataIso),
    abrirConfiguracoes: () => abrirDialogoConfig(contexto()),
    abrirCategorias: () => abrirDialogoCategorias(contexto()),
    novoAno: () => abrirDialogoNovoAno(contexto()),

    duplicarEvento(id) {
      let idNovo;
      store.alterarCal((cal) => {
        const origem = cal.eventos.find((e) => e.id === id);
        idNovo = novoId(cal.eventos);
        cal.eventos.push({ ...structuredClone(origem), id: idNovo, titulo: `${origem.titulo} (cópia)` });
      });
      abrirDialogoEvento(contexto(), { eventoId: idNovo });
    },

    async excluirEvento(id) {
      const ev = store.obterCal().eventos.find((e) => e.id === id);
      if (!ev) return;
      if (!(await confirmar(`Excluir “${ev.titulo}”?`, { titulo: 'Excluir evento', rotuloOk: 'Excluir', perigo: true }))) return;
      store.alterarCal((cal) => { cal.eventos = cal.eventos.filter((e) => e.id !== id); });
      mostrarToast('Evento excluído.', { acao: desfazerToast });
    },

    /** Troca o calendário aberto (novo ano, importação, outro ano salvo). */
    abrirCalendario: (cal) => store.substituirCal(cal),

    abrirAno(ano) {
      const cal = lerRascunho(ano) ?? (ano === base.meta.ano ? structuredClone(base) : null);
      if (cal) store.substituirCal(cal);
    },

    async importarArquivo(arquivo) {
      if (!arquivo) return;
      try {
        const cal = importarJson(await arquivo.text());
        const ok = await confirmar(
          `Abrir “${cal.meta.titulo} – ${cal.meta.campus}” (${cal.eventos.length} eventos)? O calendário atual deste navegador será substituído.`,
          { titulo: 'Importar calendário', rotuloOk: 'Importar' });
        if (ok) { store.substituirCal(cal); mostrarToast('Calendário importado.'); }
      } catch (erro) {
        mostrarToast(erro.message, { tipo: 'erro', duracao: 9000 });
      }
    },

    async restaurarOriginal() {
      const atual = store.obterCal();
      if (atual.meta.ano !== base.meta.ano) {
        mostrarToast(`Só existe versão original do calendário ${base.meta.ano}.`, { tipo: 'erro' });
        return;
      }
      const ok = await confirmar('Todas as edições feitas neste navegador serão descartadas e o calendário voltará ao documento original.',
        { titulo: 'Restaurar original', rotuloOk: 'Restaurar', perigo: true });
      if (!ok) return;
      apagarRascunho(base.meta.ano);
      store.substituirCal(structuredClone(base));
      mostrarToast('Calendário restaurado.');
    },

    exportarJson: () => baixarArquivo(`${nomeBase(store.obterCal())}.json`, gerarJson(store.obterCal()), 'application/json'),
    exportarCsv: () => baixarArquivo(`${nomeBase(store.obterCal())}.csv`, gerarCsv(store.obterCal(), nomesTipo()), 'text/csv'),
    exportarIcs: () => baixarArquivo(`${nomeBase(store.obterCal())}.ics`, gerarIcs(store.obterCal(), nomesTipo()), 'text/calendar'),

    imprimir: () => window.print(), // a troca de visão acontece em main.js (evento beforeprint)

    alternarTema() {
      alternarTema();
      redesenhar();
    },
  };
  return acoes;
}
