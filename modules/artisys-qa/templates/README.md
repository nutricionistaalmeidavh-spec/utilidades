# Templates de consumo — @artisys/qa

- `consumer/`: template completo com demo profile, fixtures e adapter de exemplo.
- `web-saas/`: base enxuta para aplicações web/SaaS com profiles `quick`, `full` e `release`, captura padronizada e smoke read-only.

Para novos sistemas web, comece por `web-saas/` e mantenha no repositório consumidor apenas manifest, flows e adaptações específicas do domínio. O runtime compartilhado continua em `utilidades/modules/artisys-qa`.
