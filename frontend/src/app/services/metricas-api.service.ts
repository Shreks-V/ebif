import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MetricasDashboard {
  total_beneficiarios: number;
  distribucion_edades: {
    total_con_fecha: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    min: number | null;
    max: number | null;
    promedio: number | null;
    desviacion_std: number | null;
  };
  concentracion_geografica: { municipio: string; total: number; pct: number }[];
  top_estados: { estado: string; total: number; pct: number }[];
  tendencia_semanal: { etiqueta: string; inicio: string; fin: string; nuevos: number }[];
  tendencia_mensual: { mes: string; inicio: string; fin: string; nuevos: number }[];
  membresias: {
    activas: number;
    vencidas: number;
    sin_membresia: number;
    tasa_retencion_pct: number;
  };
  distribucion_genero: { label: string; total: number; pct: number }[];
  uso_valvula: { con_valvula: number; sin_valvula: number; pct_con_valvula: number };
  distribucion_cuotas: { tipo_cuota: string; total: number; pct: number }[];
  tipos_espina_prevalencia: { nombre: string; total: number; pct: number }[];
}

@Injectable({ providedIn: 'root' })
export class MetricasApiService {
  private readonly url = `${environment.apiUrl}/dashboard/metricas`;

  constructor(private readonly http: HttpClient) {}

  getMetricas(): Observable<MetricasDashboard> {
    return this.http.get<MetricasDashboard>(this.url);
  }
}
