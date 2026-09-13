# Módulos ArtiSys reutilizáveis

Esta pasta contém integrações próprias construídas sobre os upstreams curados em `projects/` e `catalog/incorporated-repos-2026-09-10.json`.

Nenhum módulo pode exigir servidor, daemon, banco dedicado, VPS, PC ligado ou runner self-hosted permanente. Módulos `stable` têm código executável, testes, licença local, exemplo e verificação automatizada; módulos `implemented` já têm contrato/código/testes, mas ainda exigem homologação no produto consumidor.

## Como os módulos são nomeados

Cada módulo possui dois nomes:

- **Nome amigável em português:** usado para leitura, catálogo, documentação e escolha do recurso.
- **ID técnico:** permanece no formato `artisys-*` e não é renomeado, para preservar imports, scripts, automações e compatibilidade.

A fonte de apresentação em pt-BR é `../catalog/module-display.pt-BR.json`.

## Módulos atuais

| Nome em português | ID técnico | Categoria | Estado | Para que serve |
|---|---|---|---|---|
| Testes e Controle de Qualidade | `artisys-qa` 2.4.1 | Qualidade e Entrega | stable | Testes de interface, evidências, demos e validação visual opcional |
| Geração e Leitura de PDFs | `artisys-pdf` 1.0.0 | Documentos e Mídia | stable | Geração, visualização, destaques e anotações em PDF |
| Fluxos de Trabalho Visuais | `artisys-workflows` 1.0.0 | Interface e Produtividade | stable | Grafos, dependências, processos e editores visuais |
| Captura por Câmera e Códigos | `artisys-capture` 1.0.0 | Arquivos e Captura | stable | Câmera/arquivo, QR code, código de barras e visão computacional |
| Painéis e Indicadores | `artisys-dashboard` 1.0.0 | Interface e Produtividade | stable | Dashboards, painéis redimensionáveis e grades de dados |
| Planejamento e Cronogramas | `artisys-planning` 1.0.0 | Interface e Produtividade | stable | Gantt, calendário, progresso e conflitos de recursos |
| Áudio, Vídeo e Animações | `artisys-media` 1.0.0 | Documentos e Mídia | stable | Operações reutilizáveis de mídia e manifestos de animação |
| Documentos e Planilhas Office | `artisys-office` 1.0.0 | Documentos e Mídia | stable | DOCX, planilhas e apresentações |
| Construtor de Interfaces | `artisys-ui-builder` 1.0.0 | Interface e Produtividade | stable | Páginas e blocos de interface editáveis e portáveis |
| Envio e Validação de Arquivos | `artisys-upload` 1.0.0 | Arquivos e Captura | stable | Upload, políticas, validação, filas e seleção de arquivos |
| Organização e Exploração de Arquivos | `artisys-files` 0.1.0 | Arquivos e Captura | implemented | Workspace espelhado em pasta local, árvore, drag-and-drop, busca e watcher de arquivos |
| Anotações em Imagens e PDFs | `artisys-annotations` 1.0.0 | Documentos e Mídia | stable | Marcações e anotações sobre imagens e PDFs |
| Integração com Dispositivos Seriais | `artisys-serialport` 0.1.0 | Desktop e Hardware | implemented | Balanças, gavetas e equipamentos conectados por porta serial |
| Impressão, Cupons e Etiquetas | `artisys-printing` 0.1.0 | Desktop e Hardware | implemented | Recibos, cupons, etiquetas e impressão térmica |
| Segurança Automatizada | `artisys-security` 0.2.0 | Qualidade e Entrega | implemented | Verificação de segredos, vulnerabilidades e análise estática |
| Leitura e Processamento de Documentos | `artisys-documents` 0.2.0 | Documentos e Mídia | implemented | Extração e processamento de documentos com OCR e visão computacional |
| Contratos e Compatibilidade de APIs | `artisys-api-contracts` 0.2.0 | Qualidade e Entrega | implemented | Contratos OpenAPI, compatibilidade e testes entre serviços |
| Processamento e Edição de Vídeo | `artisys-video-engine` 0.1.0 | Documentos e Mídia | implemented | Jobs, timeline e processamento local de vídeo |
| Conversão de Documentos | `artisys-doc-convert` 0.1.0 | Documentos e Mídia | implemented | Conversão local de documentos entre formatos |
| Backend Local Embutido | `artisys-local-backend` 0.1.0 | Plataforma e Dados | implemented | API e persistência local opcionais no próprio dispositivo |
| Suporte Remoto | `artisys-remote-support` 0.1.0 | Desktop e Hardware | implemented | Sessões controladas de suporte remoto |
| Empacotamento e Publicação | `artisys-release` 0.1.0 | Qualidade e Entrega | implemented | Gates de QA, segurança, assinatura, hashes e release |
| Validação de Instaladores e Releases | `artisys-release-validator` 0.1.0 | Qualidade e Entrega | implemented | Instalador, stress, upgrade, integridade e relatórios |
| Estrutura Base para Aplicativos Desktop | `artisys-desktop-shell` 0.1.0 | Desktop e Hardware | implemented | Deep links, configurações, logs e hooks de atualização |
| Reconhecimento de Texto (OCR) | `artisys-ocr` 0.1.0 | Documentos e Mídia | implemented | Interface única para OCR local e no navegador |
| Validação Completa do Produto | `artisys-product-qa` 0.1.0 | Qualidade e Entrega | implemented | Agregação de QA, segurança e contratos de API |
| Licenciamento Offline | `artisys-licensing` 0.1.0 | Plataforma e Dados | implemented | Licença local, expiração, vínculo a dispositivo e features |
| Testes e Qualidade de IA | `artisys-ai-quality` 0.2.0 | Qualidade e Entrega | implemented | Avaliação de prompts, respostas e regressões de IA |
| Privacidade e Proteção de Dados | `artisys-privacy` 0.2.0 | Qualidade e Entrega | implemented | Detecção, anonimização e mascaramento de dados pessoais |
| Leitura e Processamento BIM/IFC | `artisys-bim` 0.2.0 | Engenharia e BIM | implemented | IFC, propriedades, quantidades e informações BIM |
| Comunicação entre Módulos | `artisys-eventbus` 0.2.0 | Plataforma e Dados | implemented | Eventos desacoplados entre partes do sistema, browser e workers |
| Backup e Restauração | `artisys-backup` 0.2.0 | Plataforma e Dados | implemented | Backup, retenção, hashes e verificação de integridade |
| Importação de Dados | `artisys-importer` 0.1.0 | Plataforma e Dados | implemented | Mapeamento, pré-visualização e validação de importações |
| Motor Financeiro e Conciliação | `artisys-finance-domain` 0.1.0 | Gestão e Operação | implemented | Regras financeiras, duplicidades, transferências e conciliação |
| Acesso e Permissões | `artisys-auth-rbac` 0.2.0 | Plataforma e Dados | implemented | Autenticação, papéis, permissões, sessões e guards |
| Armazenamento de Dados | `artisys-storage` 0.2.1 | Plataforma e Dados | implemented | Memória, SQLite local, migrations e namespaces |
| Histórico e Auditoria | `artisys-audit-log` 0.1.0 | Plataforma e Dados | implemented | Registro de ator, ação, entidade e metadados |
| Sincronização de Dados | `artisys-sync` 0.2.0 | Plataforma e Dados | implemented | Fila offline, novas tentativas e resolução de conflitos |
| Aplicativo Web Instalável e Offline | `artisys-pwa-runtime` 0.1.0 | Aplicativos Web e Mobile | implemented | Cache, precache, fallback, instalação e atualização PWA |
| Integração Web ↔ Aplicativo | `artisys-webview-bridge` 0.1.0 | Aplicativos Web e Mobile | implemented | Comunicação validada entre WebView e aplicativo nativo |
| Estoque e Movimentações | `artisys-inventory` 0.2.0 | Gestão e Operação | implemented | Entradas, saídas, reservas, lotes, séries e saldo disponível |
| Ordens de Serviço | `artisys-os` 0.1.0 | Gestão e Operação | implemented | Abertura, estados, transições e histórico de OS |
| Catálogo de Produtos e Serviços | `artisys-catalog` 0.1.0 | Gestão e Operação | implemented | Produtos, serviços, variantes, busca e ativação |
| Preços, Descontos e Combos | `artisys-pricing` 0.1.0 | Gestão e Operação | implemented | Preço por quantidade, faixas, descontos, combos e cálculo de linha |
| Configurações do Sistema | `artisys-settings` 0.1.0 | Plataforma e Dados | implemented | Preferências, defaults e namespaces de configuração |
| Multiempresa e Isolamento de Dados | `artisys-multitenancy` 0.1.0 | Plataforma e Dados | implemented | Separação entre empresas/clientes e proteção do escopo de dados |
| Ativação Controlada de Funcionalidades | `artisys-feature-flags` 0.1.0 | Plataforma e Dados | implemented | Liga/desliga recursos por padrão, empresa ou usuário |
| Checklists e Inspeções | `artisys-checklists` 0.1.0 | Gestão e Operação | implemented | Listas de verificação, evidências, progresso e conclusão |
| Relatórios e Indicadores | `artisys-reporting` 0.1.0 | Gestão e Operação | implemented | Filtros, agrupamentos, agregações e exportação CSV |

## Categorias padronizadas

- **Qualidade e Entrega:** testes, segurança, contratos, releases e validações.
- **Documentos e Mídia:** PDFs, OCR, documentos, vídeo, áudio e anotações.
- **Interface e Produtividade:** dashboards, planejamento, workflows e construtores de UI.
- **Arquivos e Captura:** upload, explorer/workspaces locais, câmera, QR code, código de barras e entrada de arquivos.
- **Desktop e Hardware:** impressão, serial, suporte remoto e infraestrutura desktop.
- **Plataforma e Dados:** autenticação, storage, backup, sincronização, auditoria e recursos transversais.
- **Aplicativos Web e Mobile:** PWA e comunicação WebView/nativo.
- **Gestão e Operação:** financeiro, estoque, OS, catálogo, preços, checklists e relatórios.
- **Engenharia e BIM:** recursos técnicos específicos reutilizáveis para engenharia.

## Integração

O consumidor usa o contrato ArtiSys. Regras de negócio, persistência, permissões, styling, credenciais e runtimes opcionais continuam no repositório do produto. Não copie upstreams completos para dentro do produto.

Para fluxos financeiros, normalize/importe dados no consumidor (ou com `artisys-importer`/`artisys-pdf`/`artisys-ocr`) e envie a transação canônica para `artisys-finance-domain`; o módulo não assume banco, API ou provedor externo.

Consulte `../docs/MODULE_KITS.md`, `../docs/INTEGRATION_GUIDE.md` e `../catalog/module-display.pt-BR.json`.
