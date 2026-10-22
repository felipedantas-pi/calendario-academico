# Organização Didática do IFPI × Calendário

Fonte analisada: **RN 143/2022 – CONSUP** (25/08/2022), que altera e consolida a Organização Didática (OD) do IFPI, 42 páginas.
Aqui estão só as regras que afetam o calendário acadêmico, e onde cada uma foi implementada no sistema.

> A norma é a fonte; o sistema é uma ferramenta de conferência. Em caso de dúvida, vale o texto oficial e o parecer da Pró-Reitoria de Ensino.

## 1. O que a norma exige do calendário

### 1.1 Mínimos (Art. 26)
- Ano letivo (técnicos integrados, concomitantes/subsequentes e graduação): **mínimo de 200 dias** de trabalho acadêmico efetivo, **excluído o tempo reservado aos exames finais**.
- Semestre letivo: **mínimo de 100 dias**, também sem contar exames finais, **sem interrupção do bimestre ou semestre**.
- O ano letivo é independente do ano civil.

### 1.2 Tramitação (Arts. 29, 33 e 34)
| Regra | Prazo / efeito |
|-------|----------------|
| Cada campus envia a proposta de Calendário Anual à Pró-Reitoria de Ensino | até **90 dias antes** do início do período letivo |
| A PROEN analisa e encaminha à Reitoria → Conselho Superior | até **30 dias úteis** |
| O período letivo só pode começar | **após aprovação do Conselho Superior** |
| Alteração do calendário durante o ano | exige aprovação e homologação do Conselho Superior |
| Divulgação | disponível ao estudante no início de cada período e **obrigatório no site do IFPI** e nos painéis dos campi |

### 1.3 Itens obrigatórios
- **Técnico integrado – Art. 30** (21 itens): matrícula dos aprovados · PRAEI · planejamento bimestral · eleição de representantes · provas · segunda chamada · recuperação paralela · início/fim de bimestres e semestres · início/fim do ano · férias docentes · dias letivos · **sábados letivos** · reposição de aulas · feriados · recesso · comemorações cívicas e sociais · **dias letivos por mês** · prazos de lançamento de notas · reuniões de pais · conselho de classe · outros eventos.
- **Concomitante/subsequente – Art. 31** e **graduação – Art. 32**: listas parecidas (acrescentam matrícula/trancamento/reingresso, Prova Final e, na graduação, colação de grau etc.).
- Art. 63/77: datas das avaliações **bimestrais** e dos **exames finais** vêm do calendário; avaliações mensais ficam a critério do professor.

### 1.4 Regras de avaliação que moldam as datas (curso integrado **anual**, Arts. 74–86)
- 4 bimestres; média bimestral = média aritmética das avaliações; **média anual** = média dos 4 bimestres.
- Aprovação: média ≥ 7,0 em cada disciplina e **frequência ≥ 75%**.
- **Recuperação paralela** ao fim de cada bimestre para quem ficou abaixo de 7,0 – feita em **turno oposto ou aos sábados** (Arts. 100/101/110) e com **prova em período fixado no calendário**. A nota substitui a média bimestral se for maior.
- **Prova Final**: média anual entre 4,0 e 7,0 em até 8 disciplinas; média final = (média anual + prova final) / 2, aprovação ≥ 6,0.
- **Conselho de Classe** para quem não for aprovado em até 3 disciplinas.
- (Para integrado organizado em semestres/módulos valem os Arts. 60–73: Prova Final Semestral com média entre 2,0 e 7,0.)

### 1.5 Prazos em dias úteis que geram datas derivadas
| Regra | Artigo |
|-------|--------|
| Entregar os originais das avaliações à Coordenação **7 dias úteis antes** da aplicação | 64, 78 |
| Devolver as provas corrigidas em até **7 dias úteis** | 61, 75 |
| Pedir segunda chamada em até **72 h úteis** após a prova; aplicação em até 8 dias após o deferimento | 107 |
| Revisão de prova: pedido em 2 dias úteis | 109 |
| Ingressante ausente nos **15 primeiros dias letivos** (sem justificativa) tem a matrícula cancelada | 47, 50 |
| Reposição de aulas pelo professor: até **15 dias úteis** | 22 §6 |
| Regularização de diário/notas: 3 + 2 dias úteis | 22 §2 |

## 2. A regra “20 de cada dia da semana”

Não está escrita na OD com essas palavras. Ela decorre do Art. 26: 100 dias por semestre = **5 dias da semana × 20**.
É o modo de a equipe garantir que **nenhuma disciplina de um dia fixo da semana seja prejudicada** (quem só tem aula às terças não pode ter menos terças que os outros).
Quando um feriado, ponto facultativo etc. remove uma terça, **um sábado letivo repõe aquela terça**.

Como o sistema aplica (aba **Conformidade**):

1. Por semestre, conta as segundas, terças… sextas que **têm aula** (não são feriado, férias, recesso, prova final nem – conforme a configuração – ponto facultativo).
2. Soma os sábados letivos, cada um atribuído ao dia da semana que ele repõe (campo **compensa**).
3. Compara com a meta (padrão **20**, ajustável em Configurações) e mostra “faltam N” / “sobram N”.
4. Sugere **qual sábado usar** (o primeiro sábado livre depois de cada dia perdido), com botão **Registrar**; sugere trocar o dia compensado quando um sobra e outro falta; e informa um início/término que fecharia o semestre.

## 3. O que a análise já mostra no calendário 2027

- **2027.2 fecha:** 20 / 20 / 20 / 20 / 20 = 100 dias. Foi corrigido “Sábado letivo (quinta, **terça**)” (06 e 27/11) para “(quinta, **segunda**)”: a segunda 15/11 é feriado e o sábado de 27/11 a repõe.
- **2027.1** (antes da extensão) começando em **01/03** só tinha **85 dias** (18 / 17 / 18 / 15 / 17): abaixo dos 100 do Art. 26, e o ano soma 185 (< 200).
  Começando em **03/02** (data do 1º bimestre na tabela de bimestres) os totais passam a 20 / 19 / 21 / 19 / 21 = 100. Indício forte de que o início correto é fevereiro; confirmar.
- **2027.1 fechado (cenário aplicado):** início mantido em 01/03/2027; término estendido para **sexta 16/07/2027**, com 20 / 20 / 20 / 20 / 20 = 100 dias.
  Antes faltavam 15 dias e só havia 12 sábados livres, então apenas sábados não bastava. O que foi feito nos dados:
  - término do semestre e do 2º bimestre: 28/06 → **16/07**;
  - avaliações do 2º bimestre: 14–15/06 → **05–06/07**; 2ª chamada e recuperação: 21–25 e 28/06 → **12–16/07**;
  - conselho de classe final: 29/06 → **19/07**;
  - férias docentes de julho: 01–31/07 → **20–31/07** (+ 01–02/08);
  - **2 sábados letivos de quinta:** 27/03 (repõe a quinta 25/03) e 29/05 (repõe a quinta 27/05);
  - **dispensado** o sábado letivo (quarta) de 13/03: ele precederia a quarta perdida (Tiradentes, 21/04) e a repunha antes do semestre começar a perder dias; fica a quarta de 05/06;
  - tabela de bimestres alinhada ao início de 01/03 e removido o evento duplicado, sem data, de início do semestre.
  - Resultado: ano com **200 dias** (100 + 100), o mínimo do Art. 26.
  **Pendência que sobra desta decisão:** as férias docentes ficaram com 26 dos 45 dias (faltam **19** a repor em outro período).
  Alternativa descartada: 09/07 + 6 sábados (9 dias de férias a menos). A aba **Conformidade** continua mostrando os cenários caso um semestre deixe de fechar.
- **Prova final** (17 e 20/12) não conta como dia letivo, e com isso DEZ e o 2º semestre passam a bater com os números do documento (13 e 100).
- Faltam: **término do ano letivo** (Art. 30 IX). O recesso aparece como “quando houver”.
- **Prazo de envio à PROEN:** 90 dias antes de 01/03/2027 = **01/12/2026**.
- **15º dia letivo** (infrequência de ingressantes): 19/03/2027.

## 4. Mapa norma → sistema

| Norma | Onde está implementado |
|-------|------------------------|
| Mínimos 100/200, exames finais fora (Art. 26) | `js/core/normas.js` → `avaliarMinimos`; `prova_final` bloqueia o dia em `data/categorias.json` |
| Sem interrupção de bimestre/semestre | `js/core/validacao.js` (regra `interrupcao-periodo`) |
| Itens obrigatórios (Arts. 30–32) | `data/requisitos-od.json` + `avaliarRequisitos` (modalidade em Configurações) |
| 90 dias / 30 dias úteis (Art. 29) | `data/requisitos-od.json` + `calcularPrazos` |
| 15 dias letivos, 7 dias úteis das provas | `calcularPrazos` |
| 20 por dia da semana + sábados letivos | `js/core/equilibrio.js` |
| Meta e modalidade | `meta.regras.diasPorDiaDaSemana`, `meta.modalidade` no JSON do calendário |

Os números da norma (200, 100, 90, 30, 15, 7) estão em `data/requisitos-od.json`: se a OD mudar, altera-se o dado, não o código.

## 5. Limites desta análise
- O texto foi extraído do PDF (há perda de acentos/ligaduras que não afeta o sentido); a verificação dos itens obrigatórios é **heurística** (categoria + palavras-chave no título).
- “Dias úteis” são segunda a sexta sem feriados cadastrados como `feriado`.
- Planejamento **bimestral** (Art. 30 III): o sistema só confere se há algum evento de planejamento; o calendário 2027 registra um único Encontro Pedagógico (03/08), cobrindo o 3º e o 4º bimestres.
- Não verificado: carga horária por disciplina/PPC, regras de matrícula e de conselho de classe (têm regulamento próprio).
