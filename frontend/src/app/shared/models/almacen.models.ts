export interface ProductoRaw {
  id_producto: number;
  clave_interna?: string;
  nombre: string;
  descripcion?: string;
  tipo_producto: string;
  precio_cuota_a?: number | null;
  precio_cuota_b?: number | null;
  activo?: string;
  presentacion?: string;
  dosis?: string;
  requiere_caducidad?: string;
  numero_serie?: string;
  marca?: string;
  modelo?: string;
  estatus_equipo?: string;
  observaciones?: string;
  cantidad_disponible?: number | null;
  nivel_minimo?: number | null;
  unidad_medida?: string;
  fecha_caducidad?: string | null;
  // Variantes (calibres, tallas, etc.)
  id_producto_padre?: number | null;
  nombre_variante?: string | null;
  variantes?: ProductoRaw[];
}

export interface VarianteCreatePayload {
  nombre_variante: string;
  cantidad_disponible: number;
  nivel_minimo: number;
  unidad_medida?: string;
  fecha_caducidad?: string;
  precio_cuota_a?: number;
  precio_cuota_b?: number;
}

export interface ServicioRaw {
  id_servicio: number;
  nombre: string;
  descripcion?: string;
  cuota_recuperacion?: number;
  precio_cuota_a?: number | null;
  precio_cuota_b?: number | null;
  activo?: string;
  categoria?: string;
}

export interface ComodatoRaw {
  id_comodato: number;
  folio_comodato: string;
  id_equipo: number;
  nombre_equipo: string;
  id_paciente: number;
  nombre_paciente: string;
  folio_paciente: string;
  fecha_prestamo: string;
  fecha_devolucion: string | null;
  estatus: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  exento_pago: string;
  notas?: string;
}

export interface AlmacenStats {
  alertas_stock_bajo?: number;
  alertas_caducidad?: number;
  comodatos_activos?: number;
  stock_bajo?: AlmacenAlertaRaw[];
  proximos_vencer?: AlmacenAlertaRaw[];
}

export interface AlmacenAlertaRaw {
  id_producto: number;
  nombre: string;
  clave_interna?: string;
  cantidad_disponible?: number;
  nivel_minimo?: number;
  fecha_caducidad?: string;
  estatus_caducidad?: string;
  unidad_medida?: string;
}

export interface Movimiento {
  id_movimiento: number;
  id_producto: number;
  nombre_producto?: string;
  clave_interna?: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_anterior?: number;
  stock_nuevo?: number;
  motivo?: string;
  observaciones?: string;
  fecha_movimiento: string;
  usuario?: string;
}

export interface AjusteExistenciaPayload {
  stock_nuevo: number;
  motivo: string;
}
