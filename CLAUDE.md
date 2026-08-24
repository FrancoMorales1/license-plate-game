# patentes-bot

Bot de WhatsApp (Baileys) que escucha un grupo, detecta fotos de patentes con la patente
escrita en el caption, las guarda en Google Sheets (subiendo la foto a Google Drive) y les
asigna puntaje automáticamente según si la patente ya se había cargado antes. Las escrituras al
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

- Puntaje de una patente (`src/sheets/patentesSheet.ts:computePatenteScore`): 1 punto si nadie
  la cargó antes (comparando contra todo el historial de "Patentes", cualquier jugador), 0.5 si
  ya la cargó otro jugador, 0 si ya la cargó el mismo jugador (no se puede cobrar dos veces la
  misma patente). Se calcula en el momento de agregar la fila, no hay encuesta ni votación.
- Google Sheets usa una Service Account, pero Google Drive usa OAuth con la cuenta personal del
  dueño de la carpeta (`src/sheets/driveAuth.ts`, `pnpm get-drive-token`): las service accounts
  no tienen cuota de almacenamiento propia y no pueden crear archivos en Drive personal
  (`storageQuotaExceeded`), aunque la carpeta esté compartida con permiso de Editor. Editar un
  Sheet existente sí funciona con service account porque no crea un archivo nuevo.
