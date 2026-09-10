# artisys-bim

Fronteira BIM reutilizável sobre IfcOpenShell.

**Consumir como:** `service` para manter uma separação técnica explícita do componente LGPL.

O CompatibilizaBIM/CBIM deve depender de um contrato ArtiSys (`IIfcEngine` ou equivalente), permitindo substituir a implementação sem contaminar o domínio com APIs específicas do upstream.
