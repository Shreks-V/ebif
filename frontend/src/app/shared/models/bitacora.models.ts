export interface BitacoraItem {
  id_bitacora: number;
  tabla: string;
  tabla_afectada?: string;
  tipo_operacion: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  id_registro?: number | string;
  id_registro_afectado?: number | string;
  descripcion?: string;
  campo_modificado?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  datos_anteriores?: string;
  datos_nuevos?: string;
  observaciones?: string;
  fecha_operacion: string;
  fecha_cambio?: string;
  id_usuario?: number;
  nombre_usuario?: string;
  usuario_nombre?: string;
  apellido_usuario?: string;
  usuario_apellido?: string;
  usuario_correo?: string;
}

export interface BitacoraFilter {
  tabla?: string;
  tipo_operacion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  busqueda?: string;
  limit?: number;
  offset?: number;
}

export interface BitacoraResponse {
  items: BitacoraItem[];
  total: number;
  limit: number;
  offset: number;
}
