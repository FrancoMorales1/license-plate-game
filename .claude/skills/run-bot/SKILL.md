---
name: run-bot
description: Levantar el bot de WhatsApp (patentes-bot) localmente con Docker Compose, verificar que arrancó bien y parear WhatsApp por QR. Usar cuando el usuario pide correr, levantar, arrancar o probar el bot.
---

# Levantar patentes-bot

## 1. Prerrequisitos (una sola vez)

Estos dos archivos están en `.gitignore` y no vienen en el repo — si falta alguno, pedíselo al
usuario en vez de inventarlo:

- `.env` en la raíz, completo (ver `.env.example`). Todas las vars son obligatorias
  (`src/config/env.ts` valida con zod y tira error si falta una).
- `google-service-account.json` en la raíz — la Service Account para Sheets y Vision OCR.

No hace falta Node/pnpm instalados en el host: el `Dockerfile` trae su propio Node 20 y build.

## 2. Levantar

```bash
docker compose up --build -d
```

El `docker-compose.yml` fija `REDIS_URL=redis://redis:6379` (contenedor interno, red propia del
compose) sin importar lo que diga `REDIS_URL` en `.env` — así que **no hay conflicto** aunque ya
haya otro Redis corriendo en el puerto 6379 del host (el de este proyecto no lo publica).

## 3. Verificar que arrancó

```bash
docker compose ps                    # app + redis "Up"/"healthy"
docker compose logs app --tail=100   # buscar "Iniciando bot de patentes"
```

**Primera vez (o si se perdió la sesión):** los logs de `app` van a imprimir un QR ASCII y el
mensaje "Escaneá el QR de arriba con WhatsApp (Dispositivos vinculados) para conectar el bot.".
Hay que escanearlo desde el teléfono. La sesión queda en `./auth` (bind mount), así que no hace
falta repetirlo en reinicios futuros salvo que se cierre sesión desde el teléfono o se borre esa
carpeta.

**Si ya había sesión guardada:** los logs muestran directamente `connected to WA` sin QR.

## 4. Parar

```bash
docker compose down          # mantiene ./auth y el volumen de datos de Redis
docker compose logs -f app   # para seguir los logs en vivo mientras corre
```

## Troubleshooting

- **Falla al toque con un error de zod/env** → falta o está incompleto `.env` (revisar contra
  `.env.example`).
- **Arranca y parea bien, pero explota al llegar la primera foto con patente** → seguramente
  `google-service-account.json` no existe o es inválido, o el Sheet no está compartido con el
  email de esa Service Account (`...@...iam.gserviceaccount.com`, permiso Editor).
- **Sube pero nunca imprime QR ni "connected to WA"** → revisar `WHATSAPP_GROUP_JID` en `.env` y
  que `./auth` no tenga una sesión corrupta (se puede borrar la carpeta para forzar un QR nuevo).

## Alternativa: dev local sin Docker

Requiere Node 20+, pnpm y un Redis corriendo en el host (`docker run -p 6379:6379 redis:7-alpine`
si no hay uno ya). Ahí sí importa el `REDIS_URL` de `.env` (por defecto
`redis://localhost:6379`).

```bash
pnpm install
pnpm dev
```
