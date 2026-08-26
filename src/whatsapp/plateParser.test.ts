import { describe, expect, it } from 'vitest';
import { extractPlate } from './plateParser.js';

describe('extractPlate', () => {
  it('detecta el formato viejo (AAA000)', () => {
    expect(extractPlate('ABC123')).toBe('ABC123');
  });

  it('detecta el formato viejo en minúsculas dentro de una frase', () => {
    expect(extractPlate('miren esta abc123 que se re re')).toBe('ABC123');
  });

  it('detecta el formato Mercosur (AA000AA)', () => {
    expect(extractPlate('AB123CD')).toBe('AB123CD');
  });

  it('detecta el formato Mercosur con separadores', () => {
    expect(extractPlate('AB-123-CD')).toBe('AB123CD');
    expect(extractPlate('AB 123 CD')).toBe('AB123CD');
  });

  it('prioriza el formato Mercosur sobre el viejo cuando ambos podrían aplicar', () => {
    expect(extractPlate('la patente es AB123CD')).toBe('AB123CD');
  });

  it('no confunde una patente vieja con la palabra siguiente', () => {
    expect(extractPlate('ABC123 anda re al pedo')).toBe('ABC123');
  });

  it('detecta el formato Mercosur moto (A000AAA)', () => {
    expect(extractPlate('A198SYB')).toBe('A198SYB');
  });

  it('detecta el formato Mercosur moto en minúsculas dentro de una frase', () => {
    expect(extractPlate('mirá la moto a198syb que pasó')).toBe('A198SYB');
  });

  it('detecta el formato Mercosur moto con separadores', () => {
    expect(extractPlate('A-198-SYB')).toBe('A198SYB');
    expect(extractPlate('A 198 SYB')).toBe('A198SYB');
  });

  it('detecta el formato Mercosur moto cuando el OCR la parte en dos líneas a mitad de los números', () => {
    expect(extractPlate('MERCOSUR\nREPÚBLICA ARGENTINA\nA19\n8SYB')).toBe('A198SYB');
  });

  it('devuelve null si no hay ninguna patente', () => {
    expect(extractPlate('no hay patente en este texto')).toBeNull();
  });

  it('devuelve null con texto vacío', () => {
    expect(extractPlate('')).toBeNull();
  });
});
