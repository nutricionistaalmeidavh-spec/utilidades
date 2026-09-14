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
| Testes e Controle de Qualidade | `artisys-qa` 2.4.1 | Qualidade e Entrega | stable | Executa testes de interface, evidências, demonstrações e validação visual opcional. |
| Geração e Leitura de PDFs | `artisys-pdf` 1.0.0 | Documentos e Mídia | stable | Gera, visualiza, destaca e anota documentos PDF. |
| Fluxos de Trabalho Visuais | `artisys-workflows` 1.0.0 | Interface e Produtividade | stable | Modela fluxos, dependências e processos com editores visuais. |
| Captura por Câmera e Códigos | `artisys-capture` 1.0.0 | Arquivos e Captura | stable | Captura câmera ou arquivo e lê QR codes, códigos de barras e imagens. |
| Painéis e Indicadores | `artisys-dashboard` 1.0.0 | Interface e Produtividade | stable | Monta dashboards, painéis redimensionáveis, grades e visualizações de dados. |
| Planejamento e Cronogramas | `artisys-planning` 1.0.0 | Interface e Produtividade | stable | Gerencia Gantt, calendário, progresso, recursos e conflitos de planejamento. |
| Áudio, Vídeo e Animações | `artisys-media` 1.0.0 | Documentos e Mídia | stable | Fornece operações reutilizáveis para mídia, áudio, vídeo e manifestos de animação. |
| Documentos e Planilhas Office | `artisys-office` 1.0.0 | Documentos e Mídia | stable | Manipula documentos, planilhas e apresentações em formatos de escritório. |
| Construtor de Interfaces | `artisys-ui-builder` 1.0.0 | Interface e Produtividade | stable | Cria páginas e blocos de interface editáveis e portáveis. |
| Envio e Validação de Arquivos | `artisys-upload` 1.0.0 | Arquivos e Captura | stable | Controla upload, políticas, validações, filas e seleção de arquivos. |
| Organização e Exploração de Arquivos | `artisys-files` 0.1.0 | Arquivos e Captura | implemented | Cria workspaces espelhados em pastas locais com árvore, drag-and-drop, busca e acompanhamento de alterações. |
| Anotações em Imagens e PDFs | `artisys-annotations` 1.0.0 | Documentos e Mídia | stable | Adiciona marcações e anotações reutilizáveis em imagens e documentos PDF. |
| Integração com Dispositivos Seriais | `artisys-serialport` 0.1.0 | Desktop e Hardware | implemented | Conecta balanças, gavetas e outros equipamentos por porta serial. |
| Impressão, Cupons e Etiquetas | `artisys-printing` 0.1.0 | Desktop e Hardware | implemented | Gera e imprime recibos, cupons, etiquetas e saídas para impressoras térmicas. |
| Segurança Automatizada | `artisys-security` 0.2.0 | Qualidade e Entrega | implemented | Verifica segredos expostos, vulnerabilidades e problemas estáticos de segurança. |
| Leitura e Processamento de Documentos | `artisys-documents` 0.2.0 | Documentos e Mídia | implemented | Extrai e processa conteúdo de documentos e imagens com OCR e visão computacional. |
| Contratos e Compatibilidade de APIs | `artisys-api-contracts` 0.2.0 | Qualidade e Entrega | implemented | Valida contratos de API, compatibilidade entre serviços e clientes gerados. |
| Processamento e Edição de Vídeo | `artisys-video-engine` 0.1.0 | Documentos e Mídia | implemented | Executa jobs e timelines locais para processamento e composição de vídeo. |
| Conversão de Documentos | `artisys-doc-convert` 0.1.0 | Documentos e Mídia | implemented | Converte documentos entre formatos sob demanda, sem serviço externo obrigatório. |
| Backend Local Embutido | `artisys-local-backend` 0.1.0 | Plataforma e Dados | implemented | Fornece backend local opcional para aplicações que precisam de API e persistência no próprio dispositivo. |
| Suporte Remoto | `artisys-remote-support` 0.1.0 | Desktop e Hardware | implemented | Abre sessões controladas de suporte remoto para aplicativos desktop. |
| Empacotamento e Publicação | `artisys-release` 0.1.0 | Qualidade e Entrega | implemented | Orquestra validações, assinatura, hashes e etapas necessárias para publicar uma versão. |
| Validação de Instaladores e Releases | `artisys-release-validator` 0.1.0 | Qualidade e Entrega | implemented | Testa instaladores, atualização, stress e integridade antes da distribuição. |
| Estrutura Base para Aplicativos Desktop | `artisys-desktop-shell` 0.1.0 | Desktop e Hardware | implemented | Padroniza estrutura desktop, deep links, configurações, logs e hooks de atualização. |
| Abertura de Conversas no WhatsApp | `artisys-whatsapp-launcher` 0.1.0 | Aplicativos Web e Mobile | implemented | Abre WhatsApp ou WhatsApp Web com número e mensagem pré-preenchidos, sem envio automático obrigatório. |
| Reconhecimento de Texto (OCR) | `artisys-ocr` 0.1.0 | Documentos e Mídia | implemented | Oferece uma interface única para reconhecer texto em imagens e documentos. |
| Validação Completa do Produto | `artisys-product-qa` 0.1.0 | Qualidade e Entrega | implemented | Agrupa QA, segurança e contratos de API para validar um produto de ponta a ponta. |
| Licenciamento Offline | `artisys-licensing` 0.1.0 | Plataforma e Dados | implemented | Gerencia licenças locais, expiração, vínculo ao dispositivo e liberação de funcionalidades. |
| Testes e Qualidade de IA | `artisys-ai-quality` 0.2.0 | Qualidade e Entrega | implemented | Avalia prompts, respostas e regressões de funcionalidades que usam inteligência artificial. |
| Privacidade e Proteção de Dados | `artisys-privacy` 0.2.0 | Qualidade e Entrega | implemented | Detecta, anonimiza e mascara dados pessoais e informações sensíveis. |
| Leitura e Processamento BIM/IFC | `artisys-bim` 0.2.0 | Engenharia e BIM | implemented | Lê modelos IFC, propriedades, quantidades e informações reutilizáveis de projetos BIM. |
| Comunicação entre Módulos | `artisys-eventbus` 0.2.0 | Plataforma e Dados | implemented | Permite que partes do sistema troquem eventos sem ficarem fortemente acopladas. |
| Alertas e Notificações | `artisys-alerts` 0.2.0 | Plataforma e Dados | implemented | Gerencia alertas locais, vencimentos, severidade e notificações internas com estado lido/não lido. |
| Backup e Restauração | `artisys-backup` 0.2.0 | Plataforma e Dados | implemented | Cria cópias de segurança verificáveis, retenção e checagem de integridade. |
| Importação de Dados | `artisys-importer` 0.2.0 | Plataforma e Dados | implemented | Mapeia, pré-visualiza, valida, detecta duplicidades e coordena rollback de importações. |
| Motor Financeiro e Conciliação | `artisys-finance-domain` 0.1.0 | Gestão e Operação | implemented | Processa regras financeiras, duplicidades, transferências e conciliação de forma determinística. |
| Acesso e Permissões | `artisys-auth-rbac` 0.2.0 | Plataforma e Dados | implemented | Gerencia autenticação local, usuários, papéis, permissões e proteção de ações. |
| Armazenamento de Dados | `artisys-storage` 0.2.1 | Plataforma e Dados | implemented | Padroniza armazenamento em memória, banco local e namespaces isolados. |
| Histórico e Auditoria | `artisys-audit-log` 0.1.0 | Plataforma e Dados | implemented | Registra quem realizou cada ação, em qual entidade e com quais metadados. |
| Sincronização de Dados | `artisys-sync` 0.2.0 | Plataforma e Dados | implemented | Sincroniza alterações offline, aplica tentativas automáticas e resolve conflitos. |
| Aplicativo Web Instalável e Offline | `artisys-pwa-runtime` 0.1.0 | Aplicativos Web e Mobile | implemented | Fornece cache, instalação, funcionamento offline e atualização controlada para PWAs. |
| Integração Web ↔ Aplicativo | `artisys-webview-bridge` 0.1.0 | Aplicativos Web e Mobile | implemented | Padroniza a comunicação segura entre uma interface WebView e o aplicativo nativo. |
| Estoque e Movimentações | `artisys-inventory` 0.2.0 | Gestão e Operação | implemented | Controla entradas, saídas, reservas, lotes, séries e saldo disponível. |
| Ordens de Serviço | `artisys-os` 0.1.0 | Gestão e Operação | implemented | Gerencia abertura, estados, transições e histórico de ordens de serviço. |
| Catálogo de Produtos e Serviços | `artisys-catalog` 0.1.0 | Gestão e Operação | implemented | Cadastra e organiza produtos, serviços, variantes, busca e ativação. |
| Preços, Descontos e Combos | `artisys-pricing` 0.1.0 | Gestão e Operação | implemented | Calcula preços por quantidade, faixas, descontos, combos e valores de linha. |
| Configurações do Sistema | `artisys-settings` 0.1.0 | Plataforma e Dados | implemented | Centraliza preferências, valores padrão e configurações separadas por namespace. |
| Multiempresa e Isolamento de Dados | `artisys-multitenancy` 0.1.0 | Plataforma e Dados | implemented | Separa empresas ou clientes e impede acesso indevido entre contextos diferentes. |
| Ativação Controlada de Funcionalidades | `artisys-feature-flags` 0.1.0 | Plataforma e Dados | implemented | Liga ou desliga recursos por padrão, empresa ou usuário sem duplicar código. |
| Checklists e Inspeções | `artisys-checklists` 0.1.0 | Gestão e Operação | implemented | Gerencia listas de verificação, evidências, progresso e conclusão. |
| Relatórios e Indicadores | `artisys-reporting` 0.1.0 | Gestão e Operação | implemented | Aplica filtros, agrupamentos e agregações e exporta resultados para CSV. |
| Motor de Fluxos de Trabalho | `artisys-workflow-engine` 0.1.0 | Gestão e Operação | implemented | Executa máquinas de estado determinísticas com transições, guards e histórico. |
| Aprovações | `artisys-approvals` 0.1.0 | Gestão e Operação | implemented | Orquestra aprovações em múltiplas etapas, decisões, rejeições e histórico. |
| Contatos e Organizações | `artisys-contacts` 0.1.0 | Gestão e Operação | implemented | Normaliza pessoas, empresas, canais de contato, endereços e identificadores. |
| Cadastro de Ativos | `artisys-assets` 0.1.0 | Gestão e Operação | implemented | Cadastra ativos genéricos com situação, localização, responsável, tags e metadados. |
| Ciclo de Vida de Ativos | `artisys-asset-lifecycle` 0.1.0 | Gestão e Operação | implemented | Registra aquisição, disponibilidade, manutenção, indisponibilidade e baixa de ativos. |
| Custódia e Empréstimos | `artisys-custody` 0.1.0 | Gestão e Operação | implemented | Controla retirada, responsável, prazo, devolução e condição de ativos. |
| Manutenção Preventiva | `artisys-maintenance` 0.1.0 | Gestão e Operação | implemented | Planeja manutenção por tempo ou medidor e calcula próximos vencimentos. |
| Medidores e Leituras | `artisys-metering` 0.1.0 | Gestão e Operação | implemented | Registra horímetro, odômetro, ciclos e outros medidores com deltas e validação. |
| Busca Local | `artisys-search` 0.1.0 | Plataforma e Dados | implemented | Indexa e pesquisa entidades localmente com pesos, filtros e ranking determinístico. |
| Exportação de Dados | `artisys-exporter` 0.1.0 | Plataforma e Dados | implemented | Exporta CSV e JSON e gera modelo tabular neutro para adaptadores de planilha. |

## Categorias padronizadas

- **Qualidade e Entrega:** testes, segurança, contratos, releases e validações.
- **Documentos e Mídia:** PDFs, OCR, documentos, vídeo, áudio e anotações.
- **Interface e Produtividade:** dashboards, planejamento, workflows visuais e construtores de UI.
- **Arquivos e Captura:** upload, explorer/workspaces locais, câmera, QR code, código de barras e entrada de arquivos.
- **Desktop e Hardware:** impressão, serial, suporte remoto e infraestrutura desktop.
- **Plataforma e Dados:** autenticação, storage, backup, sincronização, auditoria, alertas, busca, importação e exportação.
- **Aplicativos Web e Mobile:** PWA, comunicação WebView/nativo e launchers de aplicativos.
- **Gestão e Operação:** financeiro, estoque, OS, catálogo, preços, checklists, ativos, manutenção, custódia, aprovações e fluxos de negócio.
- **Engenharia e BIM:** recursos técnicos específicos reutilizáveis para engenharia.

## Integração

O consumidor usa o contrato ArtiSys. Regras de negócio específicas da vertical, persistência, permissões, styling, credenciais e runtimes opcionais continuam no repositório do produto. Não copie upstreams completos para dentro do produto.

Para fluxos financeiros, normalize/importe dados no consumidor (ou com `artisys-importer`/`artisys-pdf`/`artisys-ocr`) e envie a transação canônica para `artisys-finance-domain`; o módulo não assume banco, API ou provedor externo.

Os módulos P0 de operação (`artisys-workflow-engine`, `artisys-approvals`, `artisys-contacts`, `artisys-assets`, `artisys-asset-lifecycle`, `artisys-custody`, `artisys-maintenance`, `artisys-metering`, `artisys-search` e `artisys-exporter`) são genéricos. Estados, políticas e campos específicos de cada produto permanecem no consumidor.

Consulte `../docs/MODULE_KITS.md`, `../docs/INTEGRATION_GUIDE.md` e `../catalog/module-display.pt-BR.json`.
