# artisys-authz

Camada reutilizável de autorização fina baseada em OpenFGA.

**Consumir como:** `service`.

O produto deve chamar uma interface ArtiSys (`can(user, action, resource, context)`) e não espalhar chamadas específicas do OpenFGA pelo domínio.
