# Avisos en el iPhone (ntfy)

Avisos con lo importante de Killian (hora de Panamá):

- **Lunes a viernes, 3:30 pm:** lo que tiene para el día siguiente (tareas de esta noche, materiales que debe llevar mañana, sumativas de mañana y tareas atrasadas). Los viernes: lo del fin de semana y el lunes.
- **Lunes a viernes, 8:00 pm:** verificar que hizo todo (lo que aún falta, «terminó todo» 🌟, atrasadas, materiales sin marcar como listos, sumativa de mañana, si hoy no practicó, exámenes cercanos con nota baja, intentos bajos seguidos y preguntas del búho sin responder).
- **Sábado y domingo, 8:00 am:** qué tiene pendiente, atrasadas, lo del lunes (materiales y sumativas) y exámenes cercanos.

Si no hay nada que decir, no llega ningún aviso.

## Cómo funciona
Todo ocurre **dentro de Supabase** (la misma base de datos de la página), con un programador (`pg_cron`) que arma el resumen con los datos de Killian y lo envía a **ntfy.sh**. No usa tu contraseña, ni claves en GitHub, ni cuentas nuevas. Quedó guardado en Supabase como la migración `notificaciones_ntfy` (y las tareas `killian-previa`, `killian-verificar` y `killian-finde`).

## Recibirlos en el iPhone (una sola vez)
1. Instala **ntfy** desde la App Store (gratis, sin cuenta).
2. Ábrela, toca **+** y escribe el nombre del tema que te dio Claude (empieza con `killian-`).
3. Permite las notificaciones cuando iOS lo pida.

El nombre del tema funciona como una llave: quien lo conozca puede leer los avisos. **No lo publiques ni lo pegues en el repositorio.**
