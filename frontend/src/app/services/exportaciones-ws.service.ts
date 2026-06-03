import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExportProgress {
  step: number;
  total: number;
  message: string;
  filename?: string;
  media_type?: string;
  data?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ExportacionesWsService {
  constructor(private readonly http: HttpClient) {}

  exportarReportePdf(params: Record<string, string | number | null | undefined>): Observable<ExportProgress> {
    return new Observable(observer => {
      const token = sessionStorage.getItem('token') ?? localStorage.getItem('token') ?? '';
      const wsBase = environment.apiUrl.replace(/^http/, 'ws');
      const sp = new URLSearchParams({ token });

      for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined && v !== '') {
          sp.set(k, String(v));
        }
      }

      let wsOpened = false;
      let fallbackTriggered = false;

      const ws = new WebSocket(`${wsBase}/exportaciones/ws/exportar?${sp.toString()}`);

      // Si WebSocket no conecta en 4s (proxy sin soporte WS), usamos HTTP como fallback
      const wsTimeout = setTimeout(() => {
        if (!wsOpened && !fallbackTriggered) {
          fallbackTriggered = true;
          ws.close();
          this._fallbackHttp(params, token, observer);
        }
      }, 4000);

      ws.onopen = () => {
        wsOpened = true;
        clearTimeout(wsTimeout);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const frame = JSON.parse(event.data as string) as ExportProgress;
          observer.next(frame);
          if (frame.data || frame.error) {
            observer.complete();
          }
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onerror = () => {
        clearTimeout(wsTimeout);
        if (!fallbackTriggered) {
          fallbackTriggered = true;
          this._fallbackHttp(params, token, observer);
        }
      };

      ws.onclose = () => {
        clearTimeout(wsTimeout);
        if (!fallbackTriggered) observer.complete();
      };

      return () => {
        clearTimeout(wsTimeout);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    });
  }

  /** Fallback: descarga el PDF vía HTTP normal cuando WebSocket no está disponible. */
  private _fallbackHttp(
    params: Record<string, string | number | null | undefined>,
    _token: string,
    observer: { next: (v: ExportProgress) => void; error: (e: unknown) => void; complete: () => void },
  ): void {
    observer.next({ step: 1, total: 3, message: 'Generando PDF…' });

    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    }

    this.http.get(`${environment.apiUrl}/exportaciones/reporte/pdf`, {
      params: httpParams,
      responseType: 'blob',
      observe: 'response',
    }).subscribe({
      next: (resp) => {
        observer.next({ step: 2, total: 3, message: 'Descargando…' });
        const blob = resp.body;
        if (!blob) { observer.error(new Error('PDF vacío')); return; }

        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1];
          const cd = resp.headers.get('Content-Disposition') ?? '';
          const match = cd.match(/filename="?([^";\n]+)"?/);
          const filename = match?.[1] ?? 'reporte.pdf';

          observer.next({
            step: 3, total: 3, message: 'Listo',
            filename, media_type: 'application/pdf', data: b64,
          });
          observer.complete();
        };
        reader.onerror = () => observer.error(new Error('Error al leer el PDF'));
        reader.readAsDataURL(blob);
      },
      error: (err) => observer.error(err),
    });
  }
}
