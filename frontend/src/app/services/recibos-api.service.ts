import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class RecibosApiService {
  private readonly base = `${environment.apiUrl}/recibos`;

  constructor(private http: HttpClient) {}

  getRecibos(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(this.base, { params: buildParams(filters) });
  }

  createRecibo(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  getRecibo(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  cancelarRecibo(id: number, motivo?: string): Observable<any> {
    const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : '';
    return this.http.put<any>(`${this.base}/${id}/cancelar${qs}`, {});
  }

  getRecibosStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`);
  }

  getMetodosPago(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/metodos-pago`);
  }

  getReciboItems(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/items`);
  }

  registrarPagoParcial(idVenta: number, data: { id_metodo_pago: number; monto: number }): Observable<any> {
    return this.http.post<any>(`${this.base}/${idVenta}/pagos`, data);
  }

  exentarVenta(idVenta: number, nota?: string): Observable<any> {
    return this.http.put<any>(`${this.base}/${idVenta}/exentar`, { nota: nota || null });
  }
}
