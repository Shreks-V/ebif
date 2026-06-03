export interface ReporteChartData {
  labels: string[];
  values: number[];
  total?: number;
  montos?: number[];
  estados?: string[];
  total_exentos?: number;
  total_cuotas?: number;
  detalle?: unknown[];
}

export interface ResumenReporte {
  total_pacientes: number;
  activos: number;
  inactivos: number;
  edad_promedio: number;
  estados_representados: number;
  por_genero?: Record<string, number>;
  por_tipo_espina?: Record<string, number>;
}

export interface ConsolidadoMensual {
  mes: number;
  anio: number;
  /** Pacientes únicos con al menos 1 cobro en el mes */
  pacientes_atendidos: number;
  /** Número de tickets/cobros generados (1 ticket = 1 visita) */
  total_ventas: number;
  /** Suma de cantidades en líneas de cobro (una visita puede tener múltiples ítems) */
  total_items_entregados?: number;
  monto_ventas: number;
  /** Servicios registrados en citas (legacy) */
  total_servicios: number;
  monto_servicios: number;
  citas_por_estatus?: Record<string, number>;
  por_genero?: Record<string, number>;
}

export interface AsistenciaMensualDato {
  mes: string;            // 'YYYY-MM'
  pacientes_unicos: number;
  visitas: number;
  items_entregados: number;
  monto_total: number;
}

export interface AsistenciaMensualHistorico {
  datos: AsistenciaMensualDato[];
  promedio_pacientes_unicos: number;
  promedio_visitas: number;
  meses_incluidos: number;
}

export interface HistorialReporte {
  id_reporte?: number;
  tipo: string;
  fecha_generacion: string;
  generado_por?: string;
  filtros?: Record<string, unknown>;
}

export interface EtapaRow {
  etapa: string;
  total: number;
  [key: string]: number | string;
}

export interface IndicadoresDesempeno {
  beneficiarios_activos: number;
  nuevos_en_periodo: number;
  hombres: number;
  mujeres: number;
  municipios: { label: string; value: number }[];
  tablas: {
    por_curp: EtapaRow[];
    curp_nl_genero: EtapaRow[];
    curp_foraneo_genero: EtapaRow[];
    residencia: EtapaRow[];
    nacimiento: EtapaRow[];
    etapa_vida_genero: EtapaRow[];
  };
}
