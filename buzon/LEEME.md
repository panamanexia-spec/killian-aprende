# Buzón de Killian

Aquí se dejan los archivos JSON listos para subir a la plataforma:
`agenda_*.json`, `tema_*.json` y `charla_*.json` (formato en `FORMATO_IMPORTACION.md`).
Lo ya subido se mueve a `buzon/procesados/`.

## Cómo se procesa (lo hace Claude al decir «revisa el buzón» o en la revisión diaria)
1. Lista los `.json` de `buzon/` (no los de `procesados/`). Si no hay ninguno, no hace nada.
2. Valida cada uno: `node tools/validar.js buzon/<archivo>.json` (mismas reglas del importador de la página).
   Si hay errores obvios (id con espacios o acentos, fecha mal escrita…) los corrige; si no, no sube ese archivo y avisa.
3. Sube:
   - **agenda** → `data/agenda-actual.json`. La página reemplaza toda la agenda con ese archivo, así que el archivo debe ser
     `{"agendas":[ …todas las semanas… ]}`: se conservan las semanas que ya estaban y se agrega o reemplaza la semana nueva
     (misma `semana` = reemplaza). Nunca se borran semanas anteriores sin avisar.
   - **tema** → `data/temas/<id>.json` y se agrega el nombre en `data/temas/index.json`.
   - **charla** → `data/charlas/<id>.json` y se agrega el nombre en `data/charlas/index.json`.
   - Si una charla/tema es para una tarea de la agenda, se enlaza con `"charla": "<id>"` / `"tema": "<id>"` en esa tarea.
4. Sube `KX_VERSION` en `js/core.js` (por ejemplo «12-oct 8») y publica en `main`.
5. Mueve cada archivo a `buzon/procesados/` y borra el original de `buzon/`.
6. Resumen corto: qué se subió y qué verá Killian.
