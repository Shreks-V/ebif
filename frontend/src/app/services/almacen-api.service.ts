import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import {
  ProductoRaw, ServicioRaw, ComodatoRaw,
  AlmacenStats, Movimiento, AjusteExistenciaPayload,
} from '../shared/models/almacen.models';

export interface ProductosFilter {
  activo?: string;
  tipo_producto?: string;
  busqueda?: string;
  categoria?: string;
}

@Injectable({ providedIn: 'root' })
export class AlmacenApiService {
  private readonly base = `${environment.apiUrl}/almacen`;

  constructor(private http: HttpClient) {}

  getProductos(filters?: ProductosFilter): Observable<ProductoRaw[]> {
    return this.http.get<ProductoRaw[]>(`${this.base}/productos`, { params: buildParams(filters) });
  }

  createProducto(data: Partial<ProductoRaw>): Observable<ProductoRaw> {
    return this.http.post<ProductoRaw>(`${this.base}/productos`, data);
  }

  updateProducto(id: number, data: Partial<ProductoRaw>): Observable<ProductoRaw> {
    return this.http.put<ProductoRaw>(`${this.base}/productos/${id}`, data);
  }

  deleteProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/productos/${id}`);
  }

  ajustarExistencia(id: number, stockNuevo: number, motivo: string): Observable<ProductoRaw> {
    const payload: AjusteExistenciaPayload = { stock_nuevo: stockNuevo, motivo };
    return this.http.patch<ProductoRaw>(`${this.base}/productos/${id}/existencia`, payload);
  }

  getServicios(filters?: ProductosFilter): Observable<ServicioRaw[]> {
    return this.http.get<ServicioRaw[]>(`${this.base}/servicios`, { params: buildParams(filters) });
  }

  createServicio(data: Partial<ServicioRaw>): Observable<ServicioRaw> {
    return this.http.post<ServicioRaw>(`${this.base}/servicios`, data);
  }

  updateServicio(id: number, data: Partial<ServicioRaw>): Observable<ServicioRaw> {
    return this.http.put<ServicioRaw>(`${this.base}/servicios/${id}`, data);
  }

  deleteServicio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/servicios/${id}`);
  }

  getComodatos(filters?: Record<string, string | number>): Observable<ComodatoRaw[]> {
    return this.http.get<ComodatoRaw[]>(`${this.base}/comodatos`, { params: buildParams(filters) });
  }

  createComodato(data: Partial<ComodatoRaw>): Observable<ComodatoRaw> {
    return this.http.post<ComodatoRaw>(`${this.base}/comodatos`, data);
  }

  updateComodato(id: number, data: Partial<ComodatoRaw>): Observable<ComodatoRaw> {
    return this.http.put<ComodatoRaw>(`${this.base}/comodatos/${id}`, data);
  }

  getAlmacenStats(): Observable<AlmacenStats> {
    return this.http.get<AlmacenStats>(`${this.base}/stats`);
  }

  getMovimientos(filters?: Record<string, string | number>): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.base}/movimientos`, { params: buildParams(filters) });
  }
}
