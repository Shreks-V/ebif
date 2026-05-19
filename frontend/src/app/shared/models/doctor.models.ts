export interface Doctor {
  id_doctor: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  especialidad?: string;
  telefono?: string;
  correo?: string;
  activo?: string;
}

export interface DoctorHoyResponse {
  doctor: Doctor | null;
  hora_inicio?: string;
  hora_fin?: string;
}

export interface Disponibilidad {
  id_disponibilidad: number;
  id_doctor: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface DisponibilidadEspecial {
  id_disp_especial: number;
  id_doctor: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: string;
}

export interface DisponibilidadSemana {
  dia_semana: number;
  doctores: Doctor[];
}

export interface DoctorServicio {
  id_servicio: number;
  nombre: string;
}
