# patentes-bot

Bot de WhatsApp (Baileys) que escucha un grupo, detecta fotos de patentes con la patente
escrita en el caption, las guarda en Google Sheets (subiendo la foto a Google Drive), manda
una encuesta nativa de WhatsApp para puntuar la foto y guarda el resultado. Las escrituras al
Sheet se serializan con una cola BullMQ (`sheet-writes`, concurrency 1) sobre Redis.

## Regla del repositorio

Antes de dar por terminada cualquier tarea (y antes de cualquier commit), deben pasar:

```
pnpm lint
pnpm format
pnpm test
pnpm build
```

Se pueden correr juntos con `pnpm verify`. El mismo chequeo corre en CI
(`.github/workflows/ci.yml`) en cada push/PR a `main`.

## Notas de diseño (asunciones no especificadas por el usuario)

- Si nadie vota una encuesta en `POLL_CLOSE_HOURS`, el puntaje se guarda como `0`.
- "Votaron todos los miembros del grupo" se calcula como participantes del grupo menos el bot,
  en el momento de cada voto (no se cachea la lista de miembros).
- El acumulado de votos de cada encuesta vive en memoria del proceso (no en Redis). Si el bot
  se reinicia mientras hay una encuesta abierta, se pierden los votos ya emitidos hasta ese
  momento (la encuesta sigue abierta y puede seguir recibiendo votos nuevos).
- Google Sheets usa una Service Account, pero Google Drive usa OAuth con la cuenta personal del
  dueño de la carpeta (`src/sheets/driveAuth.ts`, `pnpm get-drive-token`): las service accounts
  no tienen cuota de almacenamiento propia y no pueden crear archivos en Drive personal
  (`storageQuotaExceeded`), aunque la carpeta esté compartida con permiso de Editor. Editar un
  Sheet existente sí funciona con service account porque no crea un archivo nuevo.
