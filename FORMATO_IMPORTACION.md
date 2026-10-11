# Formato de importación de Killian Aprende

La página no usa inteligencia artificial. Tú le pasas a Claude (en el chat) lo que manda la escuela y Claude te devuelve un bloque de texto con este formato. Lo pegas en **🔒 Zona de mamá → Importar agenda o tema**, revisas la vista previa y guardas.

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
| `videos[].titulo`, `url`, `fecha` | sí | El enlace debe empezar con `https://` |
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
