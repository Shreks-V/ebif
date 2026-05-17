import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';

@Injectable({ providedIn: 'root' })
export class CitasApiService {
  private readonly citasBase = `${environment.apiUrl}/citas`;
  private readonly doctoresBase = `${environment.apiUrl}/doctores`;

  constructor(private http: HttpClient) {}

  // ── Citas ──

  getCitas(filters?: Record<string, any>): Observable<any[]> {
    return this.http.get<any[]>(this.citasBase, { params: buildParams(filters) });
  }

  getCita(id: number): Observable<any> {
    return this.http.get<any>(`${this.citasBase}/${id}`);
  }

  createCita(data: any): Observable<any> {
    return this.http.post<any>(this.citasBase, data);
  }

  updateCita(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.citasBase}/${id}`, data);
  }

  iniciarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.citasBase}/${id}/iniciar`, {});
  }

  completarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.citasBase}/${id}/completar`, {});
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.put<any>(`${this.citasBase}/${id}/cancelar`, {});
  }

  deleteCita(id: number): Observable<any> {
    return this.http.delete<any>(`${this.citasBase}/${id}`);
  }

  getCitasStats(): Observable<any> {
    return this.http.get<any>(`${this.citasBase}/stats`);
  }

  getCitasHoy(): Observable<any> {
    return this.http.get<any>(`${this.citasBase}/hoy`);
  }

  // ── Doctores ──

  getDoctores(): Observable<any[]> {
    return this.http.get<any[]>(this.doctoresBase);
  }

  getDoctorHoy(): Observable<any> {
    return this.http.get<any>(`${this.doctoresBase}/hoy`);
  }

  getDoctor(id: number): Observable<any> {
    return this.http.get<any>(`${this.doctoresBase}/${id}`);
  }

  createDoctor(data: any): Observable<any> {
    return this.http.post<any>(this.doctoresBase, data);
  }

  updateDoctor(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.doctoresBase}/${id}`, data);
  }

  deleteDoctor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.doctoresBase}/${id}`);
  }

  getDoctorDisponibilidad(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.doctoresBase}/${id}/disponibilidad`);
  }

  getDisponibilidadSemana(): Observable<any[]> {
    return this.http.get<any[]>(`${this.doctoresBase}/disponibilidad/semana`);
  }

  createDoctorDisponibilidad(idDoctor: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.doctoresBase}/${idDoctor}/disponibilidad`, data);
  }

  deleteDoctorDisponibilidad(idDoctor: number, idDisponibilidad: number): Observable<any> {
    return this.http.delete<any>(`${this.doctoresBase}/${idDoctor}/disponibilidad/${idDisponibilidad}`);
  }

  getDoctorServicios(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.doctoresBase}/${id}/servicios`);
  }

  getDoctorDisponibilidadEspecial(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.doctoresBase}/${id}/disponibilidad-especial`);
  }

  createDoctorDisponibilidadEspecial(idDoctor: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.doctoresBase}/${idDoctor}/disponibilidad-especial`, data);
  }

  deleteDoctorDisponibilidadEspecial(idDoctor: number, idDispEspecial: number): Observable<any> {
    return this.http.delete<any>(`${this.doctoresBase}/${idDoctor}/disponibilidad-especial/${idDispEspecial}`);
  }
}
