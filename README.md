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

## 2. Instalar dependencias y crear el `.env`

```bash
pnpm install
cp .env.example .env
```

El `.env` lo vamos completando en los pasos siguientes.

## 3. Google Cloud: Service Account (Sheets) + OAuth (Drive)

Google no deja que una Service Account suba archivos a una cuenta de Gmail personal: no tiene
cuota de almacenamiento propia, así que cualquier archivo que cree falla con
`storageQuotaExceeded` aunque la carpeta sea tuya y esté compartida con permiso de Editor (las
soluciones oficiales de Google para esto —Shared Drives, domain-wide delegation— requieren
Google Workspace pago). Por eso acá se usan **dos identidades distintas**: una Service Account
para editar el Sheet (ahí no hay problema, no crea archivos nuevos) y OAuth con tu cuenta
personal para subir las fotos a Drive (así el archivo cuenta contra tus 15GB gratis).

1. En [Google Cloud Console](https://console.cloud.google.com/), creá un proyecto.
2. Habilitá las APIs **Google Sheets API** y **Google Drive API**.
3. **Service Account** (para el Sheet): IAM y administración → Cuentas de servicio → creá una y
   generá una clave JSON. Guardala como `google-service-account.json` en la raíz del proyecto
   (está en `.gitignore`, no se sube). Compartí el Google Sheet del paso 1 con el email de la
   service account (termina en `...@...iam.gserviceaccount.com`), permiso **Editor**. Copiá el
   ID del Sheet (está en su URL) a `GOOGLE_SHEET_ID` en `.env`.
4. **OAuth Client (para Drive)**: APIs y servicios → Credenciales → Crear credenciales → ID de
   cliente de OAuth → tipo **Aplicación de escritorio** (esto habilita cualquier puerto de
   `localhost` como redirect URI sin tener que registrarlo). Si te pide configurar la pantalla de
   consentimiento, elegí External y agregá tu propia cuenta como usuario de prueba (queda en modo
   "Testing", no hace falta publicarla). Copiá el **Client ID** y el **Client secret** a `.env`
   (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`).
5. Creá una carpeta en Google Drive para las fotos con tu cuenta normal (no hace falta
   compartirla con nadie, ya es tuya). Copiá su ID (está en la URL de la carpeta) a
   `GOOGLE_DRIVE_FOLDER_ID` en `.env`.
6. Con `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` ya en el `.env`, corré:

   ```bash
   pnpm get-drive-token
   ```

   Abrí la URL que imprime, iniciá sesión con la cuenta dueña de la carpeta del paso 5 y aceptá.
   El script te va a devolver una línea `GOOGLE_OAUTH_REFRESH_TOKEN=...`: copiala a `.env`.

## 4. Conseguir el JID del grupo de WhatsApp

El JID tiene forma `123456789012345678@g.us`. Corré:

```bash
pnpm get-group-jid
```

Escaneá el QR (usa la misma sesión que el bot, guardada en `./auth`) y mandá cualquier mensaje
al grupo: el script imprime el nombre y el JID de cada grupo del que reciba un mensaje. Copiá el
JID a `WHATSAPP_GROUP_JID` en `.env`. Cortalo con Ctrl+C cuando lo tengas.

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
