# Cambio grande: «Modo examen real» (pedido de Adela, 23/10/2026)

## Por qué
Killian sacó **54/100 en Over/Under** y **20/100 en Perímetro**. La práctica de la plataforma es más fácil que el examen del colegio:
- casi todo es opción múltiple de 3 opciones, y en el colegio **escribe** las respuestas;
- siempre tiene «Ver en español» y pistas; en el colegio no;
- las rondas son de 8–10 preguntas; el examen real tiene 20 a 50;
- en Matemáticas el colegio da **figuras dibujadas** (con lados sin número) y la plataforma no puede mostrar imágenes en las preguntas;
- en el examen dejó **muchas líneas en blanco**, y la plataforma lo deja terminar con preguntas vacías.

En el buzón ya están dos temas nuevos a nivel colegio (`tema_rc-over-under.json`, `tema_math-perimetro.json`) y 32 dibujos `per_*.png`.

## Qué cambiar (todo gratis, sin borrar el progreso de Killian)

1. **Imágenes en las preguntas.** Aceptar el campo opcional `imagen` (solo nombre de archivo png/jpg/webp/gif) en cualquier pregunta de un tema. Al procesar el buzón, guardar esas imágenes en `img/temas/` y mostrarlas grandes arriba de la pregunta (y en la corrección). Que `validateTema` lo conserve y `tools/validar.js` avise si falta el archivo. Subir ya los 32 `per_*.png` del buzón.

2. **Conservar `examen_oficial`** (lista de ids de preguntas) en los temas importados, igual que en el tema interno de OVER/UNDER.

3. **Dos botones en cada tema:**
   - **🏋️ Entrenar** = como ahora (ayudas, «Ver en español», pistas, explicación después de cada pregunta).
   - **📝 Examen real** = como en el colegio: todas las preguntas de `preguntas_por_ronda`, **sin** «Ver en español», **sin** pistas, **sin** decir si está bien o mal hasta el final; reloj visible que cuenta el tiempo usado (sin cuenta regresiva); al final, nota sobre 100 y repaso de errores con las explicaciones en español.

4. **El ✅ del tema solo se gana con 80 o más en «Examen real».** «Entrenar» da estrellas por esfuerzo, pero no el ✅. Las tareas de estudio de la agenda se marcan hechas al **terminar una ronda completa** (no con la mitad). «🔁 Repasar mis errores» queda hecha cuando corrige todas las preguntas que falló.

5. **Nunca en blanco.** Si pulsa «TERMINAR» con preguntas vacías: mensaje cariñoso «⚪ Te faltan N. ¡Nunca dejes una en blanco! Escribe tu mejor idea 🍀» y llevarlo a la primera vacía. Si vuelve a pulsar, ya lo deja terminar.

6. **Plan automático antes de cada examen** (temas con `fecha_examen`): 4 días antes y 3 días antes → Entrenar; 2 días antes → Examen real; el día anterior → Repasar mis errores + Examen real. Si no llega a 80 en el Examen real, que al día siguiente vuelva a salir.

7. **Notas reales del colegio en Zona de mamá.** Un formulario simple: materia, tema (lista de temas), fecha y nota del colegio. En Progreso, mostrar al lado: nota del colegio vs. mejor «Examen real» de ese tema. Cargar ya: Over/Under 09/10 = 54; Perímetro 07/10 = 20.

## Cómo probarlo
- Importar `tema_math-perimetro.json`: la pregunta «r1» debe mostrar el dibujo del rectángulo.
- En «Examen real» no debe salir «Ver en español» ni pistas, y deben salir 20 preguntas.
- Terminar con una vacía → sale el aviso.
- Sacar 70 en Examen real → no da ✅; 80 → sí.
- Revisar en la tablet, la Lenovo y el iPhone.

Actualiza `FORMATO_IMPORTACION.md` con `imagen` en preguntas y `examen_oficial`, y dile a Adela qué quedó para que me lo pase en el chat.
