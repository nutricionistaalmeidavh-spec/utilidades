# @artisys/storage

Contrato de storage ArtiSys com implementações em memória, SQLite local e IndexedDB, além de isolamento por namespace.

## Implementações

- `MemoryStorage`: testes, sessões efêmeras e adapters em memória.
- `SqliteStorage`: persistência local durável usando `node:sqlite`, sem dependência npm obrigatória.
- `IndexedDbStorage`: persistência local durável no navegador/PWA por `@artisys/storage/browser`.
- `namespaceStorage(storage, namespace)`: isolamento lógico sobre qualquer adapter compatível.

### Node / Desktop

```js
import { SqliteStorage, namespaceStorage } from '@artisys/storage';

const raw = new SqliteStorage({ filePath: './data/app.sqlite' });
const storage = namespaceStorage(raw, 'my-product');
await storage.put('settings/company', { name: 'Empresa' });
await raw.close();
```

### Browser / PWA

```js
import { IndexedDbStorage, namespaceStorage } from '@artisys/storage/browser';

const raw = new IndexedDbStorage({ dbName: 'artisys-my-product' });
const storage = namespaceStorage(raw, 'my-product');
await storage.put('settings/company', { name: 'Empresa' });
```

Os entrypoints Browser não importam `node:*`. Adapters D1/R2/S3/Drive continuam opcionais e explícitos. O core permanece R$ 0, self-hosted e open source.
