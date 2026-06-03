import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import {
  ReporteChartData, ResumenReporte, ConsolidadoMensual, HistorialReporte, IndicadoresDesempeno,
  AsistenciaMensualHistorico,
} from '../shared/models/reporte.models';

export interface ReporteFilter {
  fecha_inicio?: string;
  fecha_fin?: string;
  genero?: string;
  estado?: string;
  tipo_espina?: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesApiService {
  private readonly base = `${environment.apiUrl}/reportes`;

  constructor(private readonly http: HttpClient) {}

  getReportePorGenero(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/por-genero`, { params: buildParams(filters) });
  }

  getReportePorEtapaVida(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/por-etapa-vida`, { params: buildParams(filters) });
  }

  getReportePorTipoEspina(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/por-tipo-espina`, { params: buildParams(filters) });
  }

  getReportePorEstado(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/por-estado`, { params: buildParams(filters) });
  }

  getReporteResumen(filters?: ReporteFilter): Observable<ResumenReporte> {
    return this.http.get<ResumenReporte>(`${this.base}/resumen`, { params: buildParams(filters) });
  }

  getReporteServiciosPorTipo(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/servicios-por-tipo`, { params: buildParams(filters) });
  }

  getReporteEstudiosPorTipo(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/estudios-por-tipo`, { params: buildParams(filters) });
  }

  getReportePagosExentos(filters?: ReporteFilter): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/pagos-exentos`, { params: buildParams(filters) });
  }

  getReportePagosPorMetodo(fechaInicio?: string, fechaFin?: string): Observable<ReporteChartData> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get<ReporteChartData>(`${this.base}/pagos-por-metodo`, { params });
  }

  getReporteConsolidadoMensual(mes?: number, anio?: number): Observable<ConsolidadoMensual> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes.toString());
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<ConsolidadoMensual>(`${this.base}/consolidado-mensual`, { params });
  }

  getHistorialReportes(filters?: Record<string, string>): Observable<HistorialReporte[]> {
    return this.http.get<HistorialReporte[]>(`${this.base}/historial`, { params: buildParams(filters) });
  }

  getReportePorCiudad(): Observable<ReporteChartData> {
    return this.http.get<ReporteChartData>(`${this.base}/por-ciudad`);
  }

  getIndicadoresDesempeno(filters?: ReporteFilter): Observable<IndicadoresDesempeno> {
    return this.http.get<IndicadoresDesempeno>(`${this.base}/indicadores-desempeno`, { params: buildParams(filters) });
  }

  getAsistenciaMensualHistorico(meses = 12): Observable<AsistenciaMensualHistorico> {
    return this.http.get<AsistenciaMensualHistorico>(`${this.base}/asistencia-mensual`, {
      params: new HttpParams().set('meses', meses.toString()),
    });
  }
}
