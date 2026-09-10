# ArtiSys Media

Camada comum para tarefas de áudio/vídeo.

- normaliza trim, resize e áudio;
- calcula duração de cortes;
- executa a fronteira real `MediaBunny Conversion.init()` → `execute()` com runtime fornecido pelo consumidor;
- gera manifesto determinístico para cenas Motion Canvas.

O módulo não cria servidor de mídia. Arquivo/Blob/stream de entrada e destino pertencem ao consumidor.
