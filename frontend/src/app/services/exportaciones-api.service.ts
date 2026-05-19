import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class ExportacionesApiService {
  private readonly base = `${environment.apiUrl}/exportaciones`;

  constructor(private http: HttpClient) {}

  exportarReportePdf(tipo: string, filters?: Record<string, unknown>): Observable<Blob> {
    const params = buildParams({ tipo, ...filters });
    return this.http.get(`${this.base}/reportes/pdf`, { params, responseType: 'blob' });
  }

  exportarReporteExcel(tipo: string, filters?: Record<string, unknown>): Observable<Blob> {
    const params = buildParams({ tipo, ...filters });
    return this.http.get(`${this.base}/reportes/excel`, { params, responseType: 'blob' });
  }

  exportarBeneficiarioPdf(folio: string): Observable<Blob> {
    return this.http.get(`${this.base}/beneficiario/${folio}/pdf`, { responseType: 'blob' });
  }

  exportarCredencialPdf(folio: string): Observable<Blob> {
    return this.http.get(`${this.base}/beneficiario/${folio}/credencial`, { responseType: 'blob' });
  }

  exportarBeneficiariosExcel(filters?: Record<string, unknown>): Observable<Blob> {
    return this.http.get(`${this.base}/beneficiarios/excel`, { params: buildParams(filters), responseType: 'blob' });
  }

  exportarComprobanteCitaPdf(idCita: number): Observable<Blob> {
    return this.http.get(`${this.base}/cita/${idCita}/comprobante`, { responseType: 'blob' });
  }

  exportarContratoComodatoPdf(idComodato: number): Observable<Blob> {
    return this.http.get(`${this.base}/comodato/${idComodato}/contrato`, { responseType: 'blob' });
  }
}
