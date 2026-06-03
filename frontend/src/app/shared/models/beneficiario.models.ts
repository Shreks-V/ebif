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
  nombre_padre_madre?: string;
  direccion?: string;
  colonia?: string;
  codigo_postal?: string;
  en_emergencia_avisar_a?: string;
  telefono_emergencia?: string;
  municipio_nacimiento?: string;
  estado_nacimiento?: string;
  hospital_nacimiento?: string;
  tipo_sangre?: string;
  usa_valvula?: string;
  notas_adicionales?: string;
  fecha_inicio_membresia?: string | null;
  fecha_vencimiento_membresia?: string | null;
  tipos_espina?: { id_tipo_espina: number; nombre: string }[];
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

export interface RenovarMembresiaPayload {
  monto_total: number;
  exento_pago: string;
  metodos_pago: { id_metodo_pago: number; monto: number }[];
}

export interface MapaBeneficiario {
  id_paciente: number;
  folio_paciente: string;
  nombre_completo: string;
  ciudad: string;
  estado: string;
  tipo_cuota: string;
  latitud: number | null;
  longitud: number | null;
  geocodificado: 'S' | 'N' | 'F';
}

export interface CitaHistorial {
  fecha_hora: string;
  estatus: string;
  notas: string;
  servicios: { nombre: string; cantidad: number; monto_pagado: number; cancelado: string }[];
  doctores: { nombre_doctor: string; especialidad: string }[];
}

export interface CobroResumen {
  id_venta: number;
  folio_venta?: string;
  fecha_venta?: string;
  monto_total: number;
  saldo_pendiente: number;
  cancelada?: string;
  motivo_cancelacion?: string;
}

export interface HistorialData {
  nombre: string;
  citas: CitaHistorial[];
  pagos: CobroResumen[];
  comodatos: {
    nombre_equipo: string;
    folio_comodato: string;
    estatus: string;
    fecha_prestamo: string;
    fecha_devolucion: string | null;
    monto_total: number | null;
    saldo_pendiente: number | null;
  }[];
}

export interface NotificacionSistema {
  id: string;
  categoria: 'citas' | 'membresias' | 'almacen';
  tipo: 'info' | 'warning';
  titulo: string;
  detalle: string;
  count: number;
  link: string;
}
