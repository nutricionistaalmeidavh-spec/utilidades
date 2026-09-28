# ArtiSys Dashboard

Camada comum para dashboards configuráveis sem acoplar o domínio aos componentes de UI.

- valida layout e IDs;
- converte cards para `react-grid-layout`;
- converte painéis para o contrato de `react-resizable-panels`;
- converte colunas para Glide Data Grid.

Persistência, KPIs, consultas e widgets reais continuam no produto consumidor.

```bash
npm test --prefix modules/artisys-dashboard
```
