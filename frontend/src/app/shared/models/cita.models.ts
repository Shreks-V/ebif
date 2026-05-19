export type EstatusCita = 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';

export interface Cita {
  id_cita: number;
  id_paciente?: number;
  folio_paciente?: string;
  nombre_paciente?: string;
  tipo_cuota?: string;
  fecha_hora: string;
  estatus: EstatusCita;
  notas?: string;
  servicios?: CitaServicio[];
}

export interface CitaServicio {
  id_servicio: number;
  nombre: string;
  cantidad?: number;
  monto_pagado?: number;
  id_doctor?: number;
}

export interface CitasStats {
  total_hoy?: number;
  total?: number;
  total_ayer?: number;
  completadas?: number;
}

export interface CitasHoyResponse {
  citas: Cita[];
  total?: number;
  completadas?: number;
}
