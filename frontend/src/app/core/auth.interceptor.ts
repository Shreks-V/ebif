import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Public preregistro endpoints that must NOT carry the auth token:
 *  - POST   /api/preregistro           (create pre-registro)
 *  - GET    /api/preregistro/tipos-espina
 *  - GET    /api/preregistro/tipos-documento
 *
 * Scoped preregistro resources are protected with X-Preregistro-Token when
 * there is no authenticated user session:
 *  - POST   /api/preregistro/:id/documentos
 *  - GET    /api/preregistro/:id/documentos
 *  - DELETE /api/preregistro/:id/documentos/:id
 *  - PUT    /api/preregistro/:id
 *  - GET    /api/preregistro/:id
 *
 * Admin endpoints like /aprobar, /rechazar and GET list MUST carry the token.
 */
function isPublicPreregistroUrl(url: string, method: string): boolean {
  // Always public: login
  if (url.includes('/login')) return true;

  // Not a preregistro URL at all
  if (!url.includes('/preregistro')) return false;

  // Public catalog endpoints
  if (url.includes('/tipos-espina') || url.includes('/tipos-documento')) return true;

  // Document upload/listing: /preregistro/<id>/documentos
  if (/\/preregistro\/\d+\/documentos/.test(url)) return true;

  // POST to base /preregistro (create new) — no trailing path after /preregistro
  if (method === 'POST' && /\/preregistro\/?$/.test(url)) return true;

  // PUT/GET to /preregistro/<id> (update/get multi-step form)
  if ((method === 'PUT' || method === 'GET') && /\/preregistro\/\d+\/?$/.test(url)) return true;

  // Everything else (list, aprobar, rechazar) requires auth
  return false;
}

function isScopedPreregistroResourceUrl(url: string): boolean {
  if (!url.includes('/preregistro')) return false;

  if (/\/preregistro\/\d+\/?$/.test(url)) return true;
  if (/\/preregistro\/\d+\/documentos(\/\d+)?(\/archivo)?\/?$/.test(url)) return true;

  return false;
}

function getAuthToken(): string | null {
  const sessionToken = sessionStorage.getItem('token');
  if (sessionToken) return sessionToken;

  const legacyToken = localStorage.getItem('token');
  if (legacyToken) {
    sessionStorage.setItem('token', legacyToken);
    localStorage.removeItem('token');
    return legacyToken;
  }
  return null;
}

const REFRESH_THRESHOLD_SECONDS = 30 * 60; // renew if < 30 min left

import type { HttpRequest } from '@angular/common/http';
function addHeaders(r: HttpRequest<unknown>, token: string | null, preregistroToken: string | null) {
  if (preregistroToken && isScopedPreregistroResourceUrl(r.url)) {
    r = r.clone({ setHeaders: { 'X-Preregistro-Token': preregistroToken } });
  }
  if (token && !isPublicPreregistroUrl(r.url, r.method)) {
    r = r.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return r;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = getAuthToken();
  const preregistroToken = sessionStorage.getItem('preregistro_token');

  // Never refresh on auth endpoints to avoid infinite loops
  const isAuthEndpoint = req.url.includes('/auth/');
  const isPublic = isPublicPreregistroUrl(req.url, req.method);

  const handle = (t: string | null) => {
    const r = addHeaders(req, t, preregistroToken);
    return next(r).pipe(
      catchError((err) => {
        if (err.status === 401 && !isPublic) authService.logout();
        return throwError(() => err);
      }),
    );
  };

  // Proactive refresh: if token is valid but close to expiry, renew first
  if (token && !isAuthEndpoint && !isPublic && authService.tokenSecondsLeft() < REFRESH_THRESHOLD_SECONDS) {
    return authService.refreshToken().pipe(
      switchMap(() => handle(getAuthToken())),
    );
  }

  return handle(token);
};
