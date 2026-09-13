# @artisys/storage

Contrato de storage ArtiSys com implementações em memória e SQLite local, além de isolamento por namespace.

## Implementações

- `MemoryStorage`: testes, sessões efêmeras e adapters em memória.
- `SqliteStorage`: persistência local durável usando `node:sqlite`, sem dependência npm obrigatória.
- `namespaceStorage(storage, namespace)`: isolamento lógico sobre qualquer adapter compatível.

`SqliteStorage` cria o diretório do banco quando necessário, habilita `foreign_keys`, `busy_timeout` e WAL em bancos de arquivo. Valores e metadata devem ser serializáveis em JSON.

```js
import { SqliteStorage, namespaceStorage } from '@artisys/storage';

const raw = new SqliteStorage({ filePath: './data/app.sqlite' });
const storage = namespaceStorage(raw, 'my-product');
await storage.put('settings/company', { name: 'Empresa' });
await raw.close();
```

Adapters D1/R2/S3/Drive podem continuar sendo adicionados/selecionados pelos consumidores sem alterar os domínios.
