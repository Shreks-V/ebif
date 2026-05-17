import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  cambiarContrasena(data: { contrasena_actual: string; contrasena_nueva: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/cambiar-contrasena`, data);
  }

  listarUsuariosSistema(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/usuarios`);
  }

  crearUsuarioSistema(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/usuarios`, data);
  }

  actualizarUsuarioSistema(idUsuario: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/usuarios/${idUsuario}`, data);
  }

  adminResetContrasena(idUsuario: number, data: { contrasena_nueva: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/usuarios/${idUsuario}/reset-contrasena`, data);
  }

  seedUsers(): Observable<any> {
    return this.http.post<any>(`${this.base}/seed`, {});
  }
}
