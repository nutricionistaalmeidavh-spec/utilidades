# ArtiSys API Contracts — 0.2.0

Kit local para validar JSON e eventos, detectar mudanças em contratos, gerar clientes
TypeScript com OpenAPI Generator e verificar consumidor/provedor com Pact.
Não requer PactFlow, broker, SaaS, conta ou assinatura. Node 22+; Java 17+ somente
para gerar clientes. Os testes usam HTTP em loopback e dados sintéticos.

## Instalar e testar

Na raiz de `utilidades`:

```bash
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
npm test --prefix modules/artisys-api-contracts
npm run test:pact --prefix modules/artisys-api-contracts
npm run example --prefix modules/artisys-api-contracts
```

Para distribuir uma versão ao produto, execute `npm pack` dentro deste módulo e
instale o `.tgz` com `npm install --save-dev /caminho/artisys-api-contracts-0.2.0.tgz`.
Nenhuma publicação npm é necessária. Instale `@pact-foundation/pact@17.1.4`
no consumidor somente se usar os helpers de Pact. Registre o commit do kit no
produto; mantenha schemas e cenários próprios no consumidor.

## JSON e eventos

```js
import { createValidator, validateEventWithPayload } from '@artisys/api-contracts';
const saleSchema = {
  type: 'object', required: ['totalCents'], additionalProperties: false,
  properties: { totalCents: { type: 'integer', minimum: 0 } },
};
const validateSale = createValidator(saleSchema);
validateSale({ totalCents: 1250 });
// validateSale({ totalCents: '1250' }) lança erro; não converte silenciosamente.
```

JSON Schema draft-07, Ajv estrito, formatos via ajv-formats. Erros omitem valores do
payload. `schemas/event-envelope.schema.json` define id UUID, tipo, versão,
data/hora, origem, correlação e payload. `validateEventWithPayload(event, schema)`
valida ambos. O envelope é um contrato de referência para adoção explícita:
não modifica o EventBus de nenhum produto, nem implementa persistência/deduplicação.
`id` estável em reentregas permite ao consumidor implementar sua própria deduplicação.

## Detectar divergência

```bash
node bin/contracts.mjs baseline examples/pos.openapi.json examples/pos.baseline.json
node bin/contracts.mjs check examples/pos.openapi.json examples/pos.baseline.json
node bin/contracts.mjs validate-json examples/sale.schema.json meu-payload.json
```

Execute os comandos acima dentro do módulo. A baseline vem versionada. O check
retorna erro em qualquer alteração de conteúdo, mesmo aditiva/documental, e ignora
apenas a ordem das chaves de objetos. É um gate conservador de divergência, não uma
análise semântica de retrocompatibilidade. Atualizar baseline exige revisão explícita;
o check nunca a regrava. Baseline ausente ou inválida também falha.

## OpenAPI Generator fixado

Provisione o JAR **7.16.0** do Maven Central. Não há download automático em runtime.

```bash
curl --fail --location --output openapi-generator.jar https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/7.16.0/openapi-generator-cli-7.16.0.jar
echo '6999b18cece5b58f5d5b246fef5a43bdf61239491c4f0ed6513214e0f6e8464b  openapi-generator.jar' | sha256sum --check
export OPENAPI_GENERATOR_JAR="$PWD/openapi-generator.jar"
node bin/contracts.mjs validate-openapi examples/pos.openapi.json
node bin/contracts.mjs generate examples/pos.openapi.json generated-client
npm run test:generator
```

Windows PowerShell: baixe o mesmo JAR, confira com `Get-FileHash`, defina
`$env:OPENAPI_GENERATOR_JAR = (Resolve-Path .\openapi-generator.jar).Path` e use
os mesmos comandos Node/npm. Use somente especificações locais confiáveis;
referências externas no OpenAPI são responsabilidade do autor. O gerador verifica
a versão e valida a especificação antes de gerar. JAR ausente/versão incorreta
é erro. O teste compila o cliente gerado com TypeScript estrito.

## Pact real e consumidores

```js
import { createConsumerPact, verifyProvider } from '@artisys/api-contracts/pact';
const pact = await createConsumerPact({
  consumer: 'MeuTerminal', provider: 'MeuServidor', dir: './pacts',
});
// Adicione interações e execute pact.executeTest(...) usando o cliente do produto.
await verifyProvider({
  providerBaseUrl: 'http://127.0.0.1:3000', pactUrls: ['./pacts/meu-contrato.json'],
  stateHandlers: {},
});
```

`tests/pact.test.mjs` gera um contrato com o servidor mock real do Pact, verifica
um provedor HTTP real e prova a rejeição de um valor monetário com tipo incorreto.
O teste de referência desativa proxies apenas em seu processo, porque o proxy
interno do Pact 17 ignora NO_PROXY ao encaminhar ao servidor local. O módulo não
altera o ambiente do consumidor. Não publica resultados em serviços externos.
Use dados sintéticos: o diagnóstico upstream do Pact pode incluir os payloads.

As ferramentas são de desenvolvimento; não devem ser embarcadas no caixa do cliente.
Os cenários de exemplo não homologam APIs do PDV existente.

Referências oficiais: [Pact JS](https://github.com/pact-foundation/pact-js),
[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator/blob/v7.16.0/docs/usage.md).
