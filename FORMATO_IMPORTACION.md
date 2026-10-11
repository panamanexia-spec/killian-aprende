# Formato de importación de Killian Aprende

La página no usa inteligencia artificial. Tú le pasas a Claude lo que manda la escuela (PDF, foto o texto) y Claude lo convierte a este formato.

**Hay dos maneras de cargarlo:**
1. **Automática (la normal):** Claude guarda el archivo en el proyecto (`data/agenda-actual.json` para la agenda, `data/temas/` para los temas) y lo publica. La página lo lee sola en todos los aparatos, sin que tú importes nada.
2. **A mano:** pegas el bloque en **🔒 Zona de mamá → Importar agenda o tema**, revisas la vista previa y guardas. Sirve para probar o corregir algo rápido.

Hay dos tipos de archivo: **agenda** (la semana) y **tema** (un tema de estudio con examen).

---

## Cómo pedírselo a Claude

Pega este texto en el chat, junto con la agenda (texto, captura, foto o PDF, tal como te la manden) y este archivo:

> Convierte lo que te envío al formato de `FORMATO_IMPORTACION.md`. Responde **solo** con un bloque de código JSON, listo para pegar.
> - Usa fechas con el formato `2026-10-13` (año-mes-día). La semana (`semana`) es el lunes.
> - `fecha` es el día en que Killian debe hacer la tarea; `entrega` es el día en que hay que entregarla.
> - Si algo es ambiguo (una fecha, qué materia es, si es tarea o material), **pregúntame antes** de inventarlo.
> - Pon en `notas_para_mama` los avisos que no son tareas (reuniones, pagos, permisos).
> - Escribe los títulos de las tareas cortos y claros, en español, para un niño de 8 años.

---

## 1. Agenda semanal (`"tipo": "agenda"`)

```json
{
  "tipo": "agenda",
  "semana": "2026-10-12",
  "tareas": [
    { "id": "t1", "materia": "Math", "titulo": "Páginas 34 y 35 del libro", "detalle": "Sumas con llevada", "fecha": "2026-10-13", "entrega": "2026-10-14" }
  ],
  "materiales": [
    { "id": "m1", "materia": "Art", "material": "Cartulina azul y tijeras", "llevar_el": "2026-10-15" }
  ],
  "videos": [
    { "id": "v1", "materia": "Science", "titulo": "The Water Cycle", "url": "https://...", "fecha": "2026-10-13" }
  ],
  "notas_para_mama": ["Reunión de padres el viernes"]
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `semana` | sí | Lunes de la semana, `2026-10-12` |
| `tareas[].id` | no | Nombre corto (`t1`, `t2`…). Si falta, la página lo pone |
| `tareas[].titulo` | sí | Qué hacer |
| `tareas[].fecha` | sí | Día en que Killian la hace. Aparece en su lista desde ese día |
| `tareas[].entrega` | no | Día de entrega |
| `tareas[].materia`, `detalle` | no | Materia (Math, Spanish, Science…) y una aclaración |
| `materiales[].material` | sí | Qué hay que llevar |
| `materiales[].llevar_el` | sí | Día en que hay que llevarlo |
| `videos[].titulo`, `url`, `fecha` | sí | El enlace debe empezar con `https://`. Si es de **YouTube** o **Vimeo**, Killian lo ve dentro de la página; cualquier otro enlace se abre en otra pestaña |
| `notas_para_mama` | no | Lista de avisos, solo los ves tú |

**Qué pasa al importar:** si importas otra vez la misma `semana`, la página **reemplaza** esa semana (lo que Killian ya marcó se conserva mientras los `id` sigan iguales). Otras semanas no se tocan. Mientras no cargues ninguna agenda, la página muestra datos de ejemplo que no dan estrellas.

---

## 2. Tema de estudio (`"tipo": "tema"`)

```json
{
  "tipo": "tema",
  "id": "science-water-cycle",
  "materia": "Science",
  "titulo": "The Water Cycle",
  "titulo_es": "El ciclo del agua",
  "fecha_examen": "2026-10-20",
  "resumen": [
    { "en": "Water evaporates when the sun heats it.", "es": "El agua se evapora cuando el sol la calienta.", "emoji": "☀️" }
  ],
  "subtemas": ["evaporation", "condensation", "precipitation"],
  "preguntas": [ ... ],
  "vocabulario": [
    { "en": "cloud", "es": "nube", "aceptadas": ["nube", "nubes"], "ejemplo_en": "The cloud is gray.", "ejemplo_es": "La nube es gris." }
  ]
}
```

| Campo | Obligatorio | Qué es |
|---|---|---|
| `id` | sí | Sin espacios ni acentos. Si importas otro tema con el mismo `id`, **reemplaza** al anterior |
| `titulo` | sí | Título en inglés |
| `titulo_es`, `materia`, `fecha_examen` | no | Título en español, materia y día del examen |
| `resumen` | no | Frases en inglés con su traducción y un emoji. Es lo que Killian estudia |
| `subtemas` | no | Lista de subtemas. Sirve para saber en qué se equivoca más |
| `preguntas` | sí | El banco de preguntas. **Pide muchas** (mínimo 10, ideal 20 o más) para tener varias rondas distintas |
| `vocabulario` | recomendado | Palabras para el diccionario y los juegos. Usa traducciones **cortas** (`nube`, no «masa de vapor en el cielo») |
| `vocabulario[].aceptadas` | no | Otras formas que se aceptan como correctas |

### Tipos de pregunta

Todas llevan `id`, `subtema`, `tipo`, `pregunta_en`, `pregunta_es` (opcional) y `explicacion_es` (explicación amable en español que verá si se equivoca; muy recomendada).

**`opcion_multiple`** — `opciones` (2 a 6) y `correcta` (debe ser igual a una de las opciones):
```json
{ "id": "q1", "subtema": "evaporation", "tipo": "opcion_multiple",
  "pregunta_en": "What makes water evaporate?", "pregunta_es": "¿Qué hace que el agua se evapore?",
  "opciones": ["The sun", "The moon", "The wind", "The snow"], "correcta": "The sun",
  "explicacion_es": "El sol calienta el agua y la convierte en vapor." }
```

**`verdadero_falso`** — `correcta` es `true` o `false`:
```json
{ "id": "q3", "subtema": "evaporation", "tipo": "verdadero_falso",
  "pregunta_en": "Evaporation happens when water gets hot.", "correcta": true,
  "explicacion_es": "Verdadero: el calor hace que el agua suba al aire como vapor." }
```

**`unir`** — `pares`, una lista de `izquierda` / `derecha` (mínimo 2):
```json
{ "id": "q13", "subtema": "evaporation", "tipo": "unir", "pregunta_en": "Match the words.",
  "pares": [ { "izquierda": "sun", "derecha": "sol" }, { "izquierda": "cloud", "derecha": "nube" } ],
  "explicacion_es": "Son las palabras básicas del ciclo del agua." }
```

**`completar`** — la frase lleva el hueco `______`; `respuesta` y, si hace falta, `aceptadas`:
```json
{ "id": "q4", "subtema": "evaporation", "tipo": "completar",
  "pregunta_en": "The sun heats the water and it ______.", "respuesta": "evaporates", "aceptadas": ["evaporate"],
  "explicacion_es": "«Evaporates» significa que se evapora." }
```

> Campos que propuse yo (porque el formato original no los definía): `correcta` como `true`/`false` en verdadero o falso, `pares` con `izquierda`/`derecha` en unir, y `respuesta`/`aceptadas` en completar.

Hay un tema completo de ejemplo en `ejemplos/tema-ejemplo.json`. En la página también puedes pulsar **«Cargar un tema de ejemplo»** para probar la importación.

---

## Si la página dice que algo está mal

La página revisa el archivo antes de guardar y te explica en español qué falta (por ejemplo: «Tarea 2: falta la fecha o no es válida»). Copia esos mensajes en el chat y pídele a Claude que corrija el archivo. También puedes arreglar cosas a mano en la vista previa: editar, quitar o agregar tareas, materiales y videos.


---

## Carga automática desde el proyecto

- **Agenda:** el archivo `data/agenda-actual.json` es la agenda vigente. Cuando cambia, la página **reemplaza toda la agenda anterior** (así desaparecen las semanas viejas y los datos de ejemplo). Lo que Killian ya marcó se conserva. Puede traer una sola agenda o una lista: `{ "agendas": [ {…semana 1…}, {…semana 2…} ] }`.
- **Temas:** cada tema es un archivo en `data/temas/` y se anota en `data/temas/index.json`, por ejemplo `["science-water-cycle.json"]`. Un tema con el mismo `id` reemplaza al anterior.
- La página solo vuelve a aplicar un archivo cuando su contenido cambia. Si corriges algo a mano en la zona de mamá, se conserva hasta que el archivo cambie otra vez.

## Campos opcionales de las preguntas

| Campo | Para qué sirve |
|---|---|
| `preguntas_por_ronda` (en el tema) | Cuántas preguntas tiene cada intento (de 3 a 50; por defecto 10) |
| `ejemplo_en`, `ejemplo_es` | Un ejemplo que Killian ve cuando se equivoca |
| `pista_es` | Pista en español que solo aparece desde el segundo intento (en «completar») |
| `peso` | Cuánto vale la pregunta en la nota (por defecto 1) |

**Cómo se arman los intentos:** el primer intento toma preguntas al azar del banco. «Intentarlo otra vez» da preguntas que Killian **todavía no vio**, con prioridad a los subtemas que falló. Por eso conviene un banco grande (20 preguntas o más) y poner bien el `subtema` de cada una.

## Mini vocabulario

Al terminar cada examen, Killian hace un mini vocabulario de 5 a 8 palabras del tema (elige o escribe el significado; se aceptan mayúsculas, acentos y las variantes de `aceptadas`). Las que falla pasan a **«Mis palabras para practicar»** en el diccionario.

## Charlas (presentaciones orales)
Se guardan en `data/charlas/` (y se listan en `data/charlas/index.json`), o mamá las escribe en **Zona de mamá → Charlas**. Ejemplo en `ejemplos/charla-ejemplo.json`:

```json
{ "tipo": "charla", "id": "thunder-rose", "materia": "Reading and Conversation", "titulo": "The Thunder Rose",
  "idioma": "en", "fecha_entrega": "2026-10-13",
  "frases": [ { "texto": "Hello, my name is Killian.", "es": "Hola, me llamo Killian." } ] }
```
`idioma` puede ser `en`, `es` o `zh`. Para que una tarea abra la charla, ponle `"charla": "thunder-rose"` en la agenda.
La práctica incluye escuchar y repetir con revisión de pronunciación (micrófono del navegador, gratis), completar, ordenar y decirla de memoria.
