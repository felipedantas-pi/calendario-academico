# Guia: GitHub e trabalho em mais de um computador

Objetivo: ter **uma cópia oficial do projeto no GitHub** e poder continuar em outro computador (com outro Claude) sem perder dados nem contexto.

O contexto para o Claude já está no repositório: o arquivo [`CLAUDE.md`](../CLAUDE.md) (na raiz) é lido sozinho quando o Claude Code abre a pasta.
A “memória” do Claude **não** viaja entre computadores; por isso esse arquivo existe. Mantenha-o atualizado quando decisões mudarem.

## 1. Antes de começar (uma vez, por computador)

1. Crie uma conta em <https://github.com>, se ainda não tiver.
2. Instale o **Git** (<https://git-scm.com/download/win>). Opcional e recomendado: **GitHub CLI** (`winget install GitHub.cli`), que facilita o login.
3. Diga ao Git quem você é:
   ```bash
   git config --global user.name "Seu Nome"
   git config --global user.email "seu-email@exemplo.com"
   ```

## 2. Criar o repositório e enviar o projeto (primeira vez)

**Decida a visibilidade.**
- **Privado:** só você (e quem convidar) vê. Recomendado enquanto o calendário está “em elaboração”.
- **Público:** qualquer pessoa vê. O **GitHub Pages gratuito exige repositório público** (planos pagos permitem Pages em repositório privado; confira as condições atuais no GitHub). O logotipo e o texto são institucionais: alinhe com a instituição antes de tornar público.

**Opção A – pelo navegador**
1. No GitHub: **New repository** → nome sugerido `calendario-academico-ifpi` → escolha Private/Public → **não** marque “Add a README” (o projeto já tem um) → **Create repository**.
2. Na pasta do projeto (`calendario-academico`), no terminal (PowerShell ou Git Bash):
   ```bash
   git init -b main
   git add -A
   git commit -m "Primeira versão do Calendário Acadêmico IFPI"
   git remote add origin https://github.com/SEU-USUARIO/calendario-academico-ifpi.git
   git push -u origin main
   ```
   Na primeira vez o Windows abre uma janela para você entrar no GitHub.

**Opção B – com o GitHub CLI (um comando só)**
```bash
gh auth login                       # escolha GitHub.com → HTTPS → login pelo navegador
git init -b main
git add -A
git commit -m "Primeira versão do Calendário Acadêmico IFPI"
gh repo create calendario-academico-ifpi --private --source=. --push
```

Confira o que será enviado **antes** do `git add -A`: `git status`. Não devem aparecer `node_modules/` nem `.claude/` (o `.gitignore` já cuida disso).

## 3. Publicar o site (opcional) – GitHub Pages
1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. A cada `git push` na `main`, o fluxo `.github/workflows/pages.yml` roda os testes e publica em `https://SEU-USUARIO.github.io/calendario-academico-ifpi/`.
3. Se algum teste falhar, o site não é publicado: veja a aba **Actions**. (Só **erros** quebram a publicação; avisos de “calendário em elaboração” não.)

## 4. Continuar em outro computador
1. Instale Git (e Node.js, se quiser rodar os testes: <https://nodejs.org>; o site em si não precisa de Node).
2. Baixe o projeto:
   ```bash
   git clone https://github.com/SEU-USUARIO/calendario-academico-ifpi.git
   cd calendario-academico-ifpi
   ```
   Repositório privado: o Git pede login; use a mesma conta (ou `gh auth login`).
3. Rode o site: `python -m http.server 5173` (ou `scripts/servir.bat`) e abra `http://localhost:5173`.
4. Abra o **Claude Code** nessa pasta. Ele lê o `CLAUDE.md` e já sabe o contexto. Primeira mensagem sugerida:
   > Leia o CLAUDE.md, rode os testes e a validação e me diga o estado atual do calendário.

> **Importante:** na página o seu trabalho fica num *rascunho do navegador* (cada computador/navegador tem o seu). Sempre que quiser levar edições para outro lugar, use
> **Exportar → Backup (JSON)** e substitua `data/calendario-2027.json`, depois faça o commit (seção 5).

## 5. Rotina de trabalho (todo dia)

**Ao começar** (traz o que foi enviado por outro computador/pessoa):
```bash
git pull
```
Se você tem um rascunho antigo no navegador, use **Mais → Restaurar original** para carregar o JSON atualizado do arquivo.

**Ao terminar:**
1. Na página: **Exportar → Backup (JSON)**.
2. Substitua `data/calendario-2027.json` pelo arquivo baixado.
3. Envie:
   ```bash
   git status                         # veja o que mudou
   git add -A
   git commit -m "Calendário: ajusta férias docentes e término de julho"
   git push
   ```
   Escreva a mensagem dizendo **o que mudou no calendário** (o histórico vira o “diário” do projeto).

Dicas:
- `git log --oneline -- data/calendario-2027.json` mostra o histórico das versões do calendário; `git diff` mostra o que mudou entre elas.
- Para marcar uma versão importante (ex.: a enviada à PROEN): `git tag -a v2027-proen -m "Versão enviada à PROEN"` e `git push --tags`.
- Voltou atrás? `git restore data/calendario-2027.json` descarta mudanças **ainda não commitadas** desse arquivo.

## 6. Evitando conflitos
- O JSON é um arquivo só: **duas pessoas editando ao mesmo tempo** gera conflito difícil de resolver. Combine: **uma pessoa edita por vez**, sempre com `git pull` antes e `git push` depois.
- Se houver conflito no JSON: não tente mesclar à mão. Escolha a versão que vale (`git checkout --theirs data/calendario-2027.json` ou `--ours`), exporte de novo pela página o que faltar e faça o commit.
- Para trabalho em equipe maior: use **branches** e **Pull Requests** (`git switch -c ajuste-julho` → commit → push → abrir PR no GitHub → revisão → merge), assim a `main` sempre é a versão válida.

## 7. O que vai e o que não vai para o repositório
| Vai | Não vai |
|-----|---------|
| código (`js/`, `css/`, `index.html`), `data/`, `docs/`, `tests/`, `CLAUDE.md`, `.github/` | `node_modules/`, `.claude/` (configurações locais), arquivos temporários |
| `docs/referencia/*.pdf` (minuta do calendário e Organização Didática) | o `.docx` original de 4,3 MB (opcional: ponha em `docs/referencia/` se quiser guardar; o PDF equivale) |

Cuidado: o repositório guarda **todo o histórico**. Não envie senhas, tokens, documentos pessoais de alunos ou servidores.

## 8. Sem GitHub: copiar a pasta
Se só precisar levar o projeto agora: compacte a pasta `calendario-academico` (sem `node_modules`) em um `.zip`, copie para o outro computador e descompacte. O `CLAUDE.md` vai junto.
Depois vale criar o repositório para ter histórico e cópia de segurança.

## 9. Problemas comuns
| Sintoma | Causa / solução |
|---------|-----------------|
| `git push` pede login e falha | rode `gh auth login`, ou use um *Personal Access Token* como senha (GitHub → Settings → Developer settings) |
| “rejected … fetch first” | alguém (ou outro computador) enviou antes: `git pull` e depois `git push` |
| Site publicado sem as mudanças | veja **Actions** (teste falhou?) e force atualização com Ctrl+F5 |
| Página em branco no computador novo | está abrindo `index.html` direto; use o servidor local (seção 4) |
| Mudei o JSON e a página não mudou | rascunho do navegador tem prioridade: **Mais → Restaurar original** |
