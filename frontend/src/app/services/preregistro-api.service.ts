import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PreregistroApiService {
  private readonly base = `${environment.apiUrl}/preregistro`;

  constructor(private http: HttpClient) {}

  getPreRegistros(): Observable<any[]> {
    return this.http.get<any[]>(this.base);
  }

  getPreRegistro(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  createPreRegistro(data: any): Observable<any> {
    return this.http.post<any>(this.base, data);
  }

  updatePreRegistro(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, data);
  }

  aprobarPreRegistro(id: number, tipoCuota?: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/aprobar`, { tipo_cuota: tipoCuota || null });
  }

  rechazarPreRegistro(id: number): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/rechazar`, {});
  }

  getTiposEspinaPublic(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tipos-espina`);
  }

  getTiposDocumentoPublic(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tipos-documento`);
  }

  checkCurpDisponible(curp: string): Observable<{ disponible: boolean }> {
    return this.http.get<{ disponible: boolean }>(`${this.base}/check-curp`, {
      params: new HttpParams().set('curp', curp),
    });
  }

  uploadDocumento(idPaciente: number, idTipoDocumento: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('id_tipo_documento', idTipoDocumento.toString());
    formData.append('archivo', file);
    return this.http.post<any>(`${this.base}/${idPaciente}/documentos`, formData);
  }

  getDocumentos(idPaciente: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${idPaciente}/documentos`);
  }

  getDocumentoArchivoUrl(idPaciente: number, idDocumento: number): string {
    return `${this.base}/${idPaciente}/documentos/${idDocumento}/archivo`;
  }

  getDocumentoBlob(idPaciente: number, idDocumento: number): Observable<Blob> {
    return this.http.get(`${this.base}/${idPaciente}/documentos/${idDocumento}/archivo`, {
      responseType: 'blob',
    });
  }

  deleteDocumento(idPaciente: number, idDocumento: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${idPaciente}/documentos/${idDocumento}`);
  }
}
