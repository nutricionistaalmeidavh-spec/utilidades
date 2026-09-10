# artisys-bim

Fronteira BIM reutilizável sobre IfcOpenShell.

**Consumir como:** `shared`.

**Execução:** biblioteca/CLI/processo local iniciado sob demanda pelo CompatibilizaBIM/CBIM e encerrado ao terminar a operação. Não exige servidor permanente.

O consumidor deve depender de um contrato ArtiSys (`IIfcEngine` ou equivalente), permitindo substituir a implementação sem espalhar APIs específicas do upstream pelo domínio e mantendo a fronteira técnica necessária para o componente LGPL.
