# ArtiSys PDF

Reusable PDF boundary for ArtiSys products. It combines **pdfme** for generation, **PDF.js** for parsing/viewing and a portable annotation contract compatible with React PDF highlighter UIs.

## What it gives the consumer

- validate reusable PDF templates;
- normalize product data into pdfme inputs;
- generate PDF bytes with pdfme without leaking pdfme calls into business code;
- load PDF documents through PDF.js;
- persist viewport-independent highlight/annotation data;
- CLI for template validation and PDF generation.

## Install

```bash
npm install <path-or-package-to-@artisys/pdf>
```

Install only the upstreams the product needs, for example:

```bash
npm install @pdfme/generator @pdfme/schemas pdfjs-dist
```

`react` + `react-pdf-highlighter` are optional when the consumer needs interactive highlights.

## API

```js
import { generatePdf, loadPdfDocument, normalizeHighlight } from '@artisys/pdf';

const bytes = await generatePdf({ template, inputs });
const pdf = await loadPdfDocument('/documento.pdf');
const annotation = normalizeHighlight({
  id: 'h1', pageNumber: 1,
  rect: { x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.3 },
  text: 'Trecho importante'
});
```

## Boundary

The module owns the reusable PDF contract. Consumers own templates tied to business rules, storage, permissions, document history and UI composition. No server or paid service is required.
