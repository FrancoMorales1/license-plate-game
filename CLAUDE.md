# patentes-bot

Bot de WhatsApp (Baileys) que escucha un grupo, detecta fotos de patentes (del caption o, si no
hay nada ahí, por OCR de la imagen con Google Cloud Vision), las guarda en Google Sheets
(subiendo la foto a Google Drive) y les asigna puntaje automáticamente según si la patente ya se
había cargado antes. Las escrituras al Sheet se serializan con una cola BullMQ (`sheet-writes`,
concurrency 1) sobre Redis.

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
  Sheet existente sí funciona con service account porque no crea un archivo nuevo. Vision OCR
  (`src/whatsapp/plateOcr.ts`) tampoco tiene ese problema (no crea archivos) y reusa la misma
  Service Account que Sheets, sin credenciales nuevas.
- OCR fallback (`src/whatsapp/plateOcr.ts`): solo se usa si el caption no trae ninguna patente
  reconocible. Corre `textDetection` de Cloud Vision sobre la imagen completa (no se recorta la
  patente) y le pasa el texto detectado al mismo parser que usa el caption
  (`plateParser.ts:extractPlate`), así que la precisión depende de que la patente sea legible en
  la foto entera.
- Tope de uso de Vision (`src/whatsapp/visionBudget.ts`, `VISION_MONTHLY_LIMIT`, default 1000):
  contador propio en Redis (no se consulta la API de uso de Google, que tiene delay y requeriría
  habilitar Cloud Monitoring) que cuenta llamadas reales a `textDetection`. Al llegar al límite
  se corta _solo_ el fallback de OCR -las fotos con la patente escrita en el caption siguen
  funcionando igual, no consumen Vision- y se manda un único aviso al grupo por mes (no uno por
  cada foto bloqueada). Si se borra el volumen de Redis el contador se resetea.
- Patente de moto Mercosur (`src/whatsapp/plateParser.ts`, formato A000AAA): el separador
  opcional va entre cada carácter individual, no solo entre los grupos letra/números/letras,
  porque la chapa suele estar en dos líneas y el salto de línea que detecta el OCR puede caer en
  cualquier punto (incluso en el medio del bloque de números, ej. `A19\n8SYB`).
