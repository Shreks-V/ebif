import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusquedaResult {
  id_paciente: number;
  folio: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  municipio?: string;
  estado?: string;
  membresia_estatus?: string;
  curp?: string;
  _score: number;
  _tipo: string;
}

@Injectable({ providedIn: 'root' })
export class BusquedaApiService {
  private readonly url = `${environment.apiUrl}/buscar`;

  constructor(private readonly http: HttpClient) {}

  buscar(q: string, limit = 12): Observable<BusquedaResult[]> {
    return this.http.get<BusquedaResult[]>(this.url, {
      params: { q, limit: String(limit) },
    });
  }
}
