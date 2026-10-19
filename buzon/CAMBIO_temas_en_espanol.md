# Cambio pedido por Adela (19/10/2026): los temas de Español, 100 % en español

## El problema
En el tema «Los adverbios» (`"idioma": "es"`) a Killian le salen textos que solo sirven para inglés: «Escribe en inglés la palabra que falta», «Ver en español», «toca una palabra en inglés», y en el mini vocabulario «¿Qué significa?» / «Escríbelo en español» con opciones de relleno de otros temas. El examen del colegio es en español, así que eso lo confunde. Adela tiene que corregir algo todos los días: déjalo resuelto para TODOS los temas con `"idioma": "es"` (este y los que vengan).

## Qué cambiar (solo cuando el tema tiene `"idioma": "es"`; los de inglés quedan igual)
1. **Examen (js/examen.js)**
   - Nunca mostrar el botón «🇪🇸 Ver en español», aunque venga `pregunta_es`.
   - Instrucción por defecto de completar: «Escribe la palabra que falta.» (no «en inglés»).
   - Etiqueta del cuadro de completar: «Escribe la palabra:» (no «la palabra completa en inglés»).
   - Unir: «Paso 1: toca una palabra.» y «Primero toca una palabra 👆» (sin «en inglés»).
   - En la pantalla de inicio del examen, quitar la línea «Si no sabes, pulsa «Ver en español»…».
2. **Mini vocabulario**
   - Si el tema trae `vocabulario_pregunta_es` (ej. «¿Qué tipo de adverbio es?»), usarlo como título de la tarjeta en vez de «¿Qué significa?».
   - «Escríbelo en español:» → «Escribe tu respuesta:».
   - Las opciones incorrectas salen SOLO del vocabulario de ese mismo tema (no de las listas generales de inglés).
   - «¡Casi! Se dice «…»» → «¡Casi! La respuesta es «…»».
3. **Fuera del examen**
   - Las palabras de temas en español NO entran al diccionario de inglés, al búho traductor, al juego de Memoria ni a «Palabras en inglés que más falla» del reporte.
   - En la ficha de resumen, no llamar «traducción» a la segunda línea; mostrarla como explicación.
4. Actualiza `FORMATO_IMPORTACION.md` (sección «Temas en español») con estas reglas y con el campo nuevo `vocabulario_pregunta_es`.

## También en este buzón
- `tema_es-adverbios.json`: versión corregida (sumativa el 22/10, sin `pregunta_es`, con `instruccion_es` en español en cada pregunta y 2 preguntas nuevas de «🔍 Encuentra el adverbio»). Reemplaza a `data/temas/es-adverbios.json` sin borrar el progreso de Killian.

## Cómo probar
Abre «Los adverbios» en la tablet: haz un examen de práctica y el mini vocabulario, y revisa que no aparezca la palabra «inglés» ni el botón «Ver en español» en ninguna pantalla. Luego abre un tema de inglés (por ejemplo Thunder Rose) y comprueba que sigue igual que antes. Repite en la Lenovo y el iPhone.
Cuando termines, dile a Adela en 2 líneas qué cambió, y pásale el texto nuevo de la sección «Temas en español» de FORMATO_IMPORTACION.md para que se lo dé a Claude en el chat.
