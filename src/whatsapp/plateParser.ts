const MERCOSUR_PLATE = /\b([A-Za-z]{2})[\s-]?(\d{3})[\s-]?([A-Za-z]{2})\b/;
const OLD_PLATE = /\b([A-Za-z]{3})[\s-]?(\d{3})\b/;

/**
 * Busca una patente argentina (formato viejo AAA000 o Mercosur AA000AA) en un texto libre.
 * Devuelve la patente normalizada en mayúsculas sin separadores, o null si no encuentra ninguna.
 */
export function extractPlate(text: string): string | null {
  const mercosurMatch = MERCOSUR_PLATE.exec(text);
  if (mercosurMatch) {
    return `${mercosurMatch[1]}${mercosurMatch[2]}${mercosurMatch[3]}`.toUpperCase();
  }

  const oldMatch = OLD_PLATE.exec(text);
  if (oldMatch) {
    return `${oldMatch[1]}${oldMatch[2]}`.toUpperCase();
  }

  return null;
}
