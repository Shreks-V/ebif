import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OcrResult {
  tipo_documento: string | null;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  curp: string | null;
  estado_nacimiento: string | null;
  calle: string | null;
  numero_exterior: string | null;
  numero_interior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado_residencia: string | null;
  codigo_postal: string | null;
  nombre_padre: string | null;
  nombre_madre: string | null;
  confianza: 'alta' | 'media' | 'baja';
  campos_detectados: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class OcrApiService {
  private readonly url = `${environment.apiUrl}/ocr/extraer-documento`;

  constructor(private readonly http: HttpClient) {}

  extraerDocumento(file: File): Observable<OcrResult> {
    const form = new FormData();
    form.append('archivo', file);
    return this.http.post<OcrResult>(this.url, form);
  }
}
