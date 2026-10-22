# CLAUDE.md – contexto do projeto “Calendário Acadêmico IFPI”

Este arquivo é lido automaticamente pelo Claude Code ao abrir a pasta. Ele existe para que o trabalho continue em **outro computador / outra conta** sem perder o contexto
(a “memória” do Claude fica só na máquina onde foi criada; este arquivo vai junto com o repositório).

## 1. O que é
Protótipo web (HTML + CSS + JavaScript puro, módulos ES, **sem build e sem dependências**) que substitui a edição do **Calendário Acadêmico 2027 do campus Esperantina (IFPI)**,
antes feito em tabelas do Word. Publica-se como site estático no GitHub Pages. Nome combinado da aplicação: **Calendário Acadêmico IFPI**.

- Curso: técnicos integrados ao ensino médio, regime **anual** (4 bimestres; semestres 2027.1 e 2027.2 usados na contagem de dias letivos).
- Usuário: servidor do campus que elabora o calendário (não é desenvolvedor em tempo integral). Fala **português do Brasil**; responda e comente o código em português.
  Prefere explicações objetivas, com o que foi feito, o que ficou pendente e o que depende dele decidir.

## 2. Leia primeiro
| Arquivo | Para quê |
|---------|----------|
| `README.md` | visão geral, estrutura de pastas, como rodar e publicar |
| `docs/GUIA-DE-USO.md` | o que se faz na página × o que exige código |
| `docs/DADOS.md` | formato dos JSON e lista das validações |
| `docs/ORGANIZACAO-DIDATICA.md` | regras da norma (RN 143/2022) aplicadas ao calendário |
| `docs/ANALISE-DO-DOCUMENTO.md` | análise do documento Word/PDF original e suas inconsistências |
| `docs/referencia/` | PDFs de origem (minuta do calendário e a Organização Didática) |
| `docs/GITHUB.md` | como sincronizar entre computadores |

## 3. Comandos
```bash
python -m http.server 5173        # servir (file:// NÃO funciona: módulos ES e fetch). Windows: scripts/servir.bat
node --test                       # testes (Node 18+).  Em máquina só com Deno:  deno test -A tests/
node scripts/validar.mjs          # valida data/calendario-2027.json (Deno: deno run -A scripts/validar.mjs)
```
Depois de mudar `js/` ou `css/`: Ctrl+F5 no navegador. Em máquinas sem Node, o Deno serve para testes e lint (`deno lint js tests scripts`; avisos de `window` são esperados).

## 4. Regras que NÃO podem ser quebradas
1. **`data/calendario-2027.json` é o arquivo de trabalho do usuário.** Ele edita pela página, usa *Exportar → Backup (JSON)* e **sobrescreve** esse arquivo.
   **Nunca sobrescreva, reformate ou “corrija” esse arquivo sem o usuário pedir**; leia-o antes de qualquer análise (ele muda entre sessões).
2. Os **testes não usam esse arquivo**: usam a cópia fixa `tests/fixtures/calendario-2027-referencia.json` (estado de 2027 acordado em 22/10/2026). Só altere a fixture se a regra de negócio mudar.
3. `js/core/` é **puro** (sem DOM, `document`, `window`, `localStorage`): roda no navegador e no Node. Regra de negócio nova vai aqui, **com teste** em `tests/core.test.js`.
4. `js/ui/` só desenha. O DOM é montado com `h()` (`js/lib/dom.js`) e `textContent`; **nunca** `innerHTML`.
5. **Caminhos relativos** em todo o site (funciona em subpasta do GitHub Pages).
6. Números e itens da norma ficam em `data/requisitos-od.json` (dados, não código). Cores/legenda padrão em `data/categorias.json`.
7. Comentários e mensagens em pt-BR; nomes de funções/variáveis em português, seguindo o estilo existente.
8. Não commitar `node_modules/` nem `.claude/`. Não fazer push/publicação sem o usuário pedir.

## 5. Arquitetura em uma tela
```
index.html → js/main.js (carrega JSON → store → recalcula derivados → desenha a aba ativa)
js/core/     datas, feriados (Páscoa), eventos, categorias, diasLetivos, equilibrio, normas, validacao, modelo
js/state/    store (observável + desfazer/refazer), repositorio (fetch, rascunho no localStorage, importar JSON)
js/ui/       visao-*.js (uma por aba), dialogo-*.js, cabecalho, barra-acoes, toast, tema
js/acoes.js  comandos do usuário (editar, excluir, importar, exportar, registrar…)
js/export/   CSV, ICS, JSON
data/        calendario-2027.json (trabalho) · categorias.json · datas-comemorativas.json · requisitos-od.json
```
Abas: Calendário · Eventos · Resumo · Conformidade · Datas importantes · Pendências. Menu **+ Registrar** (evento, sábado letivo, ponto facultativo, feriado, reposição, recesso, prova final).
Impressão A4: evento `beforeprint` troca para `visao-impressao.js` (URL `?imprimir=1` abre essa visão direto).

## 6. Regras de domínio (resumo)
- **Dia letivo** = segunda a sexta dentro de um semestre, exceto feriado, férias, recesso, **prova final** (Art. 26: exames finais não contam) e – conforme `meta.regras.pontoFacultativoNaoLetivo` – ponto facultativo; mais os **sábados letivos** (e os de reposição só se `reposicaoContaComoLetivo`).
- **20 de cada dia da semana por semestre** (`meta.regras.diasPorDiaDaSemana`, padrão 20 → 100 dias/semestre, mínimo do Art. 26; 200/ano).
  Quando feriado/ponto/etc. tira um dia, um **sábado letivo repõe aquele dia**: campo `compensa` do evento (`["quinta","segunda"]`, um item por sábado, pode repetir).
  `js/core/equilibrio.js` calcula o balanço, sugere sábados (dias perdidos primeiro, depois complemento espalhado) e cenários de estender o término.
- Eventos: `{ id, tipo, titulo, periodos:[{de,ate?}], marcos?, ref?, compensa?, obs?, pendencia? }`. `marcos` (`inicio_bimestre:2`, `termino_semestre:2027.1`…) cruzam eventos com semestres/bimestres; `ref` (`natal`, `carnaval`…) confere feriados oficiais.
- **Categorias**: padrão em `data/categorias.json` + personalizações do usuário em `calendario.categorias` (só diferenças; categoria nova tem `personalizada:true`). Editor: *Mais → Categorias e cores*.
- **Normas (Organização Didática, RN 143/2022)** implementadas: mínimos 100/200 dias (Art. 26) · itens obrigatórios do Art. 30 (31/32 por modalidade) · prazo de envio à PROEN 90 dias antes do início (Art. 29) · 15º dia letivo (Arts. 47/50) · 7 dias úteis para entregar/devolver provas (Arts. 61/64/75/78).
- A regra “20 por dia da semana” é **da equipe**, derivada do Art. 26 (não está escrita assim na norma).

## 7. Decisões já tomadas pelo usuário
- Campus = **Esperantina** (referências a Altos/Barras foram removidas; “Altos” e “Barras” ficam só em `meta.referenciasSuspeitas` como alarme).
- Início do 2027.1 = **01/03/2027** (mantido); como só com sábados não fecha, o término foi estendido para julho (cenário 16/07 foi aplicado e, depois, o usuário continuou ajustando pela página).
- Dos sábados letivos: o de 13/03 foi dispensado; sábado letivo de 06 e 27/11 repõe “quinta, segunda”.
- Dados antigos “informados” do documento Word foram descartados (o sistema calcula); só `meta.informado.feriasDias` (45) permanece como meta.

## 8. Estado em 22/10/2026 (trabalho em andamento – confira o JSON atual!)
O JSON de trabalho foi editado pelo usuário depois da última sessão do Claude: término do ano 18/12/2027, 2027.1 até 09/07, 2027.2 de 02/08 a 18/12, ponto facultativo contando como dia letivo, 96 eventos.
A validação apontava então ~32 avisos, principalmente: eventos de marco (início/término de bimestre e semestre) **ainda com as datas antigas** em relação à tabela de semestres/bimestres editada em Configurações; contagem mensal de dias letivos; 2027.1 com 99 dias e 2027.2 com 103; férias docentes sem os 45 dias; eventos sem data.
Rode `node scripts/validar.mjs` (ou veja a aba **Pendências/Conformidade**) para o quadro real antes de sugerir qualquer coisa.

## 9. Pegadinhas
- O **rascunho do navegador (localStorage) tem prioridade** sobre `data/calendario-2027.json`. Para ver mudanças feitas no arquivo: *Mais → Restaurar original* ou limpar o armazenamento do site.
- Abrir `index.html` por duplo clique não funciona (precisa de servidor http).
- Em Windows/Git Bash o Node pode não estar instalado; o Deno costuma estar (`deno test -A tests/`). Terminais podem mostrar acentos quebrados (é só o console; arquivos são UTF-8).
- Ao editar o JSON de trabalho à mão (se o usuário pedir), preserve o formato do arquivo exportado e valide com `node scripts/validar.mjs`.
- Não existe ainda: login, banco de dados, edição colaborativa em tempo real (o compartilhamento é via Git/GitHub).

## 10. Fluxo de trabalho esperado do Claude
1. Ler este arquivo, `README.md` e o JSON atual; rodar testes e validação.
2. Para mudanças de regra: implementar em `js/core/` + teste; depois a interface; verificar no navegador.
3. Ao terminar: dizer o que mudou, o que ficou pendente e a decisão que depende do usuário. Sugerir (não executar) `git add/commit/push`.
