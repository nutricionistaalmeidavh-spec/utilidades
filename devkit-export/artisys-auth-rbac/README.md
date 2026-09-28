# @artisys/auth-rbac

Primitivas RBAC independentes de provedor. O entrypoint padrão mantém autenticação local self-hosted com `scrypt` para runtimes Node. Google, Supabase, Clerk ou outros provedores continuam apenas como adapters opcionais — nenhum serviço externo é obrigatório.

## Browser / PWA

`@artisys/auth-rbac/browser` é um entrypoint sem `node:*` para PWA/browser. Ele usa Web Crypto (`PBKDF2` + `SHA-256`), sessões expiráveis/revogáveis e o mesmo contrato de policy/RBAC.

```js
import { createLocalUser, verifyLocalPassword, createLocalSession } from '@artisys/auth-rbac/browser';

const user = await createLocalUser({
  id: 'u1',
  username: 'admin',
  password: 'senha-segura',
  roles: ['admin']
});

const ok = await verifyLocalPassword(user, 'senha-segura');
const session = ok ? await createLocalSession(user) : null;
```

O core continua R$ 0, self-hosted e open source.
