# artisys-ai-quality

Kit compartilhado para regressão e avaliação de funcionalidades de IA.

Expõe validação de suites, geração de configuração Promptfoo, resumo de resultados e execução por adapter injetado. Nenhuma credencial de provedor ou dataset sensível é armazenado no kit.

## Verificação

```bash
npm test
npm run check
npm run example
npm pack --dry-run
```

Promptfoo e as credenciais dos modelos são instalados/configurados somente no ambiente que executa a avaliação.
