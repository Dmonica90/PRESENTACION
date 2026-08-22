# Divina Comida Familiar → Notion

Web App de Apps Script que recibe las fichas del formulario HTML
(`divina-comida/index.html`) y crea una página por ficha en la base de Notion
*Divina Comida Familiar — Evaluaciones*. La votación es anónima: no se pide ni
se guarda quién califica.

**Este script es la opción B.** El camino principal es el formulario nativo de
Notion, que no necesita nada de esto. Ver
**[`divina-comida/README.md`](../divina-comida/README.md)**.

Si aun así quieres el formulario propio:

1. Pega `DivinaComida_Notion.gs` en un proyecto nuevo de script.google.com.
2. Agrega la Script Property `NOTION_TOKEN` con el secreto de la integración.
3. Comparte la base de Notion con esa integración.
4. Implementa como **Aplicación web** (*Ejecutar como: Yo*, *Acceso: Cualquier usuario*).
5. Pega la URL `/exec` en la variable `ENDPOINT` del formulario.

`probarEnvio()` crea una ficha de prueba desde el editor para verificar la conexión.

Los anfitriones válidos están en la constante `ANFITRIONES` y deben coincidir
exactamente con las opciones de la propiedad `Anfitrión` en Notion.
