import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Public preregistro endpoints that must NOT carry the auth token:
 *  - POST   /api/preregistro           (create pre-registro)
 *  - GET    /api/preregistro/tipos-espina
 *  - GET    /api/preregistro/tipos-documento
 *  - POST   /api/preregistro/:id/documentos  (upload document)
 *  - GET    /api/preregistro/:id/documentos  (list documents)
 *  - DELETE /api/preregistro/:id/documentos/:id (delete document)
 *  - PUT    /api/preregistro/:id       (update multi-step form)
 *  - GET    /api/preregistro/:id       (get pre-registro detail)
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

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token && !isPublicPreregistroUrl(req.url, req.method)) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
