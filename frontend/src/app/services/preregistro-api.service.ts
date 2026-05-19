import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PreRegistro, TipoDocumento, Documento, CurpCheckResponse } from '../shared/models/preregistro.models';
import { TipoEspina } from '../shared/models/beneficiario.models';

@Injectable({ providedIn: 'root' })
export class PreregistroApiService {
  private readonly base = `${environment.apiUrl}/preregistro`;

  constructor(private http: HttpClient) {}

  getPreRegistros(): Observable<PreRegistro[]> {
    return this.http.get<PreRegistro[]>(this.base);
  }

  getPreRegistro(id: number): Observable<PreRegistro> {
    return this.http.get<PreRegistro>(`${this.base}/${id}`);
  }

  createPreRegistro(data: Partial<PreRegistro>): Observable<PreRegistro> {
    return this.http.post<PreRegistro>(this.base, data);
  }

  updatePreRegistro(id: number, data: Partial<PreRegistro>): Observable<PreRegistro> {
    return this.http.put<PreRegistro>(`${this.base}/${id}`, data);
  }

  aprobarPreRegistro(id: number, tipoCuota?: string): Observable<PreRegistro> {
    return this.http.post<PreRegistro>(`${this.base}/${id}/aprobar`, { tipo_cuota: tipoCuota || null });
  }

  rechazarPreRegistro(id: number): Observable<PreRegistro> {
    return this.http.post<PreRegistro>(`${this.base}/${id}/rechazar`, {});
  }

  getTiposEspinaPublic(): Observable<TipoEspina[]> {
    return this.http.get<TipoEspina[]>(`${this.base}/tipos-espina`);
  }

  getTiposDocumentoPublic(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${this.base}/tipos-documento`);
  }

  checkCurpDisponible(curp: string): Observable<CurpCheckResponse> {
    return this.http.get<CurpCheckResponse>(`${this.base}/check-curp`, {
      params: new HttpParams().set('curp', curp),
    });
  }

  uploadDocumento(idPaciente: number, idTipoDocumento: number, file: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('id_tipo_documento', idTipoDocumento.toString());
    formData.append('archivo', file);
    return this.http.post<Documento>(`${this.base}/${idPaciente}/documentos`, formData);
  }

  getDocumentos(idPaciente: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.base}/${idPaciente}/documentos`);
  }

  getDocumentoArchivoUrl(idPaciente: number, idDocumento: number): string {
    return `${this.base}/${idPaciente}/documentos/${idDocumento}/archivo`;
  }

  getDocumentoBlob(idPaciente: number, idDocumento: number): Observable<Blob> {
    return this.http.get(`${this.base}/${idPaciente}/documentos/${idDocumento}/archivo`, {
      responseType: 'blob',
    });
  }

  deleteDocumento(idPaciente: number, idDocumento: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${idPaciente}/documentos/${idDocumento}`);
  }
}
