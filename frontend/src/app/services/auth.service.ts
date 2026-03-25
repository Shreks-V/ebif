import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserInfo {
  username: string;
  nombre: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<UserInfo | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUser();
  }

  login(username: string, password: string): Observable<LoginResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, formData).pipe(
      tap((res) => {
        localStorage.setItem('token', res.access_token);
        this.loadUser();
      })
    );
  }

  loadUser(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userSubject.next({
          username: payload.sub,
          nombre: payload.nombre || payload.sub,
          rol: payload.role || 'operativo',
        });
      } catch {
        this.logout();
      }
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    this.userSubject.next(null);
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getUser(): UserInfo | null {
    return this.userSubject.value;
  }
}
