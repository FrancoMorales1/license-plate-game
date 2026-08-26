const MERCOSUR_PLATE = /\b([A-Za-z]{2})[\s-]?(\d{3})[\s-]?([A-Za-z]{2})\b/;
const OLD_PLATE = /\b([A-Za-z]{3})[\s-]?(\d{3})\b/;
// Las motos suelen tener la chapa en dos líneas, y el salto de línea puede caer en cualquier
// punto (incluso en el medio del bloque de números, ej. "A19\n8SYB"), no solo entre letras y
// números: por eso acá el separador opcional va entre cada carácter individual.
const MERCOSUR_MOTO_PLATE =
  /\b([A-Za-z])[\s-]*(\d)[\s-]*(\d)[\s-]*(\d)[\s-]*([A-Za-z])[\s-]*([A-Za-z])[\s-]*([A-Za-z])\b/;

/**
 * Busca una patente argentina (formato viejo AAA000, Mercosur AA000AA o Mercosur moto A000AAA)
 * en un texto libre. Devuelve la patente normalizada en mayúsculas sin separadores, o null si no
 * encuentra ninguna.
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

  const motoMatch = MERCOSUR_MOTO_PLATE.exec(text);
  if (motoMatch) {
    return motoMatch.slice(1, 8).join('').toUpperCase();
  }

  return null;
}
