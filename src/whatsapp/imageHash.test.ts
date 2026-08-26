import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashImage } from './imageHash.js';

describe('hashImage', () => {
  it('devuelve el mismo hash para el mismo contenido', () => {
    const buffer = Buffer.from('misma-imagen');
    expect(hashImage(buffer)).toBe(hashImage(Buffer.from('misma-imagen')));
  });

  it('devuelve un hash distinto para contenido distinto', () => {
    expect(hashImage(Buffer.from('imagen-a'))).not.toBe(hashImage(Buffer.from('imagen-b')));
  });

  it('es un sha256 en hex (64 caracteres)', () => {
    const buffer = Buffer.from('contenido-de-prueba');
    expect(hashImage(buffer)).toBe(createHash('sha256').update(buffer).digest('hex'));
  });
});
