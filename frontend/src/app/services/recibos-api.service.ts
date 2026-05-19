import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import { Recibo, ReciboItem, MetodoPago, RecibosStats } from '../shared/models/recibo.models';

export interface RecibosFilter {
  fecha_inicio?: string;
  fecha_fin?: string;
  id_paciente?: number;
  search?: string;
  solo_adeudos?: boolean;
  limit?: number;
  offset?: number;
}

export interface PagoPayload {
  id_metodo_pago: number;
  monto: number;
}

@Injectable({ providedIn: 'root' })
export class RecibosApiService {
  private readonly base = `${environment.apiUrl}/recibos`;

  constructor(private readonly http: HttpClient) {}

  getRecibos(filters?: RecibosFilter): Observable<Recibo[]> {
    return this.http.get<Recibo[]>(this.base, { params: buildParams(filters) });
  }

  createRecibo(data: Record<string, unknown>): Observable<Recibo> {
    return this.http.post<Recibo>(this.base, data);
  }

  getRecibo(id: number): Observable<Recibo> {
    return this.http.get<Recibo>(`${this.base}/${id}`);
  }

  cancelarRecibo(id: number, motivo?: string): Observable<Recibo> {
    const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : '';
    return this.http.put<Recibo>(`${this.base}/${id}/cancelar${qs}`, {});
  }

  getRecibosStats(): Observable<RecibosStats> {
    return this.http.get<RecibosStats>(`${this.base}/stats`);
  }

  getMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${this.base}/metodos-pago`);
  }

  getReciboItems(id: number): Observable<ReciboItem[]> {
    return this.http.get<ReciboItem[]>(`${this.base}/${id}/items`);
  }

  registrarPagoParcial(idVenta: number, data: PagoPayload): Observable<Recibo> {
    return this.http.post<Recibo>(`${this.base}/${idVenta}/pagos`, data);
  }

  exentarVenta(idVenta: number, nota?: string): Observable<Recibo> {
    return this.http.put<Recibo>(`${this.base}/${idVenta}/exentar`, { nota: nota || null });
  }
}
