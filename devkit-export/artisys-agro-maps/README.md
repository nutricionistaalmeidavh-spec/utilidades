# ArtiSys Agro Maps

Cópia genérica e reutilizável do núcleo cartográfico desenvolvido no SistemaLavoura. O módulo original do produto não é alterado.

## Objetivo

Fornecer primitivas GIS/local-first para outros produtos agro sem carregar regras de safra, plantio, estoque, financeiro ou qualquer domínio específico.

### Incluído

- validação WGS84 e topologia de Polygon/MultiPolygon;
- normalização GeoJSON;
- snapshot espacial genérico de áreas, geometrias e pontos;
- bounds e centroides;
- validação de manifest de mapas;
- planejamento de pacotes PMTiles regionais;
- contrato offline-first sem API paga obrigatória.

### Não incluído

- regras específicas do SistemaLavoura;
- banco de dados ou autenticação;
- arquivos PMTiles pesados;
- provedor de satélite obrigatório;
- serviço SaaS obrigatório.

## Core R$ 0

O núcleo não depende de serviço pago. A aplicação consumidora informa `releaseBaseUrl`, permitindo hospedar PMTiles em GitHub Releases, servidor próprio, storage próprio ou outra origem HTTP com Range Requests. O módulo não força um fornecedor.

## Uso

```js
import {normalizeFeatureCollection,buildSpatialSnapshot,buildRegionalMapPlan} from './modules/artisys-agro-maps/src/index.js';

const snapshot=buildSpatialSnapshot({
  areas:[{id:'pasto-1',name:'Pasto 1',areaHa:12}],
  geometries:[{areaId:'pasto-1',geometry:geojsonPolygon}],
  points:[{id:'bebedouro-1',kind:'water',latitude:-21.1,longitude:-47.8}]
});

const plan=buildRegionalMapPlan({
  areaId:'fazenda-1',
  bounds:[-47.9,-21.2,-47.7,-21.0],
  manifest,
  profile:'detailed',
  releaseBaseUrl:'https://seu-host/releases/mapas'
});
```

## Adapters opcionais

Importadores KML/KMZ/GPX/Shapefile/ISOXML podem usar as mesmas bibliotecas open source já usadas no SistemaLavoura, mas ficam opcionais para que consumidores que só usam GeoJSON não recebam dependências desnecessárias.

## Origem

Generalizado a partir das implementações `src/agricultural-map.js`, `src/gis-import.js` e `src/map-package-planner.js` do SistemaLavoura em 2026-09-21. O código do SistemaLavoura permanece intacto.
