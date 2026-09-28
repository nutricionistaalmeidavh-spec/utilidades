# artisys-privacy

Kit compartilhado de privacidade/PII para execução local ou CI.

Normaliza jobs `analyze`/`anonymize`, cria o boundary Presidio e inclui redator determinístico por spans. O runtime Presidio é opcional e não exige serviço permanente.

## Verificação

```bash
npm test
npm run check
npm run example
npm pack --dry-run
```

Textos sensíveis e modelos/recognizers específicos permanecem no consumidor.
