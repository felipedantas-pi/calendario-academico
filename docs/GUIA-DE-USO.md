# Guia de uso: o que dá para fazer na página e o que exige código

## 1. Pela própria página (sem programar)

Abra o site (ver README, “Como rodar”). Tudo abaixo é feito com cliques e formulários.

### Eventos
| Quero… | Como |
|--------|------|
| Ver o que acontece em um dia | **Calendário** → clique no dia |
| Registrar algo | menu **+ Registrar** (topo): **evento, sábado letivo, ponto facultativo, feriado, sábado de reposição, recesso, prova final**. Ou clique no dia → **+ Evento neste dia** |
| Registrar um **sábado letivo** | **+ Registrar → Sábado letivo**; escolha a data e **quantos dias de cada dia da semana ele repõe** (ex.: terça = 1). O formulário mostra o que ainda falta no semestre |
| Registrar um **ponto facultativo** | **+ Registrar → Ponto facultativo** (conta ou não como dia letivo, conforme Configurações) |
| Editar / excluir / duplicar | aba **Eventos** → clique na linha para editar; ⧉ duplica e 🗑 exclui. Também: clique no dia → **Editar** |
| Evento com vários períodos (“21 a 25 e 28”) | no formulário, **+ Adicionar período** |
| Evento de um dia só | preencha só o campo **De** |
| Sábado letivo | categoria **Sábados letivos**; informe os dias úteis compensados (“segunda, terça”) |
| Marcar algo para revisar depois | campo **Nota de revisão** (vai para a aba Pendências) |
| Procurar | aba **Eventos**: busca, filtro por categoria, por mês, “só com pendência” |
| Desfazer um erro | **↶** no topo, **Ctrl+Z**, ou o botão “Desfazer” que aparece após salvar |

### Dados gerais
| Quero… | Como |
|--------|------|
| Trocar campus, título, subtítulo | **Mais → Configurações** |
| Preencher o **término** do ano letivo | **Mais → Configurações → Ano letivo** |
| Ajustar semestres e bimestres (datas, adicionar/remover) | **Mais → Configurações** |
| Decidir se ponto facultativo / sábado de reposição contam como dia letivo, ou mudar a meta de 20 dias por dia da semana | **Mais → Configurações → Regras** |
| Trocar a modalidade (integrado, subsequente, graduação) | **Mais → Configurações** |
| **Escolher a cor** de uma categoria, renomear, **criar categorias novas** (ex.: “Semana de provas”) | **Mais → Categorias e cores…** (ou botão 🎨 na legenda do calendário). Fica salvo no navegador; **Exportar → Backup (JSON)** e substitua `data/calendario-AAAA.json` para tornar permanente |
| Criar o calendário de outro ano | **Mais → Novo ano letivo…** (já traz feriados, inclusive Carnaval, Sexta-feira Santa e Corpus Christi calculados) |
| Voltar para outro ano já aberto | **Mais → Abrir ano** |
| Incluir/remover uma data comemorativa | aba **Datas importantes** (para corrigir um título: remova e inclua de novo) |

### Conferir
| Quero… | Como |
|--------|------|
| Ver o que está inconsistente | aba **Pendências** (botões levam ao evento ou às configurações) |
| Conferir **20 de cada dia da semana** por semestre e usar sábados letivos | aba **Conformidade** → “Equilíbrio semanal”; os botões **Registrar** criam o sábado sugerido |
| Ver **cenários** para fechar um semestre curto (estender o término × sábados letivos) | aba **Conformidade**, abaixo da tabela do semestre |
| Conferir com a **Organização Didática** | aba **Conformidade**: mínimos (100/200 dias), itens obrigatórios do Art. 30 e prazos (ex.: envio à PROEN) |
| Ver só uma categoria no calendário | clique na **legenda** (clique de novo para limpar) |
| Comparar dias letivos calculados × documento | aba **Resumo** e os cartões do topo |

### Guardar, compartilhar, imprimir
| Quero… | Como |
|--------|------|
| PDF / papel | **Exportar → Imprimir / salvar como PDF** (A4: calendário, eventos, resumo, datas) |
| Planilha | **Exportar → Planilha (CSV)** (abre no Excel) |
| Agenda | **Exportar → Agenda (ICS)** (Google Agenda, Outlook, celular) |
| Backup / versionar | **Exportar → Backup (JSON)** |
| Abrir um JSON | **Mais → Importar JSON…** |
| Descartar edições do calendário original | **Mais → Restaurar original** |
| Tema claro/escuro | botão ☾/☀ no topo |

> **Atenção:** as edições ficam salvas **somente neste navegador e neste computador** (“rascunho”).
> Limpar os dados do site apaga o rascunho, e outra pessoa não vê o que você editou.
> Para guardar ou compartilhar, use **Exportar → Backup (JSON)** com frequência e envie o arquivo (ou coloque-o no repositório, ver seção 3).

## 2. Só pelo código/arquivos

Abra a pasta no **VS Code**. Edite, salve e atualize o navegador (com a extensão *Live Server*, atualiza sozinho).

| Quero mudar… | Arquivo | Observação |
|--------------|---------|-----------|
| Cor **padrão** de uma categoria para todos os calendários (a cor do SEU calendário se muda na página, ver seção 1) | `data/categorias.json` | muda calendário, tabelas, impressão e legenda ao mesmo tempo |
| Criar categoria nova **padrão** para todos os calendários | `data/categorias.json` (para o seu calendário, crie na página: Mais → Categorias e cores) | depois ela aparece no formulário de evento. `estilo`: `fundo`, `negrito`, `contorno` ou `marcador`; `efeitoLetivo`: `bloqueia`, `adiciona`, `ponto`, `reposicao` ou `nenhum` |
| Cores gerais do site, fontes, bordas, tema escuro | `css/tokens.css` | |
| **Logo** | `assets/img/logo-ifpi.png` | mesmo nome, ou altere em `js/ui/cabecalho.js` |
| Aparência do calendário, tabelas, janelas, impressão | `css/calendario.css`, `tabelas.css`, `dialogos.css`, `impressao.css` | |
| Textos fixos da interface (nomes de abas, botões, mensagens) | `js/main.js` (abas) e `js/ui/*.js` | |
| **Regra de dia letivo** | `js/core/diasLetivos.js` | hoje: seg–sex no semestre, exceto feriado/férias/ponto; + sábados letivos |
| **Novas validações** (“avise se…”) | `js/core/validacao.js` + teste em `tests/core.test.js` | |
| Lista de feriados fixos/móveis usada no “Novo ano” e na conferência | `js/core/feriados.js` | ex.: incluir feriado municipal fixo de Esperantina |
| Números e itens obrigatórios da Organização Didática (200/100 dias, 90 dias, lista do Art. 30…) | `data/requisitos-od.json` | só dados; sem mexer no código |
| Regra de equilíbrio semanal e sugestão de sábados | `js/core/equilibrio.js` | |
| Termos de alerta de outro campus | `data/calendario-AAAA.json` → `meta.referenciasSuspeitas` | |
| Números “informados” do documento antigo (para comparar) | `data/calendario-AAAA.json` → `meta.informado` | pode apagar o bloco quando não precisar mais |
| **Edição em lote** (mudar 20 eventos de uma vez, copiar de outro ano) | `data/calendario-AAAA.json` | um evento por linha; ver [DADOS.md](DADOS.md) |
| Datas comemorativas padrão (valem para anos novos) | `data/datas-comemorativas.json` | |
| Novo tipo de exportação, nova aba, novo gráfico | `js/export/`, `js/ui/visao-*.js`, `js/main.js` | |
| Publicar na internet | Git/GitHub (ver README, “Publicar no GitHub Pages”) | |

### Pegadinha importante
Se você editou pela página, **existe um rascunho no navegador que tem prioridade** sobre o arquivo `data/calendario-2027.json`.
Ao alterar o JSON à mão e não ver mudança: use **Mais → Restaurar original** (descarta o rascunho) ou exporte o rascunho e substitua o JSON.

## 3. Fluxo recomendado para a equipe

1. Edite pela página e confira a aba **Pendências**.
2. **Exportar → Backup (JSON)**.
3. Substitua `data/calendario-AAAA.json` no repositório e faça o commit (o histórico do Git mostra quem mudou qual data).
4. O GitHub roda os testes e publica a nova versão.

Teste antes de enviar (opcional, precisa do Node.js):

```bash
npm run validar
```

## 4. Resumo

| | Pela página | Por código |
|---|:---:|:---:|
| Criar, editar, excluir, duplicar eventos | ✔ | ✔ |
| Datas de semestres/bimestres, término, campus, título | ✔ | ✔ |
| Duas regras de contagem de dias letivos | ✔ | ✔ |
| Novo ano com feriados calculados | ✔ | ✔ |
| Exportar PDF, CSV, ICS, JSON / importar JSON | ✔ | ✔ |
| Incluir/remover datas comemorativas | ✔ | ✔ |
| Mudar cores, criar categorias | – | ✔ |
| Mudar visual, logo, textos da interface | – | ✔ |
| Criar novas validações ou mudar a regra de dia letivo | – | ✔ |
| Salvar de forma compartilhada / publicar | – (exporta o JSON) | ✔ Git/GitHub |
