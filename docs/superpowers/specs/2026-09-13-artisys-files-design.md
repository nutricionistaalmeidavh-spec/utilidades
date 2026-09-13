# artisys-files — design

## Objetivo
Criar um módulo reutilizável para aplicações desktop/local-first que ofereça um workspace de arquivos dentro do app, espelhado em uma pasta real do computador, com árvore de diretórios, operações de arquivo, drag-and-drop, indexação e observação de mudanças externas.

## Limites
- Core R$ 0, self-hosted/local e open source.
- Sem servidor, daemon, banco dedicado ou serviço pago obrigatório.
- Não duplicar `artisys-storage`; `artisys-files` gerencia organização e operações de filesystem e pode integrar com storage por adapter.
- UI não será acoplada ao módulo. O módulo expõe contratos e operações para qualquer frontend renderizar Explorer, árvore e drag-and-drop.

## Arquitetura
- `contracts`: tipos canônicos de arquivo, pasta, árvore, evento e operações.
- `filesystem`: adapter Node para pasta real do computador, com proteção contra path traversal.
- `workspace`: criação/abertura do workspace, listagem em árvore, create/rename/move/copy/delete.
- `drag-drop`: tradução de uma intenção de drag-and-drop em uma operação segura de move/copy.
- `indexer`: índice em memória para busca por nome/caminho/tipo.
- `watcher`: observação local baseada em `fs.watch`, normalizada em eventos do módulo.
- `storage-adapter`: contrato opcional para integração com `artisys-storage`, sem dependência circular.

## Segurança
Todo caminho informado pelo consumidor é resolvido dentro do root do workspace. Caminhos que escapem do root são rejeitados. Operações destrutivas usam remoção explícita e não seguem links simbólicos para fora do workspace.

## Testes
Cobrir path traversal, criação/listagem, rename/move/copy/delete, árvore, busca/indexação e drag-and-drop. Watcher terá teste unitário da normalização e exemplo de integração, evitando testes frágeis dependentes de timing do sistema operacional.
