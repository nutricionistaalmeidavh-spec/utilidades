# ArtiSys Annotations

**Status:** stable 1.0.0.

Kit reutilizável de anotações em imagens e PDFs com contrato portável. Usa Annotorious e react-pdf-highlighter apenas nas bordas de UI, sem persistir estado específico dessas bibliotecas.

## API

- `normalizeAnnotation()` — valida o modelo portável.
- `toAnnotoriousAnnotation()` / `fromAnnotoriousAnnotation()` — adapter para regiões de imagem.
- `toPdfHighlighter()` / `fromPdfHighlighter()` — adapter para highlights/regiões de PDF.
- `filterAnnotations()` — filtra por alvo, tipo, página e tag.

O consumidor controla persistência, permissões, comentários colaborativos e workflow de revisão.

```bash
npm test --prefix modules/artisys-annotations
npm run example --prefix modules/artisys-annotations
```
