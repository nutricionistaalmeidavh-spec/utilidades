# Consumir ArtiSys QA

1. Copie esta pasta como `qa/` no sistema consumidor.
2. Ajuste `qa/artisys-qa.config.json` com `systemId`, `mode`, ambientes e fluxos.
3. Para credenciais, use `valueFromEnv` no fluxo e GitHub Secrets no repositório; nunca grave senha no JSON.
4. Copie o workflow desta pasta para `.github/workflows/qa-capture.yml`.
5. Em Actions > QA Capture, execute `Run workflow` escolhendo fluxo, ambiente e viewport. O resultado fica em Artifacts como `qa-artifacts`.

Para web publicado, use `mode: web` e `baseURL`. Para web local no runner, adicione `startCommand`, `readyUrl` e `baseURL`. Para Electron, use `mode: electron` e informe `electron.entry`; se necessário, informe também `electron.executablePath` relativo à pasta `qa/`.

Um novo sistema só precisa manter os arquivos de `qa/` e seus próprios fluxos. O runtime, Chromium, vídeo, screenshots, trace e telemetria pertencem ao módulo central `artisys-qa`.
