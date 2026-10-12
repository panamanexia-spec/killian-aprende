# Instrucciones para Claude Code — Plataforma de Killian

## Con quién trabajas
- Trabajas con **Adela**, la mamá de Killian. Respóndele siempre en **español**, cálido, claro y corto.
- Ella **no es programadora**: nada de jerga técnica. Explica qué cambiaste en palabras sencillas y dile siempre el **siguiente paso concreto**.
- Al terminar cualquier cambio, dile exactamente **cómo probarlo** en la tablet, la Lenovo y el iPhone.

## Sobre Killian
- 8 años, 3° Euclides del Colegio Internacional Saint George, Panamá (zona horaria America/Panama).
- Habla español; el inglés le cuesta mucho y se frustra. Le cuesta concentrarse.
- Todo lo que vea debe ser corto, visual, con botones grandes, emojis, ánimo constante y nunca mensajes negativos. Premiar el esfuerzo.
- En inglés, siempre con la traducción al español al lado.

## Reglas de la plataforma
- **Conserva el estilo visual**: cielo celeste con nubes, búho graduado, botones amarillos grandes, tarjetas blancas redondeadas, fuentes Baloo 2 y Nunito, estrellas y emojis.
- **Nada de IA de pago ni servicios con costo.** Todo gratis.
- Todo debe seguir **sincronizado** entre tablet, Lenovo e iPhone.
- Usa **git** en cada cambio para poder volver atrás.
- No borres datos de progreso de Killian (intentos, estrellas, diccionario, checks).
- Antes de un cambio grande, explica el plan en simple y espera el "sí" de Adela.

## Buzón (rutina principal)
Los archivos los prepara Claude en el chat (proyecto «Killian Aprende») y los deja en `buzon/` de este repositorio.
Cuando Adela diga **"revisa el buzón"** (o en la revisión diaria), sigue los pasos de `buzon/LEEME.md`:
validar con `node tools/validar.js`, subir a `data/`, subir `KX_VERSION`, publicar en `main`,
mover a `buzon/procesados/` y darle a Adela un resumen de 2–3 líneas de qué verá Killian hoy.
**Nunca borres nada de `buzon/procesados/`.**

## Formato de archivos
- La referencia es `FORMATO_IMPORTACION.md`. Si cambias el formato, actualiza ese archivo y avísale a Adela
  para que se lo pase a Claude en el chat (allá preparan los JSON).
- Los temas con `fecha_examen` generan solos tareas de estudio los días previos.

## Avisos
- Avisos por ntfy, tema `killian-d84fb5f5d2eb4fe2b1210ca1`.
