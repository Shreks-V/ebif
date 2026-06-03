import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err) => {
      const status: number = err?.status ?? 0;
      const detail: string = err?.error?.detail ?? err?.message ?? 'Error inesperado';

      if (status >= 500) {
        console.error(`[HTTP ${status}] ${req.method} ${req.url}`, err);
        toast.show(`Error del servidor (${status}): ${detail}`, 'error');
      } else if (status === 0) {
        console.error('[HTTP] Sin respuesta del servidor', err);
        toast.show('No se pudo conectar con el servidor. Verifica tu conexión.', 'error');
      }

      return throwError(() => err);
    }),
  );
};
