import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { ApiService } from '../../../../services/api.service';
import { ReportesApiService } from '../../../../services/reportes-api.service';
import { ExportacionesWsService } from '../../../../services/exportaciones-ws.service';
import { getApiError } from '../../../../shared/utils/error.utils';
import { AsistenciaMensualHistorico } from '../../../../shared/models/reporte.models';
import {
  CHART_COLORS, NAVY,
  donutOpt, hbarOpt, vbarOpt,
  buildAsistenciaChartOpt, formatMesLabel,
} from './reportes-tab.utils';

interface CrossTabRow {
  etapa: string;
  total?: number;
  [key: string]: string | number | undefined;
}

interface CrossTab {
  titulo: string;
  cols: string[];
  rows: CrossTabRow[];
}


@Component({
  selector: 'app-reportes-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  templateUrl: './reportes-tab.component.html',
})
export class ReportesTabComponent implements OnInit {
  // ─── Section 1: Resumen de Periodo ───
  sec1FechaInicio = '';
  sec1FechaFin = '';
  sec1Loading = false;
  sec1Error = '';
  sec1Loaded = false;
  sec1Credenciales = 0;
  sec1TotalServicios = 0;
  sec1Exentos = 0;
  sec1Cuotas = 0;
  sec1Hombres = 0;
  sec1Mujeres = 0;
  sec1Nl = 0;
  sec1Foraneos = 0;
  sec1Lactantes = 0;
  sec1Ninos = 0;
  sec1Adolescentes = 0;
  sec1Adultos = 0;
  sec1ServiciosList: { nombre: string; cantidad: number }[] = [];
  sec1CiudadesList: { nombre: string; estado: string; cantidad: number }[] = [];
  sec1EstudiosList: { nombre: string; cantidad: number }[] = [];
  sec1PagosPorMetodo: { metodo: string; num_pagos: number; monto: number; porcentaje: number }[] = [];
  sec1TotalPagado = 0;

  // ECharts — Section 1
  generoOpt: EChartsOption = {};
  etapaOpt: EChartsOption = {};
  metodoPagoOpt: EChartsOption = {};
  serviciosOpt: EChartsOption = {};
  ingresosPorMetodoOpt: EChartsOption = {};

  // ─── Section 2: Indicadores de Desempeño ───
  indicPeriodo = '3m';
  indicFechaInicio = '';
  indicFechaFin = '';
  indicLoading = false;
  indicError = '';
  indicLoaded = false;
  indicActivos = 0;
  indicNuevos = 0;
  indicHombres = 0;
  indicMujeres = 0;
  indicMunicipios: { label: string; value: number }[] = [];
  indicTables: CrossTab[] = [];

  // ECharts — Section 2
  indicKpiOpt: EChartsOption = {};
  indicMunicipiosOpt: EChartsOption = {};

  readonly indicPeriodos = [
    { id: '3m', label: '3 meses' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
  ];

  // ─── Section 3: Segmentación demográfica ───
  seg3FechaInicio = '';
  seg3FechaFin = '';
  seg3Loading = false;
  seg3Error = '';
  seg3Loaded = false;
  seg3Genero: { label: string; value: number }[] = [];
  seg3EtapaVida: { label: string; value: number }[] = [];
  seg3TipoEspina: { label: string; value: number }[] = [];
  seg3Estado: { label: string; value: number }[] = [];

  // ECharts — Section 3
  seg3GeneroOpt: EChartsOption = {};
  seg3EtapaOpt: EChartsOption = {};
  seg3EspinaOpt: EChartsOption = {};
  seg3EstadoOpt: EChartsOption = {};

  // ── WS export progress ──────────────────────────────────────
  wsExportando = false;
  wsStep = 0;
  wsTotal = 5;
  wsMessage = '';

  // ── Asistencia mensual histórica ─────────────────────────────
  asistenciaLoading = false;
  asistenciaError = '';
  asistencia: AsistenciaMensualHistorico | null = null;
  asistenciaMeses = 12;
  asistenciaChartOpt: EChartsOption = {};

  constructor(
    private readonly api: ApiService,
    private readonly reportesApi: ReportesApiService,
    private readonly exportWs: ExportacionesWsService,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.sec1FechaInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.sec1FechaFin = lastDay.toISOString().slice(0, 10);
    this.setIndicPeriod('3m');
    this.cargarAsistenciaMensual();
  }

  cargarAsistenciaMensual(): void {
    this.asistenciaLoading = true;
    this.asistenciaError = '';
    this.reportesApi.getAsistenciaMensualHistorico(this.asistenciaMeses).subscribe({
      next: (data) => {
        this.asistencia = data;
        this.asistenciaLoading = false;
        this._buildAsistenciaChart(data);
      },
      error: (err) => {
        this.asistenciaError = getApiError(err, 'Error al cargar asistencia mensual');
        this.asistenciaLoading = false;
      },
    });
  }

  private _buildAsistenciaChart(data: AsistenciaMensualHistorico): void {
    this.asistenciaChartOpt = buildAsistenciaChartOpt(data);
  }

  formatMes(mesStr: string): string {
    return formatMesLabel(mesStr);
  }

  setIndicPeriod(period: string): void {
    this.indicPeriodo = period;
    const today = new Date();
    const inicio = new Date(today);
    if (period === '3m') inicio.setMonth(today.getMonth() - 3);
    else if (period === '6m') inicio.setMonth(today.getMonth() - 6);
    else if (period === '1y') inicio.setFullYear(today.getFullYear() - 1);
    this.indicFechaInicio = inicio.toISOString().slice(0, 10);
    this.indicFechaFin = today.toISOString().slice(0, 10);
  }

  cargarResumenPeriodo(): void {
    this.sec1Loading = true;
    this.sec1Error = '';
    this.sec1Loaded = false;
    forkJoin({
      servicios: this.api.getReporteServiciosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      pagos: this.api.getReportePagosExentos({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      estudios: this.api.getReporteEstudiosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      stats: this.api.getDashboardStats(),
      ciudades: this.api.getReportePorCiudad(),
      pagosPorMetodo: this.api.getReportePagosPorMetodo(this.sec1FechaInicio || undefined, this.sec1FechaFin || undefined),
    }).subscribe({
      next: ({ servicios, pagos, estudios, stats, ciudades, pagosPorMetodo }) => {
        this.sec1Credenciales = stats.activos ?? 0;
        this.sec1TotalServicios = servicios.total ?? 0;
        this.sec1Exentos = pagos.total_exentos ?? 0;
        this.sec1Cuotas = pagos.total_cuotas ?? 0;

        const pg: Record<string, number> = stats.por_genero ?? {};
        const pp: Record<string, number> = stats.por_procedencia ?? {};
        const pe: Record<string, number> = stats.por_etapa_vida ?? {};
        const getVal = (source: Record<string, number>, ...keys: string[]) =>
          keys.reduce<number | null>((found, key) => found ?? source[key] ?? null, null) ?? 0;
        this.sec1Hombres = pg['Hombre'] ?? pg['Masculino'] ?? pg['H'] ?? 0;
        this.sec1Mujeres = pg['Mujer'] ?? pg['Femenino'] ?? pg['M'] ?? 0;
        this.sec1Nl = getVal(pp, 'Nuevo León', 'N.L.', 'NL');
        this.sec1Foraneos = getVal(pp, 'Foráneos', 'Foraneos', 'Viven en otros estados');
        this.sec1Lactantes = getVal(pe, 'Primera Infancia (0-5)', 'Primera Infancia');
        this.sec1Ninos = getVal(pe, 'Infancia (6-11)', 'Infancia');
        this.sec1Adolescentes = getVal(pe, 'Adolescencia (12-17)', 'Adolescencia');
        this.sec1Adultos =
          getVal(pe, 'Juventud (18-29)', 'Juventud') +
          getVal(pe, 'Adultez (30-59)', 'Adultez') +
          getVal(pe, 'Adulto Mayor (60+)', 'Adulto Mayor');

        const sLabels: string[] = servicios.labels ?? [];
        const sValues: number[] = servicios.values ?? [];
        this.sec1ServiciosList = sLabels.map((nombre, i) => ({ nombre, cantidad: sValues[i] ?? 0 }));

        const cLabels: string[] = ciudades.labels ?? [];
        const cEstados: string[] = ciudades.estados ?? [];
        const cValues: number[] = ciudades.values ?? [];
        this.sec1CiudadesList = cLabels.map((nombre, i) => ({ nombre, estado: cEstados[i] ?? '', cantidad: cValues[i] ?? 0 }));

        const eLabels: string[] = estudios.labels ?? [];
        const eValues: number[] = estudios.values ?? [];
        this.sec1EstudiosList = eLabels.map((nombre, i) => ({ nombre, cantidad: eValues[i] ?? 0 }));

        this.sec1PagosPorMetodo = (pagosPorMetodo.detalle ?? []) as typeof this.sec1PagosPorMetodo;
        this.sec1TotalPagado = pagosPorMetodo.total ?? 0;

        // ── Build ECharts options ──
        this.generoOpt = donutOpt(
          ['Hombres', 'Mujeres'],
          [this.sec1Hombres, this.sec1Mujeres],
          ['#3b82f6', '#ec4899'],
        );

        this.etapaOpt = vbarOpt(
          ['0-5', '6-11', '12-17', '18+'],
          [this.sec1Lactantes, this.sec1Ninos, this.sec1Adolescentes, this.sec1Adultos],
          ['#fbbf24', '#06b6d4', '#818cf8', '#f87171'],
        );

        this.metodoPagoOpt = donutOpt(
          this.sec1PagosPorMetodo.map(m => m.metodo),
          this.sec1PagosPorMetodo.map(m => m.num_pagos),
          CHART_COLORS,
        );

        this.ingresosPorMetodoOpt = donutOpt(
          this.sec1PagosPorMetodo.map(m => m.metodo),
          this.sec1PagosPorMetodo.map(m => m.monto),
          CHART_COLORS,
        );

        this.serviciosOpt = hbarOpt(
          [...this.sec1ServiciosList].reverse().map(s => s.nombre),
          [...this.sec1ServiciosList].reverse().map(s => s.cantidad),
          NAVY,
        );

        this.sec1Loaded = true;
        this.sec1Loading = false;
      },
      error: (err: unknown) => {
        this.sec1Error = getApiError(err, 'Error al cargar los datos del resumen.');
        this.sec1Loading = false;
      },
    });
  }

  exportarPDFResumen(): void {
    this.wsExportando = true;
    this.wsStep = 0;
    this.wsMessage = 'Iniciando…';

    this.exportWs.exportarReportePdf({
      tipo: 'resumen',
      fecha_inicio: this.sec1FechaInicio || undefined,
      fecha_fin: this.sec1FechaFin || undefined,
    }).subscribe({
      next: (frame) => {
        this.wsStep = frame.step;
        this.wsTotal = frame.total;
        this.wsMessage = frame.message;

        if (frame.error) {
          this.wsExportando = false;
          alert('Error al generar PDF: ' + frame.error);
          return;
        }
        if (frame.data && frame.filename) {
          this.wsExportando = false;
          this._descargarBase64(frame.data, frame.filename, frame.media_type ?? 'application/pdf');
        }
      },
      error: () => {
        this.wsExportando = false;
        alert('Error de conexión al generar PDF');
      },
    });
  }

  private _descargarBase64(b64: string, filename: string, mediaType: string): void {
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.codePointAt(i) ?? 0;
    const blob = new Blob([ab], { type: mediaType });
    this._descargar(blob, filename);
  }

  exportarExcelResumen(): void {
    this.api.exportarReporteExcel('all', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
      .subscribe({
        next: (blob) => this._descargar(blob, `reportes_${this.sec1FechaInicio}_${this.sec1FechaFin}.xlsx`),
        error: () => alert('Error al generar Excel'),
      });
  }

  cargarIndicadores(): void {
    this.indicLoading = true;
    this.indicError = '';
    this.indicLoaded = false;
    this.api.getIndicadoresDesempeno({ fecha_inicio: this.indicFechaInicio, fecha_fin: this.indicFechaFin }).subscribe({
      next: (data) => {
        this.indicActivos = data.beneficiarios_activos ?? 0;
        this.indicNuevos = data.nuevos_en_periodo ?? 0;
        this.indicHombres = data.hombres ?? 0;
        this.indicMujeres = data.mujeres ?? 0;
        this.indicMunicipios = data.municipios ?? [];

        const tablas = data.tablas ?? {} as typeof data.tablas;
        this.indicTables = [
          { titulo: 'Sujetos de derecho por CURP', cols: ['CURP N.L.', 'CURP Foráneo'], rows: (tablas.por_curp ?? []) as CrossTabRow[] },
          { titulo: 'Sujetos de derecho por CURP N.L.', cols: ['Hombre', 'Mujer'], rows: (tablas.curp_nl_genero ?? []) as CrossTabRow[] },
          { titulo: 'Sujetos de derecho foráneos', cols: ['Hombre', 'Mujer'], rows: (tablas.curp_foraneo_genero ?? []) as CrossTabRow[] },
          { titulo: 'Sujetos de derecho por lugar de residencia', cols: ['Viven en N.L.', 'Viven en otros estados'], rows: (tablas.residencia ?? []) as CrossTabRow[] },
          { titulo: 'Sujetos de derecho por nacimiento', cols: ['Mexicanos', 'Nac. extranjera'], rows: (tablas.nacimiento ?? []) as CrossTabRow[] },
          { titulo: 'Sujetos de derecho por etapa de vida', cols: ['Hombre', 'Mujer'], rows: (tablas.etapa_vida_genero ?? []) as CrossTabRow[] },
        ];

        // ── ECharts indicadores ──
        this.indicKpiOpt = {
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: '3%', right: '4%', bottom: '3%', top: '18%', containLabel: true },
          xAxis: {
            type: 'category',
            data: ['Activos', 'Nuevos', 'Hombres', 'Mujeres'],
            axisLabel: { fontSize: 11 },
            axisTick: { alignWithLabel: true },
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed' as const, color: '#e2e8f0' } },
          },
          series: [{
            type: 'bar',
            barMaxWidth: 60,
            label: { show: true, position: 'top' as const, fontSize: 13, fontWeight: 'bold', color: '#334155' },
            data: [
              { value: this.indicActivos,  itemStyle: { color: NAVY,      borderRadius: [6,6,0,0] } },
              { value: this.indicNuevos,   itemStyle: { color: '#10b981', borderRadius: [6,6,0,0] } },
              { value: this.indicHombres,  itemStyle: { color: '#3b82f6', borderRadius: [6,6,0,0] } },
              { value: this.indicMujeres,  itemStyle: { color: '#ec4899', borderRadius: [6,6,0,0] } },
            ],
            markArea: {
              silent: true,
              data: [
                [
                  {
                    name: 'Padrón general',
                    xAxis: 'Activos',
                    label: { position: 'insideTop' as const, fontSize: 10, color: '#475569', fontWeight: 'bold', distance: 6 },
                    itemStyle: { color: 'rgba(0,50,139,0.04)', borderColor: 'rgba(0,50,139,0.18)', borderWidth: 1, borderType: 'dashed' as const },
                  },
                  { xAxis: 'Nuevos' },
                ],
                [
                  {
                    name: 'Distribución por género',
                    xAxis: 'Hombres',
                    label: { position: 'insideTop' as const, fontSize: 10, color: '#475569', fontWeight: 'bold', distance: 6 },
                    itemStyle: { color: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)', borderWidth: 1, borderType: 'dashed' as const },
                  },
                  { xAxis: 'Mujeres' },
                ],
              ],
            },
          }],
        };

        if (this.indicMunicipios.length > 0) {
          const topMunis = [...this.indicMunicipios].slice(0, 12);
          this.indicMunicipiosOpt = hbarOpt(
            topMunis.map(m => m.label),
            topMunis.map(m => m.value),
            '#0ea5e9',
          );
        }

        this.indicLoaded = true;
        this.indicLoading = false;
      },
      error: (err: unknown) => {
        this.indicError = getApiError(err, 'Error al cargar los indicadores.');
        this.indicLoading = false;
      },
    });
  }

  exportarPDFIndicadores(): void {
    this.api.exportarReportePdf('indicadores', { fecha_inicio: this.indicFechaInicio, fecha_fin: this.indicFechaFin }).subscribe({
      next: (blob) => this._descargar(blob, `indicadores_${this.indicFechaInicio}_${this.indicFechaFin}.pdf`),
      error: () => alert('Error al generar PDF de indicadores'),
    });
  }

  cargarSegmentacion(): void {
    this.seg3Loading = true;
    this.seg3Error = '';
    this.seg3Loaded = false;
    const filters = { fecha_inicio: this.seg3FechaInicio || undefined, fecha_fin: this.seg3FechaFin || undefined };
    forkJoin({
      genero: this.api.getReportePorGenero(filters),
      etapa: this.api.getReportePorEtapaVida(filters),
      espina: this.api.getReportePorTipoEspina(filters),
      estado: this.api.getReportePorEstado(filters),
    }).subscribe({
      next: ({ genero, etapa, espina, estado }) => {
        this.seg3Genero    = (genero.labels as string[]).map((l, i) => ({ label: l, value: (genero.values as number[])[i] ?? 0 }));
        this.seg3EtapaVida = (etapa.labels as string[]).map((l, i) => ({ label: l, value: (etapa.values as number[])[i] ?? 0 }));
        this.seg3TipoEspina = (espina.labels as string[]).map((l, i) => ({ label: l, value: (espina.values as number[])[i] ?? 0 }));
        this.seg3Estado    = (estado.labels as string[]).map((l, i) => ({ label: l, value: (estado.values as number[])[i] ?? 0 }));

        // ── ECharts segmentación ──
        this.seg3GeneroOpt = donutOpt(
          this.seg3Genero.map(r => r.label),
          this.seg3Genero.map(r => r.value),
          ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'],
        );
        this.seg3EspinaOpt = donutOpt(
          this.seg3TipoEspina.map(r => r.label),
          this.seg3TipoEspina.map(r => r.value),
          ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
        );
        this.seg3EtapaOpt = hbarOpt(
          this.seg3EtapaVida.map(r => r.label),
          this.seg3EtapaVida.map(r => r.value),
          '#f59e0b',
        );
        this.seg3EstadoOpt = hbarOpt(
          this.seg3Estado.map(r => r.label),
          this.seg3Estado.map(r => r.value),
          '#0ea5e9',
        );

        this.seg3Loaded = true;
        this.seg3Loading = false;
      },
      error: (err: unknown) => {
        this.seg3Error = getApiError(err, 'Error al cargar la segmentación.');
        this.seg3Loading = false;
      },
    });
  }

  seg3Total(rows: { label: string; value: number }[]): number {
    return rows.reduce((acc, r) => acc + r.value, 0);
  }

  private _descargar(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 150);
  }
}
