import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import {
  Beneficiario, BeneficiariosStats, TipoEspina,
  MapaBeneficiario, HistorialData, NotificacionSistema, RenovarMembresiaPayload,
} from '../shared/models/beneficiario.models';

export interface BeneficiariosFilter {
  nombre?: string;
  estado?: string;
  genero?: string;
  busqueda?: string;
  membresia_estatus?: string;
  tipo_cuota?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class BeneficiariosApiService {
  private readonly base = `${environment.apiUrl}/beneficiarios`;

  constructor(private http: HttpClient) {}

  getBeneficiarios(filters?: BeneficiariosFilter): Observable<Beneficiario[]> {
    return this.http.get<Beneficiario[]>(this.base, { params: buildParams(filters) });
  }

  getBeneficiario(folio: string): Observable<Beneficiario> {
    return this.http.get<Beneficiario>(`${this.base}/${folio}`);
  }

  createBeneficiario(data: Partial<Beneficiario>): Observable<Beneficiario> {
    return this.http.post<Beneficiario>(this.base, data);
  }

  updateBeneficiario(folio: string, data: Partial<Beneficiario>): Observable<Beneficiario> {
    return this.http.put<Beneficiario>(`${this.base}/${folio}`, data);
  }

  deleteBeneficiario(folio: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${folio}`);
  }

  getBeneficiarioHistorial(folio: string): Observable<HistorialData> {
    return this.http.get<HistorialData>(`${this.base}/${folio}/historial`);
  }

  getBeneficiariosStats(): Observable<BeneficiariosStats> {
    return this.http.get<BeneficiariosStats>(`${this.base}/stats`);
  }

  getDashboardStats(): Observable<BeneficiariosStats> {
    return this.http.get<BeneficiariosStats>(`${this.base}/stats/dashboard`);
  }

  getMapaBeneficiarios(): Observable<MapaBeneficiario[]> {
    return this.http.get<MapaBeneficiario[]>(`${this.base}/mapa`);
  }

  getTiposEspina(): Observable<TipoEspina[]> {
    return this.http.get<TipoEspina[]>(`${this.base}/tipos-espina`);
  }

  getMembresiasProximasAVencer(dias: number = 30): Observable<Beneficiario[]> {
    return this.http.get<Beneficiario[]>(`${this.base}/membresias/proximas-a-vencer?dias=${dias}`);
  }

  renovarMembresia(folio: string, data: RenovarMembresiaPayload): Observable<{ folio_venta?: string }> {
    return this.http.post<{ folio_venta?: string }>(`${this.base}/${folio}/renovar-membresia`, data);
  }

  getNotificaciones(): Observable<NotificacionSistema[]> {
    return this.http.get<NotificacionSistema[]>(`${environment.apiUrl}/notificaciones`);
  }
}
