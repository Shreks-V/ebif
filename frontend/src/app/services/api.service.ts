import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Beneficiarios
  getBeneficiarios(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/beneficiarios`, { params });
  }

  getBeneficiario(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/${id}`);
  }

  createBeneficiario(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/beneficiarios`, data);
  }

  updateBeneficiario(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/beneficiarios/${id}`, data);
  }

  getBeneficiarioHistorial(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/${id}/historial`);
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/beneficiarios/stats/dashboard`);
  }

  // Citas
  getCitas(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/citas`, { params });
  }

  createCita(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas`, data);
  }

  updateCita(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/citas/${id}`, data);
  }

  getCitasHoy(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/hoy`);
  }

  // Doctores
  getDoctores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctores`);
  }

  createDoctor(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/doctores`, data);
  }

  updateDoctor(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/doctores/${id}`, data);
  }

  // Almacén
  getProductos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/productos`, { params });
  }

  createProducto(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/productos`, data);
  }

  updateProducto(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/almacen/productos/${id}`, data);
  }

  getServicios(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/servicios`, { params });
  }

  createServicio(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/servicios`, data);
  }

  getComodatos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/almacen/comodatos`, { params });
  }

  createComodato(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/almacen/comodatos`, data);
  }

  updateComodato(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/almacen/comodatos/${id}`, data);
  }

  getAlmacenStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/almacen/stats`);
  }

  // Recibos
  getRecibos(filters?: any): Observable<any[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/recibos`, { params });
  }

  createRecibo(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/recibos`, data);
  }

  getRecibo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recibos/${id}`);
  }

  getRecibosResumen(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/recibos/stats/resumen`);
  }

  // Reportes
  getPersonasAtendidas(filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params = params.set(key, filters[key]);
      });
    }
    return this.http.get<any>(`${this.apiUrl}/reportes/personas-atendidas`, { params });
  }

  getPorGenero(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/por-genero`);
  }

  getPorProcedencia(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/por-procedencia`);
  }

  getPorEtapaVida(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/por-etapa-vida`);
  }

  getServiciosTop(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/servicios-top`);
  }

  getResumenMensual(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/resumen-mensual`);
  }

  getReporteFundacion(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/fundacion`);
  }

  // Pre-registro
  getPreRegistros(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/preregistro`);
  }

  createPreRegistro(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/preregistro`, data);
  }
}
