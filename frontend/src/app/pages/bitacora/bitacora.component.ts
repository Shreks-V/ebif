import { Component, DestroyRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BitacoraApiService } from '../../services/bitacora-api.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { DetalleBitacoraModalComponent } from './modals/detalle-bitacora-modal.component';
import { BitacoraItem, BitacoraFilter } from '../../shared/models/bitacora.models';
import { REFRESH_INTERVAL_MS } from '../../shared/constants/app.constants';
import { KeyboardClickDirective } from '../../shared/directives/keyboard-click.directive';

const TIPO_LABELS: Record<string, string> = {
  INSERT: 'Inserción',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  CANCELACION: 'Cancelación',
};

const TABLA_LABELS: Record<string, string> = {
  PACIENTE: 'Beneficiarios',
  CITA: 'Citas',
  VENTA: 'Recibos',
  PRODUCTO: 'Productos',
  SERVICIO: 'Servicios',
  COMODATO: 'Comodatos',
  USUARIO_SISTEMA: 'Usuarios',
  MEMBRESIA: 'Membresías',
};

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, DetalleBitacoraModalComponent, KeyboardClickDirective],
  templateUrl: './bitacora.component.html',
})
export class BitacoraComponent implements OnInit, OnDestroy {
  items: BitacoraItem[] = [];
  total = 0;
  loading = false;

  filtroBusqueda = '';
  filtroTabla = '';
  filtroTipo = '';
  fechaInicio = '';
  fechaFin = '';

  page = 1;
  readonly pageSize = 50;
  sortKey = 'fecha_cambio';
  sortDir: 'asc' | 'desc' = 'desc';

  private _debounce: ReturnType<typeof setTimeout> | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  readonly tablaOptions = Object.entries(TABLA_LABELS).map(([key, label]) => ({ key, label }));

  selectedItem: BitacoraItem | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly bitacoraApi: BitacoraApiService) {}

  openDetail(item: BitacoraItem): void {
    this.selectedItem = item;
  }

  ngOnInit(): void {
    this.cargar();
    this._timer = setInterval(() => this._silentRefresh(), REFRESH_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
    if (this._debounce) clearTimeout(this._debounce);
  }

  get hayFiltros(): boolean {
    return !!(this.filtroBusqueda || this.filtroTabla || this.filtroTipo || this.fechaInicio || this.fechaFin);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get sorted(): BitacoraItem[] {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...this.items].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      const bv = (b as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  get paginated(): BitacoraItem[] {
    return this.sorted;
  }

  toggleSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'desc';
    }
    this.page = 1;
    this.fetchPage();
  }

  onBusquedaChange(): void {
    this.page = 1;
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this.cargar(), 400);
  }

  onFiltroChange(): void {
    this.page = 1;
    this.cargar();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda = '';
    this.filtroTabla = '';
    this.filtroTipo = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.page = 1;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.bitacoraApi.getBitacora(this._buildParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.items = data.items;
          this.total = data.total;
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  fetchPage(): void {
    this.cargar();
  }

  tipoLabel(tipo: string): string {
    return TIPO_LABELS[tipo] ?? tipo;
  }

  tipoClass(tipo: string): string {
    if (tipo === 'INSERT') return 'bg-emerald-100 text-emerald-700';
    if (tipo === 'UPDATE') return 'bg-blue-100 text-blue-700';
    if (tipo === 'DELETE') return 'bg-red-100 text-red-700';
    if (tipo === 'CANCELACION') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  tablaLabel(tabla: string | undefined): string {
    if (!tabla) return '—';
    return TABLA_LABELS[tabla] ?? tabla;
  }

  formatFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const utc = /[Z+]/.test(iso) ? iso : iso + 'Z';
      return new Date(utc).toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch {
      return iso;
    }
  }

  private _silentRefresh(): void {
    this.bitacoraApi.getBitacora(this._buildParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.items = data.items; this.total = data.total; },
        error: () => {},
      });
  }

  private _buildParams(): BitacoraFilter {
    const params: BitacoraFilter = { limit: this.pageSize, offset: (this.page - 1) * this.pageSize };
    if (this.filtroBusqueda) params['busqueda'] = this.filtroBusqueda;
    if (this.filtroTabla) params['tabla'] = this.filtroTabla;
    if (this.filtroTipo) params['tipo_operacion'] = this.filtroTipo;
    if (this.fechaInicio) params['fecha_inicio'] = this.fechaInicio;
    if (this.fechaFin) params['fecha_fin'] = this.fechaFin;
    return params;
  }
}
