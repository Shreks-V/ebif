import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class BeneficiariosApiService {
  private readonly base = `${environment.apiUrl}/beneficiarios`;

  constructor(private http: HttpClient) {}

  getBeneficiarios(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(this.base, { params: buildParams(filters) });
  }

  getBeneficiario(folio: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${folio}`);
  }

  createBeneficiario(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  updateBeneficiario(folio: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/${folio}`, data);
  }

  deleteBeneficiario(folio: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${folio}`);
  }

  getBeneficiarioHistorial(folio: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${folio}/historial`);
  }

  getBeneficiariosStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`);
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats/dashboard`);
  }

  getMapaBeneficiarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/mapa`);
  }

  getTiposEspina(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tipos-espina`);
  }

  getMembresiasProximasAVencer(dias: number = 30): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/membresias/proximas-a-vencer?dias=${dias}`);
  }

  renovarMembresia(folio: string, data: { monto_total: number; exento_pago: string; metodos_pago: { id_metodo_pago: number; monto: number }[] }): Observable<any> {
    return this.http.post<any>(`${this.base}/${folio}/renovar-membresia`, data);
  }

  getNotificaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/notificaciones`);
  }
}
