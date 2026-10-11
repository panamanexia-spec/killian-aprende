# Killian Aprende 🦉

Plataforma de estudio de inglés para Killian (4.º grado).

- `index.html`: la página (marcado y estilos).
- `js/`: el código por partes: `data.js` (datos y tema incluido), `core.js` (estado, nube, eventos), `inicio.js` (pantalla de inicio, estrellas, diccionario), `mama.js` (zona de mamá), `juegos.js`, `examen.js`, `ayudante.js` (voz, búho traductor y visor de videos), `progreso.js` (panel de análisis, reporte y premios).
- `data/agenda-actual.json` y `data/temas/`: la agenda de la semana y los temas, que la página lee sola.
- `sync.js`: conexión con Supabase (entrada de mamá y sincronización entre aparatos).
- `vendor/supabase.js`: librería de Supabase, guardada aquí para que funcione sin depender de otros sitios.
- `manifest.webmanifest`, `sw.js` e `icon-*.png`: permiten agregar la página a la pantalla de inicio y abrirla sin internet.
- `FORMATO_IMPORTACION.md`: formato de las agendas y temas que se importan en la zona de mamá.
- `ejemplos/`: un tema de ejemplo para probar la importación.
- `LEEME-KILLIAN.md`: cómo abrirla.

La clave que aparece en `sync.js` es la clave **pública** de Supabase. Los datos están protegidos por reglas de la base de datos: cada cuenta solo ve lo suyo.
