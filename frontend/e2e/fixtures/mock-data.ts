// ────────────────────────────────────────────────────────────────────────────
// Mock data for all Playwright E2E tests – mirrors real API response shapes
// ────────────────────────────────────────────────────────────────────────────

// ── Beneficiarios ──────────────────────────────────────────────────────────
export interface MockBeneficiario {
  id_paciente: number;
  folio_paciente: string;
  folio?: string;             // ← component reads item.folio
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_cuota: string;
  membresia_estatus: string;
  fecha_vencimiento_membresia: string;
  correo?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  estado?: string;
  curp?: string;
}

export const mockBeneficiarios: MockBeneficiario[] = [
  {
    id_paciente: 1,
    folio_paciente: 'EB-001',
    folio: 'EB-001',          // ← component reads item.folio (not folio_paciente)
    nombre: 'María',
    apellido_paterno: 'González',
    apellido_materno: 'Ríos',
    tipo_cuota: 'A',
    membresia_estatus: 'ACTIVA',
    fecha_vencimiento_membresia: '2026-12-31',
    correo: 'maria@example.com',
    telefono: '8111234567',
    fecha_nacimiento: '1990-05-15',
    genero: 'F',
    estado: 'Nuevo León',
    curp: 'GORM900515MNLNNA09',
  },
  {
    id_paciente: 2,
    folio_paciente: 'EB-002',
    folio: 'EB-002',          // ← component reads item.folio
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'López',
    tipo_cuota: 'B',
    membresia_estatus: 'POR VENCER',
    fecha_vencimiento_membresia: '2026-06-15',
    correo: 'juan@example.com',
    telefono: '8119876543',
    fecha_nacimiento: '1985-03-22',
    genero: 'M',
    estado: 'Nuevo León',
    curp: 'PELJ850322HNLRPN05',
  },
  {
    id_paciente: 3,
    folio_paciente: 'EB-003',
    folio: 'EB-003',          // ← component reads item.folio
    nombre: 'Sofía',
    apellido_paterno: 'Martínez',
    apellido_materno: 'Vega',
    tipo_cuota: 'A',
    membresia_estatus: 'ACTIVA',
    fecha_vencimiento_membresia: '2026-12-31',
    correo: 'sofia@example.com',
    telefono: '8115551234',
    fecha_nacimiento: '2002-11-08',
    genero: 'F',
    estado: 'Nuevo León',
    curp: 'MAVS021108MNLRGF01',
  },
];

// ── Citas ──────────────────────────────────────────────────────────────────
// Uses real API field names (Cita model: fecha_hora, estatus EstatusCita)
export interface MockCita {
  id_cita: number;
  id_paciente: number;
  folio_paciente: string;
  nombre_paciente: string;
  tipo_cuota?: string;
  id_doctor?: number;
  nombre_doctor?: string;
  fecha_hora: string;          // ← real field used by the app
  estatus: string;
  notas?: string;
  servicios?: Array<{ id_servicio: number; nombre: string; monto_pagado: number; id_doctor?: number }>;
}

// Use today's real date so the citas page "Hoy" filter shows them.
const HOY = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

export const mockCitas: MockCita[] = [
  {
    id_cita: 1,
    id_paciente: 1,
    folio_paciente: 'EB-001',
    nombre_paciente: 'María González Ríos',
    tipo_cuota: 'A',
    id_doctor: 1,
    nombre_doctor: 'Dr. Roberto Sánchez',
    fecha_hora: `${HOY}T09:00:00`,
    estatus: 'PROGRAMADA',
    notas: '',
    servicios: [{ id_servicio: 1, nombre: 'Consulta General', monto_pagado: 150, id_doctor: 1 }],
  },
  {
    id_cita: 2,
    id_paciente: 2,
    folio_paciente: 'EB-002',
    nombre_paciente: 'Juan Pérez López',
    tipo_cuota: 'B',
    id_doctor: 1,
    nombre_doctor: 'Dr. Roberto Sánchez',
    fecha_hora: `${HOY}T10:30:00`,
    estatus: 'EN_CURSO',
    notas: 'Traer estudios previos',
    servicios: [{ id_servicio: 2, nombre: 'Fisioterapia', monto_pagado: 200, id_doctor: 1 }],
  },
];

// ── Recibos ────────────────────────────────────────────────────────────────
export interface MockRecibo {
  id_venta: number;
  folio_venta: string;
  nombre_paciente: string;
  folio_paciente: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estatus_pago: string;
  fecha_venta: string;
  exento: boolean;
  perdonado: boolean;
  metodos_pago?: Array<{ nombre: string; monto: number }>;
}

export const mockRecibos: MockRecibo[] = [
  {
    id_venta: 1,
    folio_venta: 'REC-2026-001',
    nombre_paciente: 'María González Ríos',
    folio_paciente: 'EB-001',
    monto_total: 350.0,
    monto_pagado: 350.0,
    saldo_pendiente: 0,
    estatus_pago: 'PAGADO',
    fecha_venta: '2026-05-26T09:30:00',
    exento: false,
    perdonado: false,
    metodos_pago: [{ nombre: 'EFECTIVO', monto: 350.0 }],
  },
  {
    id_venta: 2,
    folio_venta: 'REC-2026-002',
    nombre_paciente: 'Juan Pérez López',
    folio_paciente: 'EB-002',
    monto_total: 150.0,
    monto_pagado: 0,
    saldo_pendiente: 150.0,
    estatus_pago: 'PENDIENTE',
    fecha_venta: '2026-05-26T10:00:00',
    exento: false,
    perdonado: false,
    metodos_pago: [],
  },
];

// ── Servicios ──────────────────────────────────────────────────────────────
export const mockServicios = [
  {
    id_servicio: 1,
    nombre: 'Consulta General',
    cuota_recuperacion: 150.0,
    precio_cuota_a: 150.0,
    precio_cuota_b: 200.0,
    activo: 'S',
    tipo: 'CONSULTA',
  },
  {
    id_servicio: 2,
    nombre: 'Fisioterapia',
    cuota_recuperacion: 200.0,
    precio_cuota_a: 200.0,
    precio_cuota_b: 280.0,
    activo: 'S',
    tipo: 'TERAPIA',
  },
  {
    id_servicio: 3,
    nombre: 'Terapia Ocupacional',
    cuota_recuperacion: 180.0,
    precio_cuota_a: 180.0,
    precio_cuota_b: 250.0,
    activo: 'S',
    tipo: 'TERAPIA',
  },
];

// ── Métodos de pago ────────────────────────────────────────────────────────
export const mockMetodosPago = [
  { id_metodo_pago: 1, nombre: 'EFECTIVO' },
  { id_metodo_pago: 2, nombre: 'TRANSFERENCIA' },
  { id_metodo_pago: 3, nombre: 'TARJETA' },
  { id_metodo_pago: 4, nombre: 'EXENTO' },
];

// ── Productos (almacén) ────────────────────────────────────────────────────
// tipo_producto must be 'MEDICAMENTO' or 'EQUIPO' so the inventory tab shows them
export const mockProductos = [
  {
    id_producto: 1,
    nombre: 'Catéter Intermitente 14 Fr',
    tipo_producto: 'MEDICAMENTO',   // ← maps to 'MEDICAMENTO' category in inventory
    cantidad_disponible: 50,
    nivel_minimo: 10,
    activo: 'S',
    precio_cuota_a: 45.0,
    precio_cuota_b: 60.0,
    unidad_medida: 'pieza',
  },
  {
    id_producto: 2,
    nombre: 'Silla de Ruedas Estándar',
    tipo_producto: 'EQUIPO',        // ← maps to 'EQUIPO' category in inventory
    cantidad_disponible: 5,
    nivel_minimo: 2,
    activo: 'S',
    precio_cuota_a: 0.0,
    precio_cuota_b: 0.0,
    unidad_medida: 'pieza',
  },
];

// ── Comodatos ──────────────────────────────────────────────────────────────
// Field names match ComodatoRaw model exactly
export interface MockComodato {
  id_comodato: number;
  folio_comodato: string;
  id_equipo: number;
  nombre_equipo: string;
  id_paciente: number;
  nombre_paciente: string;
  folio_paciente: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estatus: string;          // 'PRESTADO' | 'DEVUELTO' | 'CANCELADO'
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  exento_pago: string;      // 'S' | 'N'
  notas?: string;
}

export const mockComodatos: MockComodato[] = [
  {
    id_comodato: 1,
    folio_comodato: 'COM-2026-001',
    id_equipo: 2,
    nombre_equipo: 'Silla de Ruedas Estándar',
    id_paciente: 1,
    nombre_paciente: 'María González Ríos',
    folio_paciente: 'EB-001',
    fecha_prestamo: '2026-01-15',
    fecha_devolucion: '2026-07-15',
    estatus: 'PRESTADO',    // ← correct value for getComodatosActivosCount()
    monto_total: 0,
    monto_pagado: 0,
    saldo_pendiente: 0,
    exento_pago: 'S',
    notas: 'En buen estado',
  },
  {
    id_comodato: 2,
    folio_comodato: 'COM-2026-002',
    id_equipo: 2,
    nombre_equipo: 'Silla de Ruedas Estándar',
    id_paciente: 2,
    nombre_paciente: 'Juan Pérez López',
    folio_paciente: 'EB-002',
    fecha_prestamo: '2026-02-10',
    fecha_devolucion: null,
    estatus: 'PRESTADO',
    monto_total: 500,
    monto_pagado: 250,
    saldo_pendiente: 250,
    exento_pago: 'N',
    notas: 'Requiere revisión mensual',
  },
];

// ── Médicos ────────────────────────────────────────────────────────────────
export const mockMedicos = [
  {
    id_doctor: 1,
    nombre: 'Roberto',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'Torres',
    especialidad: 'Neurología Pediátrica',
    correo: 'roberto@ebif.local',
    telefono: '8181234567',
    activo: true,
    horario_inicio: '08:00',
    horario_fin: '14:00',
  },
  {
    id_doctor: 2,
    nombre: 'Ana',
    apellido_paterno: 'López',
    apellido_materno: 'Ruiz',
    especialidad: 'Fisioterapia',
    correo: 'ana@ebif.local',
    telefono: '8189876543',
    activo: true,
    horario_inicio: '09:00',
    horario_fin: '15:00',
  },
];

// ── Dashboard stats (BeneficiariosStats model shape) ─────────────────────
// The dashboard service reads: benefStats.activos ?? benefStats.total ?? 0
export const mockDashboard = {
  // BeneficiariosStats-compatible fields
  activos: 42,
  total: 47,
  inactivos: 5,
  nuevos_esta_semana: 3,
  nuevos_semana_anterior: 2,
};

// ── Usuarios del Sistema ───────────────────────────────────────────────────
// Must match UsuarioSistema model: id_usuario, nombre, apellido_paterno, correo, rol, estatus
export interface MockUsuario {
  id_usuario: number;
  correo: string;
  nombre: string;
  apellido_paterno?: string;
  rol: string;
  estatus: string;            // ← model uses estatus not activo
  fecha_alta?: string;
}

export const mockUsuarios: MockUsuario[] = [
  {
    id_usuario: 1,
    correo: 'admin@ebif.local',
    nombre: 'Admin',
    apellido_paterno: 'EBIF',
    rol: 'ADMINISTRADOR',
    estatus: 'ACTIVO',
    fecha_alta: '2025-01-01T00:00:00',
  },
  {
    id_usuario: 2,
    correo: 'recepcion@ebif.local',
    nombre: 'Recepcionista',
    apellido_paterno: 'Uno',
    rol: 'OPERATIVO',
    estatus: 'ACTIVO',
    fecha_alta: '2025-03-01T00:00:00',
  },
];

// ── Auth me response ───────────────────────────────────────────────────────
export const mockAuthMe = {
  id_usuario: 1,
  correo: 'admin@ebif.local',
  nombre: 'Admin EBIF',
  rol: 'ADMINISTRADOR',
};

// ── Doctor del día (dashboard) ─────────────────────────────────────────────
export const mockDoctorHoy = {
  doctor: {
    id_doctor: 1,
    nombre: 'Roberto',
    apellido_paterno: 'Sánchez',
    especialidad: 'Neurología Pediátrica',
  },
  hora_inicio: `${HOY}T08:00:00`,
  hora_fin: `${HOY}T14:00:00`,
  total: 2,
  completadas: 0,
};

// ── Stats for recibos ──────────────────────────────────────────────────────
export const mockRecibosStats = {
  total_recibos: 52,
  monto_total: 45600.0,
  monto_pagado: 42100.0,
  saldo_pendiente: 3500.0,
  recibos_pagados: 48,
  pendientes: 6,         // ← key read by dashboard: recibosStats.pendientes
  total_hoy: 3,
  total_ayer: 2,
  recibos_cancelados: 1,
};

// ── Almacen stats (AlmacenStats model shape) ───────────────────────────────
export const mockAlmacenStats = {
  alertas_stock_bajo: 0,
  alertas_caducidad: 0,
  comodatos_activos: 2,
  stock_bajo: [],
  proximos_vencer: [],
};

// ── Bitácora entries (BitacoraResponse shape: { items, total }) ────────────
// Fields must match BitacoraItem interface:
//   tabla, tabla_afectada, tipo_operacion (INSERT|UPDATE|DELETE), fecha_cambio,
//   usuario_nombre (NOT nombre_usuario), usuario_apellido, id_registro_afectado
export const mockBitacora = {
  items: [
    {
      id_bitacora: 1,
      tabla: 'BENEFICIARIO',
      tabla_afectada: 'BENEFICIARIO',
      tipo_operacion: 'INSERT',
      id_registro: 1,
      id_registro_afectado: 'EB-001',
      descripcion: 'Nuevo beneficiario registrado',
      fecha_operacion: '2026-05-26T08:30:00',
      fecha_cambio: '2026-05-26T08:30:00',
      id_usuario: 1,
      usuario_nombre: 'Admin',      // ← template shows {{ item.usuario_nombre }}
      usuario_apellido: 'EBIF',
    },
    {
      id_bitacora: 2,
      tabla: 'VENTA',
      tabla_afectada: 'VENTA',
      tipo_operacion: 'INSERT',
      id_registro: 2,
      id_registro_afectado: 'REC-2026-001',
      descripcion: 'Nuevo cobro registrado',
      fecha_operacion: '2026-05-26T09:15:00',
      fecha_cambio: '2026-05-26T09:15:00',
      id_usuario: 2,
      usuario_nombre: 'Recepcionista',
      usuario_apellido: 'Uno',
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};
