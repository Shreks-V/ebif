export interface Beneficiario {
  idPaciente: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  fechaNacimiento: string;
  curp: string;
  nombrePadreMadre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefonoCasa: string;
  telefonoCelular: string;
  correoElectronico: string;
  enEmergenciaAvisarA: string;
  telefonoEmergencia: string;
  municipioNacimiento: string;
  estadoNacimiento: string;
  hospitalNacimiento: string;
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  fechaAlta: string;
  membresiaEstatus: string;
  tipoCuota: string;
  activo: string;
  tiposEspina: { idTipoEspina: number; nombre: string }[];
  fechaInicioMembresia: string | null;
  fechaVencimientoMembresia: string | null;
  fotoUrl: string | null;
  iniciales: string;
  color: string;
}

export interface NuevoBeneficiarioDocumento {
  id_tipo_documento: number;
  archivo: File | null;
}

export interface TableSortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TipoDocumento {
  id_tipo_documento: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoEspinaCatalogo {
  id_tipo_espina: number;
  nombre: string;
}

export interface Documento {
  id_documento: number;
  nombre_archivo?: string;
  formato_archivo?: string;
  tipo_nombre?: string;
  fecha_carga?: string;
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

export interface CitaHistorial {
  fecha_hora: string;
  estatus: string;
  notas: string;
  servicios: { nombre: string; cantidad: number; monto_pagado: number; cancelado: string }[];
  doctores: { nombre_doctor: string; especialidad: string }[];
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

export interface BeneficiarioFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  genero: string;
  fecha_nacimiento: string;
  curp: string;
  nombre_padre_madre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  telefono_casa: string;
  telefono_celular: string;
  correo_electronico: string;
  en_emergencia_avisar_a: string;
  telefono_emergencia: string;
  tipo_sangre: string;
  usa_valvula: string;
  tipo_cuota: string;
  membresia_estatus: string;
}

export interface BeneficiarioEditFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  genero: string;
  fecha_nacimiento: string;
  curp: string;
  nombre_padre_madre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  telefono_casa: string;
  telefono_celular: string;
  correo_electronico: string;
  en_emergencia_avisar_a: string;
  telefono_emergencia: string;
  tipo_sangre: string;
  notas_adicionales: string;
  membresia_estatus: string;
  tipo_cuota: string;
}
