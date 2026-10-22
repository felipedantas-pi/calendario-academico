/**
 * Store mínima (padrão observável) com histórico para desfazer/refazer.
 *
 * Guarda o calendário (`cal`) – o dado do usuário, com histórico – e o estado da
 * interface (`ui`: aba ativa, filtros), que não entra no histórico.
 */
const LIMITE_HISTORICO = 50;

export function criarStore(calInicial, uiInicial = {}) {
  let cal = calInicial;
  let ui = { ...uiInicial };
  const passado = [];
  const futuro = [];
  const ouvintes = new Set();
  const avisar = () => ouvintes.forEach((fn) => fn({ cal, ui }));

  return {
    obterCal: () => cal,
    obterUi: () => ui,
    assinar(fn) {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },

    /** Altera o calendário por uma função que recebe uma cópia e devolve o novo valor. */
    alterarCal(fn, { historico = true } = {}) {
      const copia = structuredClone(cal);
      const novo = fn(copia) ?? copia;
      if (historico) {
        passado.push(cal);
        if (passado.length > LIMITE_HISTORICO) passado.shift();
        futuro.length = 0;
      }
      cal = novo;
      avisar();
    },

    /** Substitui o calendário inteiro (importar, restaurar) e limpa o histórico. */
    substituirCal(novo) {
      cal = novo;
      passado.length = 0;
      futuro.length = 0;
      avisar();
    },

    /** `silencioso` grava sem re-renderizar (usado por campos de filtro, para não perder o foco). */
    alterarUi(parcial, { silencioso = false } = {}) {
      ui = { ...ui, ...parcial };
      if (!silencioso) avisar();
    },

    podeDesfazer: () => passado.length > 0,
    podeRefazer: () => futuro.length > 0,
    desfazer() {
      if (!passado.length) return;
      futuro.push(cal);
      cal = passado.pop();
      avisar();
    },
    refazer() {
      if (!futuro.length) return;
      passado.push(cal);
      cal = futuro.pop();
      avisar();
    },
  };
}
