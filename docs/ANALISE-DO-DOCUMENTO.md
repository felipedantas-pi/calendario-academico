# Análise do documento “Calendário Acadêmico 2027”

Documento analisado: `Calendario MINUTA INTEGRADO ANUAL-CALENDÁRIO ACADÊMICO 2027 - Esperantina` (DOCX e PDF – o conteúdo é o mesmo).
Foi lido o DOCX (estrutura, mesclagens, cores das células) e conferido visualmente com o PDF.

## 1. Anatomia do documento

Cinco páginas A4. Tudo é **tabela do Word**; não há campos, fórmulas nem estilos de dados. O arquivo veio do Google Docs
(os blocos têm marcas `goog_rdk` e estão “travados” – `contentLocked`), o que explica parte da dificuldade de edição.

| # | Bloco | Como é feito no Word | O que ele realmente é |
|---|-------|----------------------|-----------------------|
| A | Cabeçalho (logo, instituição, campus, título, modalidade) | imagem PNG + 4 parágrafos centralizados | identificação |
| B | **INÍCIO / TÉRMINO / DIAS LETIVOS** | tabela 1×3 | período do ano e total por semestre (digitados) |
| C | “Quantidade de dias letivos” (2 tabelas, JAN–JUN e JUL–DEZ) | tabelas 3×6 | contagem **mensal digitada à mão** |
| D | **12 calendários mensais** | 4 tabelas 8×23 (3 meses lado a lado, colunas-separadoras mescladas) | grade de dias; **cada célula é pintada manualmente** |
| E | Tabela **MÊS · DIA · EVENTOS** | 2 tabelas (41 e 52 linhas); coluna do mês com células mescladas na vertical | 93 eventos |
| F | Bimestres/semestre e Férias coletivas | tabelas pequenas **flutuantes** (`tblpPr`) | períodos (repetem datas dos eventos) |
| G | Feriados/pontos facultativos + Legenda (10 cores) | tabela de 19 linhas + tabela flutuante | feriados (repetem eventos) e legenda |
| H | Datas importantes | uma tabela 1×2 com **75 linhas de texto corrido**, alinhadas com espaços | lista comemorativa |

Sinais de “montagem manual”: ~50 parágrafos vazios usados como espaçador, tabelas posicionadas por coordenada (`tblpX`), 7 fontes embutidas
(o DOCX tem 4,3 MB; o PDF, 480 KB), quatro tons de verde diferentes para “dia letivo” (`D6E3BC`, `D9EAD3`, `B6D7A8`, `A8D08D`) e `FFFFFF` ao lado de “sem preenchimento” para o mesmo dia comum.

## 2. O que é fixo, editável, derivado e móvel

### Fixas (mudam raramente – viraram arquivo/CSS de configuração)
- Logo, nome da instituição, formato do cabeçalho → `index.html`, `assets/img/`, `data/calendario-AAAA.json (meta)`.
- **Legenda e as 10 cores** → [`data/categorias.json`](../data/categorias.json) (uma cor por categoria, usada em todo o sistema).
- Cabeçalhos de coluna, nomes dos meses, “D S T Q Q S S”.
- **Datas importantes** (75): são as mesmas todo ano; só muda o dia da semana → [`data/datas-comemorativas.json`](../data/datas-comemorativas.json).

### Editáveis (variam por campus e por ano – ficam no JSON e na interface)
- Campus, ano, modalidade/curso, início e término do ano letivo.
- Os 93 **eventos** (título, categoria, um ou mais períodos, observação).
- Semestres, bimestres, regras de contagem.
- Sábados letivos/reposição (e a que dias úteis correspondem).

### Derivadas (no Word são digitadas ou pintadas – na web são **calculadas**)
| No Word | Na web |
|---------|--------|
| Posição de cada dia na grade (365 células) | `diaDaSemana()` – nunca erra o alinhamento |
| Cor de cada dia | categoria de maior prioridade entre os eventos do dia |
| “Quantidade de dias letivos” por mês e semestre | `calcularDiasLetivos()` |
| Tabela de feriados | filtro dos eventos `feriado` / `ponto_facultativo` |
| Tabela de bimestres e de férias (total “45 dias”) | derivadas dos eventos e das configurações |
| Coluna “DIA” (“21 a 25 e 28”) | `formatarPeriodos()` a partir das datas |
| Ordem da tabela de eventos | ordenação por data (no Word havia linhas fora de ordem) |

### Móveis (mudam de lugar de um ano para outro)
- **Feriados dependentes da Páscoa**: Carnaval, Quarta de Cinzas, Sexta-feira Santa, Páscoa e Corpus Christi → calculados em [`js/core/feriados.js`](../js/core/feriados.js).
  Em 2027: Carnaval 08–09/02, Cinzas 10/02, Sexta-feira Santa 26/03, Páscoa 28/03, Corpus Christi 27/05.
- Feriados fixos que “caem” em dia da semana diferente (em 2027, 01/05, 20/11 e 25/12 são sábados e não mudam os dias letivos).
- **Sábados letivos**, que repõem um dia útil específico (“SÁBADO LETIVO (SEGUNDA, TERÇA)”).
- Layout do Word: tabelas flutuantes e células mescladas que se desalinham quando uma linha é inserida.

## 3. Inconsistências encontradas

O protótipo as detecta automaticamente (aba **Pendências**, ou `npm run validar`). As principais:

1. **Bloco duplicado:** o calendário de JAN–MAR aparece duas vezes; o segundo bloco tem os dias da semana de outro ano (1º/jan numa quinta; em 2027 é sexta).
2. **Cores pintadas à mão:** em JAN–MAR, **36 de 90 dias** não batem com os eventos (ex.: 10 a 24/02 pintados como férias, que não existem em fevereiro).
   Em ABR–DEZ a grade está correta: só 6 de 275 dias diferem (5 sábados letivo/reposição e 03/08).
3. **TÉRMINO “//2028”**: campo vazio e com ano errado. O término do período letivo 2027.2 é 21/12/2027.
4. **Início do semestre em três versões:** cabeçalho 01/03, evento de fevereiro sem data, evento de 01/03, e a tabela de bimestres diz 03/02.
5. **Dias letivos do 1º semestre:** cabeçalho informa **102**, a soma da tabela mensal é **85** e o cálculo pelos eventos também dá **85** (os 102 provavelmente vêm de um ano em que o semestre começava em fevereiro).
   2º semestre: informado 100 e calculado 100 (a Prova Final de dezembro não conta como dia letivo, conforme o Art. 26 da Organização Didática); só AGO (23×22) e SET (22×23) trocam 1 dia entre si.
   Ver a análise completa em [ORGANIZACAO-DIDATICA.md](ORGANIZACAO-DIDATICA.md).
6. **Resquícios de outro campus:** “Padroeiro de Altos”, “Aniversário inauguração Campus Altos”, “Aniversário de Esperantina-PI”; o cabeçalho dizia *Campus Barras* e o nome do arquivo diz *Esperantina*. **Resolvido:** o campus é Esperantina; os itens de Altos e a menção a Barras foram removidos dos dados.
7. **Eventos sem data:** “Início do semestre” em fevereiro, “Sábado letivo (segunda, terça)” com dia “2” (precisam de 2 sábados) e “Férias docentes – 12 dias”.
8. **Sábado letivo e sábado de reposição no mesmo dia** (13/03, 03/04, 28/08, 18/09, 09/10, 27/11): a grade só mostra uma cor.
9. **Dia do Professor (15/10):** “feriado escolar” na tabela de feriados, mas dia letivo na grade e na contagem.
10. **Destaques manuais** (amarelo/verde) em 25/03, 27–30/09 e 28/09: pendências marcadas na própria formatação.
11. **Informação repetida em três lugares** (grade, eventos, feriados), com itens que só existem em um deles (19/03, 28/03, 15/10…).
12. **Pequenos erros de texto:** “Dia da Mães”, rótulo “JUN” no lugar de “JUL” na segunda tabela de dias letivos, “Sábado reposição” × “Sábado de reposição”.

## 4. Decisões de transcrição (revise!)

Ao converter para dados, mantive o conteúdo do documento e **anotei** (campo `pendencia`/`obs`) em vez de corrigir às cegas:

- Campus definido como **Esperantina** (confirmado pelo usuário). Itens de Altos removidos; o termo “Barras” fica só como alerta em `referenciasSuspeitas`.
- Término do ano **deixado vazio**, com sugestão (21/12/2027) em Pendências.
- “Férias docentes – 12 dias” recebeu o período **20–31/01** (da tabela de férias coletivas) e a observação correspondente.
- Os eventos “sem data” permanecem sem data.
- Títulos em CAIXA ALTA foram passados para caixa de frase; “Dia da Mães” → “Dia das Mães”; a célula com dois itens (03–05/11) virou dois eventos.
- Linha em branco de setembro descartada; “Páscoa” e “19/03” (só na tabela de feriados) viraram eventos.
- **Regra de dia letivo** (reproduz os números do documento em ABR, MAI, JUN, OUT e NOV): segunda a sexta dentro do semestre, exceto feriados, férias e pontos facultativos; mais sábados letivos.
  Sábados de reposição não contam. As duas exceções são configuráveis.
