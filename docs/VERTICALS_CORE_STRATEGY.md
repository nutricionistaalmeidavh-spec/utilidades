# Estratégia de Verticais ArtiSys

Atualizado em 2026-09-12.

## Objetivo

Transformar sinais de demanda encontrados em planilhas, sistemas simples e controles vendidos no mercado em produtos verticais ArtiSys, sem duplicar infraestrutura e sem transformar `utilidades` em repositório de produto.

## Regra arquitetural

`utilidades` continua sendo a biblioteca/core reutilizável. Os produtos novos devem viver em um monorepo separado (sugestão: `artisys-verticals`) e consumir contratos/adapters do core.

O core obrigatório permanece R$ 0 / self-hosted / open source. Serviços pagos só podem ser integrações opcionais explícitas.

```text
utilidades
└── modules/artisys-*            # core compartilhado

artisys-verticals                # monorepo de produtos novos
├── apps/
│   ├── agro-pecuaria/
│   ├── agro-lavoura/
│   ├── frota/
│   ├── manutencao/
│   ├── epi/
│   ├── locacoes/
│   ├── transportes/
│   ├── pmoc/
│   └── ...
├── packages/
│   ├── domain-assets/
│   ├── domain-customers/
│   ├── domain-finance/
│   ├── domain-maintenance/
│   ├── domain-scheduling/
│   ├── domain-documents/
│   ├── ui-shell/
│   └── vertical-runtime/
└── tooling/
```

## Regra de isolamento

Cada app vertical pode depender de `packages/*` e dos módulos `artisys-*`, mas um app não pode importar regras de negócio diretamente de outro app. Funcionalidade que passar a ser útil em dois ou mais verticais deve ser promovida para um package compartilhado ou, se realmente genérica, para `utilidades`.

## Core funcional disponível

- Identidade/permissões: `artisys-auth-rbac`, `artisys-multitenancy`, `artisys-feature-flags`.
- Dados/offline: `artisys-storage`, `artisys-sync`, `artisys-backup`, `artisys-local-backend`.
- Operação: `artisys-eventbus`, `artisys-audit-log`, `artisys-settings`.
- Cadastro/comercial: `artisys-catalog`, `artisys-pricing`, `artisys-inventory`, `artisys-importer`.
- Campo/serviço: `artisys-os`, `artisys-checklists`, `artisys-planning`, `artisys-capture`.
- Saída/documentos: `artisys-reporting`, `artisys-pdf`, `artisys-office`, `artisys-printing`.
- Web/mobile: `artisys-pwa-runtime`, `artisys-webview-bridge`.
- Qualidade/release: `artisys-qa`, `artisys-product-qa`, `artisys-security`, `artisys-api-contracts`, `artisys-release`, `artisys-release-validator`.

## Famílias de produto

### Agro

`Agro Pecuária`, `Agro Lavoura`, `Máquinas Agrícolas`, `Custos Rurais`, `Horta/Produção`, `Leilão/Compra e Venda`.

### Ativos e manutenção

`Frota`, `Manutenção Preventiva`, `PMOC`, `Assistência Técnica`, `Locação de Equipamentos`, `Gestão de Ferramentas`.

### Operação e segurança

`EPI`, `Almoxarifado`, `Compras/Cotações`, `Licitações`, `Checklists Operacionais`, `Inspeções`.

### Serviços e comércio

`Oficina`, `Transportadora`, `Imobiliária`, `Condomínio`, `Pet/Vet`, `Academia`, `Estética`, `Salão`, `Restaurante`, `Eventos`.

## Estratégia de produto

1. Criar uma vez os packages compartilhados.
2. Criar cada vertical como composição de módulos + regras específicas.
3. Manter migrations, dados de exemplo, testes e branding por app.
4. Desktop/PWA/local-first por padrão quando fizer sentido.
5. Integração cloud opcional e desacoplada.
6. Não duplicar módulo genérico dentro de app vertical.
7. Publicar cada vertical como produto independente mesmo quando compartilhar o mesmo monorepo.

## Primeira sequência recomendada

1. Frota e Máquinas.
2. Manutenção Preventiva.
3. EPI e Ferramentas.
4. Agro Pecuária.
5. Locação de Equipamentos.
6. Agro Lavoura.
7. Transportes/Fretes.
8. PMOC.
9. Compras/Cotações.
10. Licitações.

A razão é maximizar reaproveitamento do core e permitir que cada novo package criado fortaleça os verticais seguintes.

## Critério para promover código ao core

Promover para `utilidades` somente quando:

- não carregar regra específica de um nicho;
- tiver contrato estável e teste próprio;
- puder ser consumido por pelo menos dois produtos;
- não exigir serviço pago ou infraestrutura always-on;
- puder funcionar local/self-hosted por padrão.

Caso contrário, manter no `artisys-verticals/packages` ou dentro do próprio app.
