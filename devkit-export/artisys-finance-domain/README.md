# ArtiSys Finance Domain

Módulo reutilizável de domínio financeiro determinístico, extraído e endurecido a partir do motor usado no `OBRANAMAOCOMERCIAL`.

## Objetivo

Centralizar lógica financeira pura que possa ser consumida por sistemas desktop, web ou híbridos sem acoplamento a banco de dados, Cloudflare, HTTP, UI, IA externa ou serviços pagos.

O core é **R$ 0 / self-hosted / open source** e não possui dependências de runtime.

## Capacidades

- normalização determinística de descrições;
- `businessFingerprint()` para detectar transações financeiramente semelhantes;
- `sourceFingerprint()` para idempotência real por origem/arquivo/linha ou identificador externo;
- `dedupeBySourceFingerprint()` para impedir reimportação da mesma origem sem colapsar pagamentos legítimos repetidos;
- motor de regras por prioridade com `contains`, `equals`, `startsWith`, `endsWith`, `regex`, `tokens`, direção, conta, contraparte e faixa de valor;
- decisões explicáveis com `ruleId`, `reason`, `assignments` e confiança determinística;
- detecção de transferências internas entre contas empresariais;
- identificação de retiradas empresa → pessoal e devoluções pessoal → empresa;
- sugestão determinística de conciliação entre transações e obrigações usando valor, beneficiário, data e categoria;
- feedback `accepted` / `rejected` / `manual` que altera o score de forma explícita, sem machine learning;
- preset opcional `BASIC_PT_BR_FINANCE_RULES` com categorias financeiras comuns em português do Brasil.

## Fingerprints

O módulo separa dois conceitos que não devem ser confundidos:

```text
sourceFingerprint
→ identifica a ocorrência exata na origem
→ usado para idempotência de importação

businessFingerprint
→ representa data + descrição + valor + direção + conta
→ usado apenas para apontar possível duplicidade de negócio
```

Assim, dois PIX de R$ 50 para o mesmo favorecido no mesmo dia podem coexistir quando vierem de linhas diferentes do extrato.

## Exemplo

```js
import {
  sourceFingerprint,
  businessFingerprint,
  applyDeterministicRules,
  suggestReconciliation,
} from '@artisys/finance-domain';

const tx = {
  id: 'tx-1',
  accountId: 'conta-principal',
  date: '2026-09-13',
  description: 'POSTO SHELL CENTRO',
  amountCents: 25000,
  direction: 'debit',
};

const sourceId = sourceFingerprint(tx, {
  source: 'csv',
  documentId: 'extrato-2026-09',
  rowIndex: 42,
});

const similarityId = businessFingerprint(tx);

const classified = applyDeterministicRules(tx, [{
  id: 'fuel-shell',
  priority: 100,
  match: {
    description: { kind: 'contains', value: 'SHELL' },
    direction: 'debit',
  },
  assign: { category: 'Combustível' },
  reason: 'Fornecedor de combustível',
}]);
```

## Limites do módulo

Este módulo **não** faz parsing de CSV, OFX ou PDF, OCR, persistência, rotas HTTP, autenticação, renderização de telas ou chamadas para LLMs. Essas capacidades permanecem em módulos próprios (`artisys-importer`, `artisys-pdf`, `artisys-ocr`, `artisys-storage`, etc.) ou no produto consumidor.

Isso permite que CSV, OFX, PDF-texto, PDF+OCR e lançamentos manuais produzam uma transação canônica e passem pelo mesmo motor financeiro.

## Testes

```bash
npm test
npm run check
npm pack --dry-run
```

A homologação contra dados reais de cada produto continua sendo responsabilidade do consumidor.
