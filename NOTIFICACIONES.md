# Avisos en el iPhone (ntfy)

Dos avisos al día, **8:00 am** y **5:00 pm** (hora de Panamá), con lo importante de Killian:

- **8:00 am:** pendientes de hoy, tareas atrasadas, lo que debe llevar hoy y exámenes cercanos.
- **5:00 pm:** lo que todavía le falta de hoy (o «terminó todo» 🌟), tareas atrasadas, lo que debe llevar mañana, si hoy no ha practicado, exámenes cercanos con nota baja, tres intentos seguidos con nota baja y preguntas del búho que esperan tu respuesta.

Si no hay nada que decir, no llega ningún aviso.

## Cómo funciona
Todo ocurre **dentro de Supabase** (la misma base de datos de la página), con un programador (`pg_cron`) que arma el resumen con los datos de Killian y lo envía a **ntfy.sh**. No usa tu contraseña, ni claves en GitHub, ni cuentas nuevas. Quedó guardado en Supabase como la migración `notificaciones_ntfy` (y las tareas `killian-aviso-manana` y `killian-aviso-tarde`).

## Recibirlos en el iPhone (una sola vez)
1. Instala **ntfy** desde la App Store (gratis, sin cuenta).
2. Ábrela, toca **+** y escribe el nombre del tema que te dio Claude (empieza con `killian-`).
3. Permite las notificaciones cuando iOS lo pida.

El nombre del tema funciona como una llave: quien lo conozca puede leer los avisos. **No lo publiques ni lo pegues en el repositorio.**
