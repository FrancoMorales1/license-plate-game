# patentes-bot

Bot de WhatsApp para el grupo de patentes: detecta fotos con la patente escrita en el mismo
mensaje, las guarda en un Google Sheet (con la foto en Google Drive), manda una encuesta para
puntuar la foto y guarda el resultado final cuando la encuesta cierra.

## Cómo funciona

1. Alguien manda al grupo una foto con la patente escrita en el mismo mensaje (caption).
2. El bot reconoce la patente (formato viejo `AAA000` o Mercosur `AA000AA`), sube la foto a una
   carpeta de Google Drive y agrega una fila en la hoja **Patentes** (puntaje vacío todavía).
3. El bot manda una encuesta al grupo con 4 opciones fijas:
   - `10 - Palabra exacta`
   - `3 - Palabra similar e insulto`
   - `2 - Palabra similar y random`
   - `1 - Patente random`
4. La encuesta cierra a las `POLL_CLOSE_HOURS` horas (default 24), o antes si vota todo el
   grupo. El puntaje final es el de la opción más votada; si hay empate, se promedian los
   puntajes de las opciones empatadas.
5. El puntaje se escribe en la fila correspondiente de **Patentes** y se suma al acumulado del
   jugador en **Jugadores**.

Todas las escrituras al Sheet pasan por una única cola de BullMQ (`sheet-writes`) con un solo
worker (`concurrency: 1`), así nunca hay dos escrituras al mismo tiempo.

## 1. Preparar el Google Sheet

Creá un Google Sheet nuevo con dos hojas (el nombre de la hoja debe ser exactamente este):

**Patentes** (fila 1 = headers):

| Jugador | fecha-hora | patente | puntaje | foto |
| ------- | ---------- | ------- | ------- | ---- |

**Jugadores** (fila 1 = headers):

| Jugador | fecha-inicio | fecha-ultima-foto | puntaje total |
| ------- | ------------ | ----------------- | ------------- |

## 2. Crear la Service Account de Google (gratis)

1. En [Google Cloud Console](https://console.cloud.google.com/), creá un proyecto.
2. Habilitá las APIs **Google Sheets API** y **Google Drive API**.
3. Creá una **Service Account** (IAM y administración → Cuentas de servicio) y generá una clave
   JSON. Guardá ese archivo como `google-service-account.json` en la raíz del proyecto (está en
   `.gitignore`, no se sube).
4. Compartí el Google Sheet del paso 1 con el email de la service account (termina en
   `...@...iam.gserviceaccount.com`), con permiso de **Editor**.
5. Creá una carpeta en Google Drive para las fotos y compartila también con ese email, permiso
   **Editor**. Copiá el ID de la carpeta (está en la URL de la carpeta).

## 3. Conseguir el JID del grupo de WhatsApp

El JID tiene forma `123456789012345678@g.us`. La forma más simple: dejá correr el bot una vez
conectado, mandá cualquier mensaje al grupo, y va a aparecer en los logs el `remoteJid` del
mensaje (nivel `debug`, poné `LOG_LEVEL=debug` temporalmente). Copialo a `.env`.

## 4. Configurar el `.env`

```bash
cp .env.example .env
```

Completá `WHATSAPP_GROUP_JID`, `GOOGLE_SHEET_ID` (el ID en la URL del Sheet) y
`GOOGLE_DRIVE_FOLDER_ID`.

## 5. Correr todo con Docker

```bash
docker compose up --build
```

La primera vez, el contenedor `app` va a imprimir un QR en los logs (`docker compose logs -f
app`): escaneálo desde WhatsApp → Dispositivos vinculados. La sesión queda guardada en `./auth`,
así que no hace falta volver a escanear en cada reinicio (salvo que cierres sesión desde el
teléfono).

## Desarrollo local (sin Docker)

Necesitás Node 20+, pnpm y un Redis corriendo (`docker run -p 6379:6379 redis:7-alpine`).

```bash
pnpm install
pnpm dev
```

## Antes de commitear

```bash
pnpm verify   # lint + format + test + build
```

Es la misma regla que corre en CI (`.github/workflows/ci.yml`). Ver [CLAUDE.md](./CLAUDE.md)
para las asunciones de diseño que no estaban especificadas (qué pasa si nadie vota, etc.).

## Qué no está cubierto por los tests automáticos

Los tests (`pnpm test`) cubren la lógica pura: parseo de patentes, cálculo del puntaje ganador
y el matching de filas en el Sheet. Lo que requiere credenciales reales hay que probarlo a mano:
el pairing por QR de WhatsApp, la escritura real en Sheets/Drive, y `docker compose up` con
Redis real.
