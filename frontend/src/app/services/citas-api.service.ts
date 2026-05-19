import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { buildParams } from './api-helpers';
import { Cita, CitasStats, CitasHoyResponse } from '../shared/models/cita.models';
import {
  Doctor, DoctorHoyResponse, Disponibilidad,
  DisponibilidadEspecial, DisponibilidadSemana, DoctorServicio,
} from '../shared/models/doctor.models';

export interface CitasFilter {
  fecha?: string;
  estatus?: string;
  id_paciente?: number;
  busqueda?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class CitasApiService {
  private readonly citasBase = `${environment.apiUrl}/citas`;
  private readonly doctoresBase = `${environment.apiUrl}/doctores`;

  constructor(private http: HttpClient) {}

  // ── Citas ──

  getCitas(filters?: CitasFilter): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.citasBase, { params: buildParams(filters) });
  }

  getCita(id: number): Observable<Cita> {
    return this.http.get<Cita>(`${this.citasBase}/${id}`);
  }

  createCita(data: Partial<Cita>): Observable<Cita> {
    return this.http.post<Cita>(this.citasBase, data);
  }

  updateCita(id: number, data: Partial<Cita>): Observable<Cita> {
    return this.http.put<Cita>(`${this.citasBase}/${id}`, data);
  }

  iniciarCita(id: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.citasBase}/${id}/iniciar`, {});
  }

  completarCita(id: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.citasBase}/${id}/completar`, {});
  }

  cancelarCita(id: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.citasBase}/${id}/cancelar`, {});
  }

  deleteCita(id: number): Observable<void> {
    return this.http.delete<void>(`${this.citasBase}/${id}`);
  }

  getCitasStats(): Observable<CitasStats> {
    return this.http.get<CitasStats>(`${this.citasBase}/stats`);
  }

  getCitasHoy(): Observable<CitasHoyResponse> {
    return this.http.get<CitasHoyResponse>(`${this.citasBase}/hoy`);
  }

  // ── Doctores ──

  getDoctores(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.doctoresBase);
  }

  getDoctorHoy(): Observable<DoctorHoyResponse> {
    return this.http.get<DoctorHoyResponse>(`${this.doctoresBase}/hoy`);
  }

  getDoctor(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.doctoresBase}/${id}`);
  }

  createDoctor(data: Partial<Doctor>): Observable<Doctor> {
    return this.http.post<Doctor>(this.doctoresBase, data);
  }

  updateDoctor(id: number, data: Partial<Doctor>): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.doctoresBase}/${id}`, data);
  }

  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.doctoresBase}/${id}`);
  }

  getDoctorDisponibilidad(id: number): Observable<Disponibilidad[]> {
    return this.http.get<Disponibilidad[]>(`${this.doctoresBase}/${id}/disponibilidad`);
  }

  getDisponibilidadSemana(): Observable<DisponibilidadSemana[]> {
    return this.http.get<DisponibilidadSemana[]>(`${this.doctoresBase}/disponibilidad/semana`);
  }

  createDoctorDisponibilidad(idDoctor: number, data: Partial<Disponibilidad>): Observable<Disponibilidad> {
    return this.http.post<Disponibilidad>(`${this.doctoresBase}/${idDoctor}/disponibilidad`, data);
  }

  deleteDoctorDisponibilidad(idDoctor: number, idDisponibilidad: number): Observable<void> {
    return this.http.delete<void>(`${this.doctoresBase}/${idDoctor}/disponibilidad/${idDisponibilidad}`);
  }

  getDoctorServicios(id: number): Observable<DoctorServicio[]> {
    return this.http.get<DoctorServicio[]>(`${this.doctoresBase}/${id}/servicios`);
  }

  getDoctorDisponibilidadEspecial(id: number): Observable<DisponibilidadEspecial[]> {
    return this.http.get<DisponibilidadEspecial[]>(`${this.doctoresBase}/${id}/disponibilidad-especial`);
  }

  createDoctorDisponibilidadEspecial(idDoctor: number, data: Partial<DisponibilidadEspecial>): Observable<DisponibilidadEspecial> {
    return this.http.post<DisponibilidadEspecial>(`${this.doctoresBase}/${idDoctor}/disponibilidad-especial`, data);
  }

  deleteDoctorDisponibilidadEspecial(idDoctor: number, idDispEspecial: number): Observable<void> {
    return this.http.delete<void>(`${this.doctoresBase}/${idDoctor}/disponibilidad-especial/${idDispEspecial}`);
  }
}
