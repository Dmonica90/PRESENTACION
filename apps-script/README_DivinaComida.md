# Divina Comida Familiar → Notion

Web App de Apps Script que recibe las fichas de evaluación del formulario
`divina-comida/index.html` y crea una página por ficha en la base de Notion
*Divina Comida Familiar — Evaluaciones*.

La guía de instalación completa está en **[`divina-comida/README.md`](../divina-comida/README.md)**.

Resumen:

1. Pega `DivinaComida_Notion.gs` en un proyecto nuevo de script.google.com.
2. Añade la Script Property `NOTION_TOKEN` con el secreto de la integración.
3. Comparte la base de Notion con esa integración.
4. Implementa como **Aplicación web** (*Ejecutar como: Yo*, *Acceso: Cualquier usuario*).
5. Pega la URL `/exec` en la variable `ENDPOINT` del formulario.

`probarEnvio()` crea una ficha de prueba desde el editor para verificar la conexión.
