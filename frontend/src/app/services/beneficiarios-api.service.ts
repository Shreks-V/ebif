import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import { Beneficiario, BeneficiariosStats, TipoEspina } from '../shared/models/beneficiario.models';

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

  getBeneficiarioHistorial(folio: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${folio}/historial`);
  }

  getBeneficiariosStats(): Observable<BeneficiariosStats> {
    return this.http.get<BeneficiariosStats>(`${this.base}/stats`);
  }

  getDashboardStats(): Observable<BeneficiariosStats> {
    return this.http.get<BeneficiariosStats>(`${this.base}/stats/dashboard`);
  }

  getMapaBeneficiarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/mapa`);
  }

  getTiposEspina(): Observable<TipoEspina[]> {
    return this.http.get<TipoEspina[]>(`${this.base}/tipos-espina`);
  }

  getMembresiasProximasAVencer(dias: number = 30): Observable<Beneficiario[]> {
    return this.http.get<Beneficiario[]>(`${this.base}/membresias/proximas-a-vencer?dias=${dias}`);
  }

  renovarMembresia(folio: string, data: { monto_total: number; exento_pago: string; metodos_pago: { id_metodo_pago: number; monto: number }[] }): Observable<any> {
    return this.http.post<any>(`${this.base}/${folio}/renovar-membresia`, data);
  }

  getNotificaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/notificaciones`);
  }
}
