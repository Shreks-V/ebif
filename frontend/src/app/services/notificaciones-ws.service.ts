import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WsNotification {
  id: string;
  categoria: 'citas' | 'membresias' | 'almacen';
  tipo: 'info' | 'warning';
  titulo: string;
  detalle: string;
  count: number;
  link: string;
}

const MAX_RETRIES = 6;
const BASE_DELAY_MS = 3_000;

@Injectable({ providedIn: 'root' })
export class NotificacionesWsService implements OnDestroy {
  private ws: WebSocket | null = null;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private readonly _notifications$ = new Subject<WsNotification[]>();
  readonly notifications$: Observable<WsNotification[]> = this._notifications$.asObservable();

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    const token = sessionStorage.getItem('token') ?? localStorage.getItem('token');
    if (!token) return;

    const wsBase = environment.apiUrl.replace(/^http/, 'ws');
    const url = `${wsBase}/notificaciones/ws?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsNotification[];
        this._notifications$.next(data);
        this.retries = 0;
      } catch {
        // malformed frame — ignore
      }
    };

    this.ws.onclose = () => {
      if (this.destroyed) return;
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.destroyed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
  }

  private _scheduleReconnect(): void {
    if (this.retries >= MAX_RETRIES) return;
    const delay = BASE_DELAY_MS * Math.pow(2, this.retries);
    this.retries++;
    this.retryTimer = setTimeout(() => {
      if (!this.destroyed) this.connect();
    }, delay);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
