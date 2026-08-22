# Ficha de Evaluación — Divina Comida Familiar

La votación es **anónima**: nadie escribe su nombre, solo elige a qué anfitrión
está calificando. Los resultados se leen en Notion.

**Base de datos:** [Divina Comida Familiar — Evaluaciones](https://app.notion.com/p/5c8039b8247141ecb9606b45f728c4d4)

Anfitriones registrados: `1. Nando y Moni`, `2. Mir y mamá`, `3. Mir y papá`,
`4. Mary y Diego`. Para agregar otro: en la base, propiedad **Anfitrión** →
Editar propiedad → agregar opción.

---

## Opción A — Formulario nativo de Notion (el que se usa)

Ya existe la vista **Votar (anónimo)** dentro de la base. Falta un paso manual,
porque la API de Notion no permite cargarle las preguntas:

1. Abre la base y entra a la pestaña **Votar (anónimo)**.
2. Agrega las preguntas con el botón **+** del editor de formularios. Notion
   ofrece las propiedades que ya existen; hay que agregarlas en este orden:

   | # | Pregunta |
   |---|---|
   | 1 | Anfitrión |
   | 2 | Nivel Recepción · 3 | Recepción y Ambiente |
   | 4 | Nivel Entrada · 5 | Entrada |
   | 6 | Nivel Plato Fuerte · 7 | Plato Fuerte |
   | 8 | Nivel Postre · 9 | Postre |
   | 10 | Nivel Entretenimiento · 11 | Entretenimiento |
   | 12 | Momento Memorable · 13 | Comentario Secreto |

   El texto de ayuda de cada pregunta ya está escrito en la descripción de la
   propiedad, así que aparece solo. La pregunta **Ficha** (el título) se puede
   borrar del formulario: no se usa.
3. En la configuración del formulario, confirma que **las respuestas anónimas
   estén activadas**. Es lo que evita que se registre quién contestó.
4. **Compartir formulario** → copia el link y mándalo por WhatsApp.

Cada respuesta cae como una fila con `Total` y `Promedio` ya calculados.

### Ver resultados

| Vista | Para qué |
|---|---|
| **Resultados** | Todas las fichas ordenadas por puntaje total |
| **Por anfitrión** | Los votos de cada dupla agrupados |
| **Ganador** | Gráfica de barras con el promedio por anfitrión |

---

## Opción B — Formulario HTML propio (opcional)

`divina-comida/index.html` es la misma ficha con diseño propio: sliders del 1 al
10 y marcador en vivo con la suma y el promedio. Escribe en la misma base, pero
necesita instalación porque la API de Notion no acepta llamadas desde el
navegador y el token no puede ir dentro del HTML — cualquier invitado lo leería.
Por eso hay un intermediario en Apps Script (`apps-script/DivinaComida_Notion.gs`)
que resguarda el token.

### Instalación (~10 minutos)

1. **Integración de Notion:** https://www.notion.so/my-integrations → *New
   integration*, tipo **Internal**. Copia el secreto (empieza con `ntn_`).
2. **Dar acceso a la base:** ábrela en Notion → menú `•••` → **Conexiones** →
   agrega la integración. Sin esto Notion responde `Could not find database`.
3. **Publicar el script:** https://script.google.com → nuevo proyecto → pega
   `apps-script/DivinaComida_Notion.gs` → ⚙️ *Configuración del proyecto* →
   *Propiedades de la secuencia de comandos* → agrega `NOTION_TOKEN` con el
   secreto → **Implementar** → *Nueva implementación* → **Aplicación web**
   (*Ejecutar como:* Yo · *Quién tiene acceso:* Cualquier usuario). Copia la URL
   que termina en `/exec`.
4. **Conectar el formulario:** en `divina-comida/index.html` reemplaza
   `var ENDPOINT = 'PEGA_AQUI_LA_URL_DEL_WEB_APP';` por esa URL, y sube el
   archivo a donde lo abran los invitados.

`probarEnvio()` crea una ficha de prueba desde el editor para verificar la
conexión. Si cambias el `.gs`, hay que publicar una **nueva versión** de la
implementación.

---

## Tip de juego

Entrega sobres cerrados a cada invitado al inicio de la cena y pídeles que llenen
su ficha en privado, estilo *confesionario*, para revelar al ganador en la
reunión final.
