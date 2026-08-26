import type { WAMessageKey } from '@whiskeysockets/baileys';

export interface PatenteRecord {
  jugador: string;
  fechaHora: string;
  patente: string;
  puntaje: number;
  foto: string;
}

export interface JugadorRecord {
  jugador: string;
  fechaInicio: string;
  fechaUltimaFoto: string;
  puntajeTotal: number;
}

export interface AppendPatenteJob {
  type: 'APPEND_PATENTE';
  data: {
    jugador: string;
    fechaHora: string;
    patente: string;
    foto: string;
    messageKey: WAMessageKey;
  };
}

export interface UpsertJugadorJob {
  type: 'UPSERT_JUGADOR';
  data: {
    jugador: string;
    fechaHora: string;
  };
}

export type SheetJobData = AppendPatenteJob | UpsertJugadorJob;
