import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BitacoraFilter, BitacoraResponse } from '../shared/models/bitacora.models';

@Injectable({ providedIn: 'root' })
export class BitacoraApiService {
  private readonly base = `${environment.apiUrl}/bitacora`;

  constructor(private http: HttpClient) {}

  getBitacora(filters: BitacoraFilter = {}): Observable<BitacoraResponse> {
    let params = new HttpParams();
    if (filters.tabla) params = params.set('tabla', filters.tabla);
    if (filters.tipo_operacion) params = params.set('tipo_operacion', filters.tipo_operacion);
    if (filters.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
    if (filters.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
    if (filters.busqueda) params = params.set('busqueda', filters.busqueda);
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    if (filters.offset != null) params = params.set('offset', String(filters.offset));
    return this.http.get<BitacoraResponse>(this.base, { params });
  }
}
