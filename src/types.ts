export interface PatenteRecord {
  jugador: string;
  fechaHora: string;
  patente: string;
  puntaje: number | '';
  foto: string;
}

export interface JugadorRecord {
  jugador: string;
  fechaInicio: string;
  fechaUltimaFoto: string;
  puntajeTotal: number;
}

export interface ScoreOption {
  label: string;
  score: number;
}

export interface AppendPatenteJob {
  type: 'APPEND_PATENTE';
  data: {
    jugador: string;
    fechaHora: string;
    patente: string;
    foto: string;
  };
}

export interface UpsertJugadorJob {
  type: 'UPSERT_JUGADOR';
  data: {
    jugador: string;
    fechaHora: string;
  };
}

export interface ClosePollAndScoreJob {
  type: 'CLOSE_POLL_AND_SCORE';
  data: {
    pollMessageId: string;
  };
}

export type SheetJobData = AppendPatenteJob | UpsertJugadorJob | ClosePollAndScoreJob;
