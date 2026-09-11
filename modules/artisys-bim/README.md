# artisys-bim

Kit compartilhado de boundary IFC para CompatibilizaBIM/CBIM e outros produtos de engenharia.

Valida consultas IFC, cria jobs locais para IfcOpenShell, resume entidades por tipo e executa operações via adapter injetado. O kit não exige servidor permanente.

## Verificação

```bash
npm test
npm run check
npm run example
npm pack --dry-run
```

IfcOpenShell e processamento geométrico pesado continuam como runtime local opcional, preservando a separação de licença e arquitetura.
