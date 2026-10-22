# Calendário Acadêmico IFPI – protótipo web

Protótipo do calendário acadêmico do campus (IFPI), feito para substituir a edição manual do documento do Word.
O calendário colorido, a tabela de eventos, os feriados, os dias letivos e as validações saem **de uma única fonte de dados**
(`data/*.json`), em vez de serem digitados e pintados em vários lugares.

* **Sem build, sem framework:** HTML + CSS + JavaScript (módulos ES). Abre em qualquer servidor estático – inclusive o **GitHub Pages**.
* **Responsivo** (celular → desktop), **tema claro/escuro**, teclado e leitor de tela, **impressão em A4** parecida com o documento.
* Código comentado em português, dividido em módulos pequenos.

> Continuar em outro computador / Claude: veja [CLAUDE.md](CLAUDE.md) e [docs/GITHUB.md](docs/GITHUB.md).
> Para a equipe: [guia de uso](docs/GUIA-DE-USO.md) · [Organização Didática × calendário](docs/ORGANIZACAO-DIDATICA.md) (o que dá para fazer na página × o que exige código).
> Contexto: veja a [análise do documento original](docs/ANALISE-DO-DOCUMENTO.md) (o que é fixo, editável, derivado e móvel, e as inconsistências encontradas).

## O que o protótipo faz

| Aba | Para quê |
|-----|----------|
| **Calendário** | 12 meses coloridos; legenda clicável (destaca uma categoria); clique no dia para ver/adicionar eventos; contagem de dias letivos por mês |
| **Eventos** | a tabela MÊS · DIA · EVENTOS, com busca, filtros, edição, duplicação e exclusão |
| **Resumo** | dias letivos por mês (calculado × informado no documento), bimestres, férias, feriados e pontos facultativos – tudo gerado |
| **Datas importantes** | as 75 datas comemorativas, com busca e inclusão |
| **Conformidade** | confere o calendário com a [Organização Didática](docs/ORGANIZACAO-DIDATICA.md): **20 de cada dia da semana por semestre** (sábados letivos repõem o que falta), mínimos de 100/200 dias, itens obrigatórios do Art. 30 e prazos calculados |
| **Pendências** | inconsistências detectadas automaticamente (datas, contagens, resquícios de outro campus…) |

**Cores:** *Mais → Categorias e cores…* escolhe a cor de cada categoria e cria categorias novas (ficam no calendário exportado).
Menu **+ Registrar**: evento, **sábado letivo**, **ponto facultativo**, feriado, sábado de reposição, recesso e prova final.
Também: desfazer/refazer (Ctrl+Z / Ctrl+Y), **novo ano letivo** (gera feriados – inclusive Carnaval, Sexta-feira Santa e Corpus Christi, calculados pela Páscoa),
configurações (campus, semestres, bimestres, regras de contagem) e exportação em **PDF/impressão, CSV (Excel), ICS (Google Agenda/Outlook) e JSON**.

## Como rodar

O navegador bloqueia módulos ES e `fetch` em arquivos abertos direto do disco (`file://`), por isso é preciso um servidor local simples:

```bash
# Windows: dê dois cliques em scripts/servir.bat
# ou, em qualquer sistema com Python:
python -m http.server 5173
# depois acesse http://localhost:5173
```

Alternativas: extensão **Live Server** do VS Code, ou `npm run servir`.

## Publicar no GitHub Pages

1. Crie um repositório e envie o conteúdo desta pasta (a raiz do repositório deve conter `index.html`).
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
3. A cada `push` na branch `main` o fluxo [`.github/workflows/pages.yml`](.github/workflows/pages.yml) roda os testes e publica o site em `https://<usuario>.github.io/<repositorio>/`.
   (Sem Actions? Use *Deploy from a branch → main → / (root)*; o arquivo `.nojekyll` já está incluído.)

Todos os caminhos são relativos, então funciona em subpasta do GitHub Pages sem ajustes.

## Como atualizar os dados

| Quero… | Faça |
|--------|------|
| Editar rapidamente | Use a interface. As edições ficam salvas **só neste navegador** (rascunho). |
| Guardar/compartilhar | *Exportar → Backup (JSON)* e substitua `data/calendario-AAAA.json` no repositório (`git commit`). |
| Começar outro ano | *Mais → Novo ano letivo…* e depois exporte o JSON. |
| Trocar cores/legenda | Edite `data/categorias.json` (uma linha por categoria). |
| Trocar a identidade visual | Edite `css/tokens.css` e `assets/img/`. |

O formato dos arquivos está em [docs/DADOS.md](docs/DADOS.md).

## Estrutura do projeto

```text
calendario-academico/
├── index.html                  # casca da página: só carrega CSS e js/main.js
├── css/                        # estilos separados por responsabilidade
│   ├── tokens.css              #   cores, tipografia, temas claro/escuro  (identidade visual)
│   ├── base.css                #   reset, botões, campos, selos
│   ├── layout.css              #   topo, indicadores, abas, menus, rodapé
│   ├── calendario.css          #   legenda e os 12 meses
│   ├── tabelas.css             #   eventos, resumo, datas, pendências
│   ├── dialogos.css            #   janelas modais, formulários, avisos
│   └── impressao.css           #   layout A4
├── js/
│   ├── main.js                 # ponto de entrada: carrega dados → store → desenha
│   ├── acoes.js                # comandos do usuário (editar, excluir, importar, exportar…)
│   ├── core/                   # REGRAS DE NEGÓCIO – funções puras, sem DOM (testáveis no Node)
│   │   ├── datas.js            #   datas ISO, intervalos, formatação do rótulo "21 a 25 e 28"
│   │   ├── feriados.js         #   Páscoa e feriados móveis/fixos
│   │   ├── eventos.js          #   expandir períodos, indexar por dia, agrupar por mês
│   │   ├── categorias.js       #   categorias padrão + cores/categorias personalizadas
│   │   ├── diasLetivos.js      #   contagem de dias letivos e cor dominante de cada dia
│   │   ├── equilibrio.js       #   20 por dia da semana, sábados letivos e sugestões
│   │   ├── normas.js           #   Organização Didática: mínimos, Art. 30, prazos
│   │   ├── validacao.js        #   regras de inconsistência (erro / aviso / info)
│   │   └── modelo.js           #   novo ano, validação e normalização de arquivos
│   ├── state/                  # estado e persistência
│   │   ├── store.js            #   store observável com desfazer/refazer
│   │   └── repositorio.js      #   leitura dos JSON, rascunho (localStorage), importação
│   ├── ui/                     # TELAS e componentes (desenham o DOM)
│   │   ├── visao-*.js          #   uma por aba (+ visao-impressao.js)
│   │   ├── dialogo-*.js        #   evento, dia, configurações, novo ano
│   │   └── cabecalho, barra-acoes, toast, tema, comuns, dialogo
│   ├── export/arquivos.js      # CSV, ICS, JSON e download
│   └── lib/dom.js              # mini-biblioteca h('div', {...}, filhos) – sem dependências
├── data/                       # FONTE ÚNICA DOS DADOS
│   ├── calendario-2027.json    #   eventos transcritos do documento original
│   ├── categorias.json         #   legenda e cores
│   ├── datas-comemorativas.json
│   └── requisitos-od.json      #   números e itens obrigatórios da Organização Didática
├── tests/                      # testes do núcleo (node:test) + fixtures/ (cópia fixa de 2027 usada pelos testes)
├── scripts/                    # validar.mjs (CLI), servir.bat / servir.sh
├── CLAUDE.md                   # contexto e regras para o Claude Code (viaja com o repositório)
├── docs/                       # análise do documento, Organização Didática, formato dos dados, guia de uso, GitHub, referencia/ (PDFs)
└── .github/workflows/pages.yml # testes + deploy no GitHub Pages
```

**Regra de ouro da arquitetura:** `js/core/` não conhece o navegador. Tudo que é regra do calendário (feriados, dias letivos,
validações) é testável sem abrir página, e `js/ui/` apenas desenha o que o núcleo calcula.

## Testes e validação

```bash
npm test                  # testes unitários do núcleo (Node 18+; sem dependências)
npm run validar           # valida data/calendario-2027.json e lista as pendências
npm run validar:estrito   # idem, mas falha também se houver avisos
```

O CI executa os dois a cada push; só **erros** quebram o build (o calendário pode estar “em elaboração”, então avisos apenas aparecem no log).

## Decisões de projeto

* **Por que sem framework/bundler?** O sistema é pequeno, será mantido por quem não é desenvolvedor em tempo integral e precisa ser publicado por
  um simples arquivo estático. Menos dependências = menos manutenção. Se crescer, a divisão `core/ui/state` permite migrar a camada `ui/` para React/Vue sem tocar nas regras.
* **Dados em JSON versionável:** o histórico do GitHub mostra quem mudou qual data, algo impossível no `.docx`.
* **Validação em vez de confiança:** as regras de `validacao.js` existem porque o documento original tinha o mesmo dado em vários lugares, sem conferência.
* **Segurança:** a interface monta o DOM com `textContent` (nunca `innerHTML`), então títulos de eventos não executam HTML.

## Limitações do protótipo / próximos passos

* Rascunho local por navegador (não há login nem banco). Para edição colaborativa: GitHub (pull requests no JSON) ou um backend/planilha compartilhada.
* A impressão usa o diálogo do navegador (*Salvar como PDF*); não replica pixel a pixel o layout do Word.
* Importar o `.docx` original automaticamente (hoje a transcrição foi feita uma vez, em `data/calendario-2027.json`).
* Vários calendários por campus/modalidade (hoje: um arquivo por ano).

## Licença

Defina a licença conforme a política da instituição (nenhuma foi incluída). O logotipo do IFPI pertence à instituição.
