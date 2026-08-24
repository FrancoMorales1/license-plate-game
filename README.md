# patentes-bot

Bot de WhatsApp para el grupo de patentes: detecta fotos de patentes (por texto o por OCR), las
guarda en un Google Sheet (con la foto en Google Drive) y les asigna puntaje según si esa
patente ya se había cargado antes.

## Cómo funciona

1. Alguien manda al grupo una foto de una patente, opcionalmente con la patente escrita en el
   mismo mensaje (caption).
2. El bot reconoce la patente (formato viejo `AAA000` o Mercosur `AA000AA`): primero prueba con
   el caption y, si no hay nada reconocible ahí, baja la foto y prueba con OCR (Google Cloud
   Vision) sobre la imagen completa. Si ninguno de los dos encuentra una patente, la foto se
   ignora. Después sube la foto a una carpeta de Google Drive.
3. Calcula el puntaje comparando contra todo el historial de la hoja **Patentes** (de cualquier
   jugador):
   - Patente nueva (nadie la cargó antes) → **1 punto**.
   - Ya la cargó otro jugador → **0.5** (medio punto).
   - Ya la cargó el mismo jugador antes → **0** (no se puede cobrar dos veces la misma patente).
4. Agrega la fila en **Patentes** con el puntaje ya calculado y lo suma al acumulado del jugador
   en **Jugadores**.

Todas las escrituras al Sheet pasan por una única cola de BullMQ (`sheet-writes`) con un solo
worker (`concurrency: 1`): esto es lo que garantiza que el cálculo de "¿ya existe esta patente?"
sea correcto incluso si dos fotos llegan casi al mismo tiempo.

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
para editar el Sheet y para el OCR de Vision (ahí no hay problema, ninguna de las dos crea
archivos) y OAuth con tu cuenta personal para subir las fotos a Drive (así el archivo cuenta
contra tus 15GB gratis).

1. En [Google Cloud Console](https://console.cloud.google.com/), creá un proyecto. Va a pedirte
   vincular una cuenta de facturación (tarjeta) para poder habilitar las APIs, aunque te quedes
   dentro de la capa gratuita: Vision OCR tiene 1.000 imágenes gratis por mes, este juego
   difícilmente las supera.
2. Habilitá las APIs **Google Sheets API**, **Google Drive API** y **Cloud Vision API**.
3. **Service Account** (para el Sheet y el OCR): IAM y administración → Cuentas de servicio →
   creá una y generá una clave JSON. Guardala como `google-service-account.json` en la raíz del
   proyecto (está en `.gitignore`, no se sube). Compartí el Google Sheet del paso 1 con el email
   de la service account (termina en `...@...iam.gserviceaccount.com`), permiso **Editor**. Copiá
   el ID del Sheet (está en su URL) a `GOOGLE_SHEET_ID` en `.env`. Para Vision no hace falta
   compartir nada más: alcanza con que la API esté habilitada en el proyecto.
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
para las asunciones de diseño que no estaban especificadas.

## Qué no está cubierto por los tests automáticos

Los tests (`pnpm test`) cubren la lógica pura: parseo de patentes y cálculo del puntaje según
si la patente es repetida. Lo que requiere credenciales reales hay que probarlo a mano: el
pairing por QR de WhatsApp, la escritura real en Sheets/Drive, la precisión del OCR de Vision
sobre fotos reales, y `docker compose up` con Redis real.
