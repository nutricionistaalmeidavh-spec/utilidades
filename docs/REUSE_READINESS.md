# Reuse readiness

Este documento define quando um módulo do RepoUteis está pronto para ser reaproveitado em novos sistemas ArtiSys sem exigir homologação prévia em um produto real.

## Gate obrigatório

Um módulo `implemented` ou `stable` só pode ser tratado como reutilizável quando o verificador central confirmar:

1. `module.json` alinhado ao catálogo central;
2. capacidades implementadas declaradas;
3. `LICENSE` local;
4. `README.md` próprio;
5. testes automatizados do módulo;
6. para módulos JavaScript, pacote válido por `npm pack --dry-run`;
7. checks/smokes/exemplos executáveis quando o módulo os expõe;
8. contratos públicos dos lotes transversais validados por `scripts/reuse-smoke.mjs`;
9. nenhuma regra vertical específica movida para o core compartilhado.

O comando canônico é:

```bash
python scripts/check-modules.py
```

O gate é apropriado para execução local ou CircleCI. Não depende de GitHub Actions.

## O que fica fora do gate

A aprovação deste gate não significa homologação em um produto consumidor. Cada sistema continua responsável por:

- persistência e migrações próprias;
- credenciais e provedores externos;
- permissões de sistema operacional/dispositivo;
- UI e identidade visual;
- regras de negócio verticais;
- testes de aceitação específicos do produto;
- infraestrutura externa opcional.

## Regra de custo e infraestrutura

O core obrigatório dos módulos deve continuar R$0 e self-hosted/local sempre que aplicável. Serviços pagos, SaaS, cloud providers ou integrações proprietárias devem permanecer adapters opcionais e explícitos, nunca dependências silenciosas do módulo.

## Status

`implemented` significa que o módulo possui implementação reutilizável e passa pelo gate técnico do repositório, mas ainda pode não ter homologação extensa em consumidores reais.

`stable` adiciona maturidade/homologação suficiente para uso recorrente sem ressalvas de versão inicial.

Assim, homologação real não bloqueia o estado **pronto para reuso**, mas continua sendo requisito para promoção de maturidade quando fizer sentido.
