# Módulos ArtiSys reutilizáveis

Esta pasta contém integrações próprias construídas sobre os upstreams aprovados em `projects/`.

Nenhum módulo pode exigir servidor, daemon, banco dedicado, VPS, PC ligado ou runner self-hosted permanente. Módulos `stable` têm código executável, testes, licença local, exemplo e verificação automatizada.

## Módulos atuais

| Módulo | Estado | Função |
|---|---|---|
| `artisys-qa` 1.1.1 | stable | Playwright/Chromium, evidências e demos |
| `artisys-pdf` 1.0.0 | stable | geração, visualização e anotações PDF |
| `artisys-workflows` 1.0.0 | stable | grafos, dependências e adapters visuais |
| `artisys-capture` 1.0.0 | stable | câmera/arquivo, QR/barcode e OpenCV |
| `artisys-dashboard` 1.0.0 | stable | grids, painéis redimensionáveis e data grid |
| `artisys-planning` 1.0.0 | stable | Gantt, calendário, progresso e conflitos |
| `artisys-media` 1.0.0 | stable | áudio/vídeo e manifestos de motion |
| `artisys-office` 1.0.0 | stable | DOCX, workbook Univer e jobs PPT |
| `artisys-ui-builder` 1.0.0 | stable | schema de páginas + GrapesJS/Puck/Craft |
| `artisys-security` 0.2.0 | implemented | Gitleaks + Trivy + Semgrep |
| `artisys-documents` 0.2.0 | implemented | PaddleOCR + OpenCV |
| `artisys-api-contracts` 0.2.0 | implemented | OpenAPI Generator + Pact JS |
| `artisys-ai-quality` 0.1.0 | foundation | Promptfoo |
| `artisys-privacy` 0.1.0 | foundation | Presidio local/CI |
| `artisys-bim` 0.1.0 | foundation | IfcOpenShell local sob demanda |

## Integração

O consumidor usa o contrato ArtiSys. Regras de negócio, persistência, permissões e styling continuam no repositório do produto. Não copie `projects/<upstream>` para dentro do produto.

Consulte `../docs/MODULE_KITS.md` e `../docs/INTEGRATION_GUIDE.md`.
