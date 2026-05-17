import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class ReportesApiService {
  private readonly base = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  getReportePorGenero(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/por-genero`, { params: buildParams(filters) });
  }

  getReportePorEtapaVida(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/por-etapa-vida`, { params: buildParams(filters) });
  }

  getReportePorTipoEspina(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/por-tipo-espina`, { params: buildParams(filters) });
  }

  getReportePorEstado(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/por-estado`, { params: buildParams(filters) });
  }

  getReporteResumen(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/resumen`, { params: buildParams(filters) });
  }

  getReporteServiciosPorTipo(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/servicios-por-tipo`, { params: buildParams(filters) });
  }

  getReporteEstudiosPorTipo(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/estudios-por-tipo`, { params: buildParams(filters) });
  }

  getReportePagosExentos(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/pagos-exentos`, { params: buildParams(filters) });
  }

  getReportePagosPorMetodo(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fecha_inicio', fechaInicio);
    if (fechaFin) params = params.set('fecha_fin', fechaFin);
    return this.http.get<any>(`${this.base}/pagos-por-metodo`, { params });
  }

  getReporteConsolidadoMensual(mes?: number, anio?: number): Observable<any> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes.toString());
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<any>(`${this.base}/consolidado-mensual`, { params });
  }

  getHistorialReportes(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/historial`, { params: buildParams(filters) });
  }

  getReportePorCiudad(): Observable<any> {
    return this.http.get<any>(`${this.base}/por-ciudad`);
  }

  getIndicadoresDesempeno(filters?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${this.base}/indicadores-desempeno`, { params: buildParams(filters) });
  }
}
