import { Component, DestroyRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../services/api.service';
import { Movimiento } from '../../../../shared/models/almacen.models';
import { REFRESH_INTERVAL_MS, HISTORIAL_DEBOUNCE_MS } from '../../../../shared/constants/app.constants';

interface MovimientoParams {
  limit: number;
  busqueda?: string;
  tipo_movimiento?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

@Component({
  selector: 'app-historial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-tab.component.html',
})
export class HistorialTabComponent implements OnInit, OnDestroy {
  items: Movimiento[] = [];
  loading = false;
  filtroProducto = '';
  filtroTipo = '';
  fechaInicio = '';
  fechaFin = '';
  page = 1;
  readonly pageSize = 20;
  sortKey = 'fecha_movimiento';
  sortDir: 'asc' | 'desc' = 'desc';

  private _debounce: ReturnType<typeof setTimeout> | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.cargar();
    this._timer = setInterval(() => this._silentRefresh(), REFRESH_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
    if (this._debounce) clearTimeout(this._debounce);
  }

  get hayFiltros(): boolean {
    return !!(this.filtroProducto || this.filtroTipo || this.fechaInicio || this.fechaFin);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.items.length / this.pageSize)); }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.items.length); }

  get sorted(): Movimiento[] {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...this.items].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      const bv = (b as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  get paginated(): Movimiento[] {
    const start = (this.page - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  toggleSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = (key === 'fecha_movimiento' || key === 'cantidad') ? 'desc' : 'asc';
    }
    this.page = 1;
  }

  onBusquedaChange(): void {
    this.page = 1;
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this.cargar(), HISTORIAL_DEBOUNCE_MS);
  }

  onFiltroChange(): void {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroProducto = '';
    this.filtroTipo = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.page = 1;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api.getMovimientos(this._buildParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.items = data; this.loading = false; this.page = 1; },
        error: () => { this.loading = false; },
      });
  }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      ENTRADA: 'Entrada',
      SALIDA: 'Salida',
      AJUSTE: 'Ajuste',
      AJUSTE_POS: 'Ajuste +',
      AJUSTE_NEG: 'Ajuste −',
      SALIDA_MERMA: 'Merma',
      SALIDA_VENTA: 'Venta',
      SALIDA_COMODATO: 'Comodato',
    };
    return map[tipo] ?? tipo;
  }

  tipoClass(tipo: string): string {
    if (tipo === 'ENTRADA' || tipo === 'AJUSTE_POS') return 'bg-emerald-100 text-emerald-700';
    if (tipo === 'SALIDA' || tipo === 'SALIDA_VENTA') return 'bg-red-100 text-red-700';
    if (tipo === 'SALIDA_COMODATO') return 'bg-purple-100 text-purple-700';
    if (tipo === 'AJUSTE' || tipo === 'AJUSTE_NEG') return 'bg-blue-100 text-blue-700';
    if (tipo === 'SALIDA_MERMA') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  tipoSigno(tipo: string): string {
    return (tipo === 'ENTRADA' || tipo === 'AJUSTE' || tipo === 'AJUSTE_POS') ? '+' : '-';
  }

  cantidadClass(tipo: string): string {
    if (tipo === 'ENTRADA' || tipo === 'AJUSTE_POS') return 'text-emerald-600';
    if (tipo === 'SALIDA_VENTA' || tipo === 'SALIDA' || tipo === 'SALIDA_MERMA' || tipo === 'SALIDA_COMODATO') return 'text-red-600';
    return 'text-blue-600';
  }

  private _silentRefresh(): void {
    this.api.getMovimientos(this._buildParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.items = data; },
        error: () => {},
      });
  }

  private _buildParams(): MovimientoParams {
    const params: MovimientoParams = { limit: 500 };
    if (this.filtroProducto) params['busqueda'] = this.filtroProducto;
    if (this.filtroTipo) params['tipo_movimiento'] = this.filtroTipo;
    if (this.fechaInicio) params['fecha_inicio'] = this.fechaInicio;
    if (this.fechaFin) params['fecha_fin'] = this.fechaFin;
    return params;
  }
}
