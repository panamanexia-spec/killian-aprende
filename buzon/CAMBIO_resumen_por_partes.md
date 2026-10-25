# Cambio: resumen por partes (pedido de Adela, 25/10/2026)

## Por qué
El resumen de cada tema tenía 7–8 frases y el examen 40–60 preguntas: salían cosas que Killian nunca vio en el resumen.
Desde hoy los temas traen un resumen COMPLETO (20–36 frases), dividido en partes. Cada parte empieza con una frase
"título" cuyo texto empieza con «PART » o «PARTE » (por ejemplo `{"emoji":"🟦","en":"PART 1: The SUBJECT","es":"PARTE 1: El sujeto"}`).
En el buzón vienen 5 temas nuevos con el mismo id (reemplazan a los actuales): rc-subject-predicate, sci-life-cycle-traits,
rc-luz-sees-the-light, soc-convivencia, ef-voleibol-dorso. Procésalos como siempre (son urgentes: dos exámenes el lunes 26/10).

## Qué cambiar (sin borrar el progreso de Killian)
1. **Pantalla «Estudiar mi resumen» por partes.** Si el resumen trae frases título (texto que empieza con «PART » o «PARTE »):
   - mostrar el título como encabezado grande (no como una fila más) y sin botón 🔊 de fila;
   - mostrar UNA parte a la vez, con «Parte 2 de 6», botón «➡️ Siguiente parte» y «⬅️ Anterior»;
   - al terminar la última parte: «🎉 ¡Leíste todo el resumen!» y el botón «📝 Ir al examen».
   - Si el resumen no trae títulos, se ve como ahora.
2. **Campo opcional `subtema` en cada frase del resumen.** Que la importación (validateTema y mama.js) lo conserve.
   En los resultados del examen, debajo de cada error, mostrar las frases del resumen de ese subtema («📖 Esto estaba en tu resumen»).
3. **Aviso en `tools/validar.js`:** si la respuesta de una pregunta `completar` u `opcion_multiple` no aparece en ninguna frase
   del resumen (ni en `en` ni en `es`), avisar «⚠️ La respuesta de <id> no está en el resumen». Solo aviso, no error.
   No aplica a temas de Matemáticas (ahí las respuestas se calculan).

## Cómo probarlo
- Abrir rc-subject-predicate → «Estudiar mi resumen»: deben salir 4 partes, una a la vez, con su título.
- Abrir un tema viejo sin títulos (es-adverbios): se ve igual que antes.
- `node tools/validar.js buzon/tema_rc-subject-predicate_v2.json` → sin avisos de respuestas faltantes.
- Revisar en la tablet, la Lenovo y el iPhone.

Actualiza `FORMATO_IMPORTACION.md` (frases título y `subtema` en el resumen) y dile a Adela qué quedó para que me lo pase en el chat.
