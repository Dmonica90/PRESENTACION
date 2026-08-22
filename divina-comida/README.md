# Ficha de Evaluación — Divina Comida Familiar

Formulario web que guarda cada ficha de evaluación como una fila en Notion.

- **Formulario:** `divina-comida/index.html` (una sola página, sin dependencias)
- **Backend:** `apps-script/DivinaComida_Notion.gs` (Google Apps Script)
- **Base de Notion:** *Divina Comida Familiar — Evaluaciones*
  → https://app.notion.com/p/5c8039b8247141ecb9606b45f728c4d4

## Por qué hay un backend

La API de Notion no acepta llamadas desde el navegador (CORS) y el token
de integración no puede vivir dentro del HTML, porque cualquier invitado
podría leerlo. El Apps Script guarda el token y hace de intermediario:
el formulario solo conoce una URL pública que no da acceso a nada más.

## Instalación (una sola vez, ~10 minutos)

### 1. Crear la integración de Notion

1. Entra a https://www.notion.so/my-integrations → **New integration**.
2. Ponle nombre (ej. `Divina Comida`), workspace *Notion de Monica Vazquez*,
   tipo **Internal**.
3. Copia el **Internal Integration Secret** (empieza con `ntn_`).

### 2. Dar acceso a la base

1. Abre la base *Divina Comida Familiar — Evaluaciones* en Notion.
2. Menú `•••` (arriba a la derecha) → **Conexiones** → agrega `Divina Comida`.

Sin este paso Notion responde `Could not find database`.

### 3. Publicar el Apps Script

1. Ve a https://script.google.com → **Nuevo proyecto**.
2. Pega el contenido de `apps-script/DivinaComida_Notion.gs` en `Código.gs`.
3. ⚙️ **Configuración del proyecto** → **Propiedades de la secuencia de comandos**
   → añade la propiedad `NOTION_TOKEN` con el secreto del paso 1.
4. (Opcional) Ejecuta la función `probarEnvio` para comprobar que se crea
   una ficha de prueba en Notion. Bórrala después desde Notion.
5. **Implementar** → **Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
6. Copia la **URL de la aplicación web** (termina en `/exec`).

### 4. Conectar el formulario

En `divina-comida/index.html`, sustituye:

```js
var ENDPOINT = 'PEGA_AQUI_LA_URL_DEL_WEB_APP';
```

por la URL del paso 3.6. Sube el archivo a donde lo vayan a abrir los
invitados (GitHub Pages, Netlify, Drive, o simplemente ábrelo desde el
teléfono con el archivo local).

> Si cambias el `.gs` después, hay que crear una **nueva versión** de la
> implementación para que los cambios surtan efecto.

## Qué se guarda en Notion

| Columna | Origen |
|---|---|
| `Evaluación` | Título automático: `Juez → Anfitrión` |
| `Anfitrión`, `Juez` | Campos de texto del encabezado |
| `Recepción y Ambiente`, `Entrada`, `Plato Fuerte`, `Postre`, `Entretenimiento` | Puntaje 1–10 de cada sección |
| `Nivel …` (5 columnas) | La opción 1-2 / 3-4 / 5 elegida en cada sección |
| `Total`, `Promedio` | Fórmulas calculadas por Notion |
| `Momento Memorable`, `Comentario Secreto` | Confesionario |
| `Fecha` | Momento del envío |

Para revelar al ganador, ordena la vista de Notion por **Total** o
**Promedio** de mayor a menor, o agrupa por **Anfitrión**.

## Modo confesionario

El formulario no muestra los votos de nadie: al enviar solo aparece la
pantalla de "voto sellado", y el botón *Calificar a otro anfitrión*
conserva el nombre del juez para encadenar varias fichas en la misma
velada. Los resultados solo se ven en Notion.
