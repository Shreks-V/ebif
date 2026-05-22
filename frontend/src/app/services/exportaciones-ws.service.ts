import { Injectable } from '@angular/core';
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

      const ws = new WebSocket(`${wsBase}/exportaciones/ws/exportar?${sp.toString()}`);

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

      ws.onerror = () => observer.error(new Error('WebSocket error durante exportación'));
      ws.onclose = () => observer.complete();

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    });
  }
}
