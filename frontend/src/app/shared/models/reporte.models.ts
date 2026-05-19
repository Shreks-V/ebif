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
  pacientes_atendidos: number;
  total_servicios: number;
  monto_servicios: number;
  total_ventas: number;
  monto_ventas: number;
  citas_por_estatus?: Record<string, number>;
  por_genero?: Record<string, number>;
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
