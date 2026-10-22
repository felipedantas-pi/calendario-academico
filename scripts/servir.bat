@echo off
REM Servidor local para o calendário (módulos ES e fetch não funcionam em file://).
REM Dê dois cliques neste arquivo e abra http://localhost:5173
cd /d "%~dp0.."
where python >nul 2>nul && (
  echo Servindo em http://localhost:5173  ^(Ctrl+C para parar^)
  start "" http://localhost:5173
  python -m http.server 5173
  goto :eof
)
where npx >nul 2>nul && (
  start "" http://localhost:5173
  npx --yes serve . -l 5173
  goto :eof
)
echo Instale o Python (python.org) ou o Node.js (nodejs.org), ou use a extensao "Live Server" do VS Code.
pause
