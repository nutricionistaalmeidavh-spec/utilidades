import { createOfficeDocument, toUniverWorkbook } from '../src/index.mjs';
console.log(createOfficeDocument({ kind: 'docx', source: 'contrato.docx', title: 'Contrato' }));
console.log(toUniverWorkbook({ id: 'dre', name: 'DRE', sheets: [{ id: 'resumo', name: 'Resumo', rows: [['Receita', 100], ['Despesa', 50]] }] }));
