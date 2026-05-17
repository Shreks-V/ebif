import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class AlmacenApiService {
  private readonly base = `${environment.apiUrl}/almacen`;

  constructor(private http: HttpClient) {}

  getProductos(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/productos`, { params: buildParams(filters) });
  }

  createProducto(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/productos`, data);
  }

  updateProducto(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/productos/${id}`, data);
  }

  deleteProducto(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/productos/${id}`);
  }

  ajustarExistencia(id: number, stockNuevo: number, motivo: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/productos/${id}/existencia`, { stock_nuevo: stockNuevo, motivo });
  }

  getServicios(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/servicios`, { params: buildParams(filters) });
  }

  createServicio(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/servicios`, data);
  }

  updateServicio(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/servicios/${id}`, data);
  }

  deleteServicio(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/servicios/${id}`);
  }

  getComodatos(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/comodatos`, { params: buildParams(filters) });
  }

  createComodato(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/comodatos`, data);
  }

  updateComodato(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/comodatos/${id}`, data);
  }

  getAlmacenStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`);
  }

  getMovimientos(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/movimientos`, { params: buildParams(filters) });
  }
}
