import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  UsuarioSistema, CrearUsuarioPayload, ActualizarUsuarioPayload,
  CambiarContrasenaPayload, ResetContrasenaPayload,
} from '../shared/models/usuario-sistema.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  cambiarContrasena(data: CambiarContrasenaPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/cambiar-contrasena`, data);
  }

  listarUsuariosSistema(): Observable<UsuarioSistema[]> {
    return this.http.get<UsuarioSistema[]>(`${this.base}/usuarios`);
  }

  crearUsuarioSistema(data: CrearUsuarioPayload): Observable<UsuarioSistema> {
    return this.http.post<UsuarioSistema>(`${this.base}/usuarios`, data);
  }

  actualizarUsuarioSistema(idUsuario: number, data: ActualizarUsuarioPayload): Observable<UsuarioSistema> {
    return this.http.put<UsuarioSistema>(`${this.base}/usuarios/${idUsuario}`, data);
  }

  adminResetContrasena(idUsuario: number, data: ResetContrasenaPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/usuarios/${idUsuario}/reset-contrasena`, data);
  }

  seedUsers(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/seed`, {});
  }
}
