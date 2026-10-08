# Killian Aprende 🦉

Plataforma de estudio de inglés para Killian (4.º grado).

- `index.html`: la página (examen de prefijos OVER- y UNDER-).
- `sync.js`: conexión con Supabase (entrada de mamá y sincronización entre aparatos).
- `vendor/supabase.js`: librería de Supabase, guardada aquí para que funcione sin depender de otros sitios.
- `manifest.webmanifest`, `sw.js` e `icon-*.png`: permiten agregar la página a la pantalla de inicio y abrirla sin internet.
- `LEEME-KILLIAN.md`: cómo abrirla.

La clave que aparece en `sync.js` es la clave **pública** de Supabase. Los datos están protegidos por reglas de la base de datos: cada cuenta solo ve lo suyo.
