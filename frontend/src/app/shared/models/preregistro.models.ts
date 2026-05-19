export type EstatusPreRegistro = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface PreRegistro {
  id_paciente: number;
  folio?: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  curp?: string;
  genero?: string;
  fecha_nacimiento?: string;
  estatus_registro: EstatusPreRegistro;
  fecha_alta?: string;
  fecha_registro?: string;
  tipo_cuota?: string;
  correo_electronico?: string;
  telefono_celular?: string;
  telefono_casa?: string;
  ciudad?: string;
  estado?: string;
  estado_nacimiento?: string;
  hospital_nacimiento?: string;
  nombre_padre_madre?: string;
  direccion?: string;
  colonia?: string;
  codigo_postal?: string;
  en_emergencia_avisar_a?: string;
  telefono_emergencia?: string;
  tipo_sangre?: string;
  usa_valvula?: string;
  notas_adicionales?: string;
  paso_actual?: number;
}

export interface TipoDocumento {
  id_tipo_documento: number;
  nombre: string;
  descripcion?: string;
  requerido?: string;
}

export interface Documento {
  id_documento: number;
  id_tipo_documento: number;
  tipo_nombre?: string;
  ruta_archivo?: string;
  formato_archivo?: string;
  fecha_carga?: string;
  activo?: string;
}

export interface CurpCheckResponse {
  disponible: boolean;
}

export interface AprobarPayload {
  tipo_cuota?: string | null;
}
