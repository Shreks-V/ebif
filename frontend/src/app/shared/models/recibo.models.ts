export interface Recibo {
  id_venta: number;
  folio?: string;
  folio_venta?: string;
  id_paciente?: number;
  nombre_paciente?: string;
  folio_paciente?: string;
  tipo_cuota?: string;
  fecha_venta?: string;
  estatus?: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  exento_pago?: string;
  cancelada?: string;
  motivo_cancelacion?: string;
  notas?: string;
  usuario_nombre?: string;
  usuario_apellido?: string;
  metodo_pago_nombre?: string;
}

export interface ReciboItem {
  id_detalle?: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  monto_pagado?: number;
  cancelado?: string;
}

export interface MetodoPago {
  id_metodo_pago: number;
  nombre: string;
}

export interface RecibosStats {
  total_hoy?: number;
  total?: number;
  pendientes?: number;
  total_ayer?: number;
}
