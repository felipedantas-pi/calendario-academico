# Formato dos dados

Todo o conteúdo do calendário vive em arquivos JSON na pasta [`data/`](../data). A interface, as cores,
a contagem de dias letivos e as validações são **calculadas** a partir deles.

| Arquivo | Conteúdo | Quem edita |
|---------|----------|------------|
| `data/calendario-AAAA.json` | um ano letivo: identificação, semestres, bimestres, eventos | a equipe, pela interface (ou à mão) |
| `data/categorias.json` | legenda: nome, cor, prioridade e efeito no dia letivo | rara; define a identidade visual |
| `data/datas-comemorativas.json` | datas importantes (mês, dia, título) – repetem todo ano | rara |
| `data/requisitos-od.json` | números da Organização Didática (200/100 dias, 90 dias, 15 dias letivos…) e itens obrigatórios por modalidade (Arts. 30–32) | quando a norma mudar |

## `calendario-AAAA.json`

```jsonc
{
  "versao": 1,
  "meta": {
    "ano": 2027,
    "instituicao": "Instituto Federal …",
    "campus": "Esperantina",
    "titulo": "Calendário Acadêmico 2027",
    "subtitulo": "Cursos Técnicos Integrado ao Ensino Médio – Anual",
    "inicio": "2027-03-01",
    "termino": null,                       // null = “a definir”
    "modalidade": "tecnico_integrado",     // define a lista de itens obrigatórios (data/requisitos-od.json)
    "regras": {
      "pontoFacultativoNaoLetivo": true,   // ponto facultativo não conta como dia letivo
      "reposicaoContaComoLetivo": false,   // sábado de reposição não conta
      "diasPorDiaDaSemana": 20             // meta: 20 segundas, 20 terças… por semestre
    },
    "referenciasSuspeitas": ["Altos"],     // termos que não deveriam aparecer (resto de outro campus)
    "informado": {                         // números digitados no documento original, só para comparar
      "diasLetivosSemestre": { "2027.1": 102, "2027.2": 100 },
      "diasLetivosMes": [0, 0, 22, 22, 20, 21, 0, 23, 22, 20, 22, 13],
      "feriasDias": 45
    }
  },
  "semestres": [{ "id": "2027.1", "inicio": "2027-03-01", "fim": "2027-06-28" }],
  "bimestres": [{ "n": 1, "semestre": "2027.1", "inicio": "2027-03-01", "fim": "2027-04-23" }],
  "eventos": [ /* ver abaixo */ ],
  "categorias": [ /* opcional: cores e categorias personalizadas na página, ver abaixo */ ]
}
```

### Evento

```json
{
  "id": "ev036",
  "tipo": "avaliacao",
  "titulo": "Avaliações de 2ª chamada do 2º bimestre / Período de recuperação",
  "periodos": [{ "de": "2027-06-21", "ate": "2027-06-25" }, { "de": "2027-06-28" }]
}
```

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| `id` | gerado | identificador único (`evNNN`) |
| `tipo` | sim | id de uma categoria de `categorias.json` |
| `titulo` | sim | texto exibido |
| `periodos` | sim | lista de `{ de, ate? }` em `AAAA-MM-DD`. Vários períodos = “21 a 25 e 28”. Lista vazia = **sem data** (vai para Pendências) |
| `compensa` | não | só em `sabado_letivo`: dia(s) da semana que o(s) sábado(s) repõe(m) (`["segunda","terça"]`, pode repetir: `["terça","terça"]`). Alimenta o **equilíbrio semanal** (20 por dia da semana) e deve ter um item por sábado |
| `ref` | não | chave de um feriado oficial (`natal`, `carnaval`, `sexta_santa`, `corpus_christi`…). O sistema confere a data |
| `marcos` | não | `inicio_semestre:2027.1`, `termino_bimestre:2`, `termino_ano`… usados para cruzar com semestres/bimestres |
| `obs` | não | observação exibida junto ao evento |
| `pendencia` | não | nota de revisão; aparece em Pendências como observação |
| `diaOriginal` | não | texto do dia no documento antigo, quando não deu para interpretar |

### Categorias personalizadas (`calendario.categorias`, opcional)

Criado pela página em **Mais → Categorias e cores**. Guarda só o que mudou em relação a `data/categorias.json`:

```json
"categorias": [
  { "id": "feriado", "cor": "#112244" },
  { "id": "cat_semana_de_provas", "nome": "Semana de provas", "cor": "#FFD700",
    "estilo": "fundo", "prioridade": 12, "efeitoLetivo": "bloqueia", "personalizada": true }
]
```
Categoria padrão: apenas os campos alterados (`nome`, `cor`, `prioridade`). Categoria nova: objeto completo com `personalizada: true`; o efeito pode ser `nenhum`, `bloqueia` ou `adiciona`. A cor do texto é calculada pelo contraste. Ao criar um ano novo as personalizações são copiadas.

### Categorias (`categorias.json`)

| Campo | Descrição |
|-------|-----------|
| `estilo` | `fundo` (pinta o dia), `negrito`, `contorno`, `marcador` (pontinho) |
| `prioridade` | menor número vence quando um dia tem mais de uma categoria de fundo |
| `efeitoLetivo` | `bloqueia` (feriado, férias, recesso, **prova final**), `ponto` (bloqueia conforme a regra), `adiciona` (sábado letivo), `reposicao` (conforme a regra) ou `nenhum` |
| `legenda` | `true` = aparece na legenda principal; `false` = “marcador” |

## Validações (aba Pendências)

Implementadas em [`js/core/validacao.js`](../js/core/validacao.js); rode no terminal com `npm run validar`.

| Nível | Regras |
|-------|--------|
| **erro** | dia compensado que não é segunda–sexta · data inexistente · período invertido · sábado letivo/reposição que não cai em sábado · sábado letivo em feriado · feriado fora da data oficial (`ref`) · título vazio |
| **aviso** | equilíbrio semanal (faltam/sobram dias de um dia da semana) · sábado letivo sem dia compensado · semestre/ano abaixo de 100/200 dias · férias dentro de semestre · item obrigatório do Art. 30 ausente · prazo de envio à PROEN vencido · evento sem data · marco duplicado · marco × semestre/bimestre divergente · bimestre começa antes do semestre · término do ano vazio · dias letivos informados × calculados (semestre e mês) · total de férias · menção a outro campus · sábados × dias compensados · avaliação fora de dia letivo |
| **info** | notas do documento original · feriado em fim de semana · sábado letivo e reposição no mesmo dia |

Para acrescentar uma regra, adicione um bloco em `validarCalendario()` chamando `add(nivel, regra, titulo, detalhe, extra)` e um teste em `tests/core.test.js`.
