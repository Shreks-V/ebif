export type EstatusBeneficiario = 'ACTIVO' | 'INACTIVO' | 'BAJA';
export type TipoCuota = 'A' | 'B';
export type EstatusMembresia = 'ACTIVA' | 'VENCIDA' | 'SIN_MEMBRESIA';

export interface Beneficiario {
  id_paciente: number;
  folio: string;
  folio_paciente?: string;
  nombre_completo?: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  genero?: string;
  fecha_nacimiento?: string;
  curp?: string;
  activo?: string;
  estatus_registro?: string;
  membresia_estatus?: EstatusMembresia;
  tipo_cuota?: TipoCuota;
  fecha_alta?: string;
  ciudad?: string;
  estado?: string;
  telefono_celular?: string;
  telefono_casa?: string;
  correo_electronico?: string;
}

export interface BeneficiariosStats {
  total?: number;
  activos?: number;
  inactivos?: number;
  nuevos_esta_semana?: number;
  nuevos_semana_anterior?: number;
  edad_promedio?: number;
  estados_representados?: number;
  por_genero?: Record<string, number>;
  por_tipo_espina?: Record<string, number>;
  por_procedencia?: Record<string, number>;
  por_etapa_vida?: Record<string, number>;
}

export interface TipoEspina {
  id_tipo_espina: number;
  nombre: string;
  descripcion?: string;
}
