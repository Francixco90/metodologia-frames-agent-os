# Banco opcional

El núcleo funciona sin red. assets/bank.json fija la release v1.1.0 y su hash. `python3 engine/bank.py verify ARCHIVO.zip --sha256 HASH` verifica; `install ARCHIVO.zip --sha256 HASH --dest NUEVO` instala sin modificar el paquete. `sync` obtiene solo la URL y hash fijados con caché confinada; consulta --help. Después añade --bank DIRECTORIO a check/plan/build. Los assets utilizados se embeben; referencias ausentes o alteradas bloquean. La galería y sus capturas se distribuyen aparte del ZIP runtime. MIT para arte propio; fuentes OFL con avisos. [METODOLOGIA]
