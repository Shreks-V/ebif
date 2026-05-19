import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import {
  ProductoItem,
  TableSortState,
  sortRows,
  formatCurrency,
} from '../../almacen.models';

type QuickFilter = 'none' | 'existencias-bajas' | 'proximos-vencer';

export interface InventarioRow {
  id: number;
  categoria: string;
  nombre: string;
  unidadMedida: string;
  cantidadDisponible: number | null;
  nivelMinimo: number | null;
  precioA: number | null;
  precioB: number | null;
  estado: string;
  fechaCaducidad?: string | null;
}

@Component({
  selector: 'app-inventario-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario-tab.component.html',
})
export class InventarioTabComponent {
  @Input() productos: ProductoItem[] = [];
  @Input() isAdmin = false;
  @Input() stockBajoIds: Set<number> = new Set();
  @Input() proximosVencerIds: Set<number> = new Set();
  @Input() quickFilter: QuickFilter = 'none';
  @Input() selectedCategory: string | null = null;
  @Output() quickFilterChange = new EventEmitter<QuickFilter>();
  @Output() selectedCategoryChange = new EventEmitter<string | null>();
  @Output() requestAdd = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<{ id: number; categoria: string; nombre: string }>();
  @Output() requestDelete = new EventEmitter<{ id: number; nombre: string; categoria: string }>();
  @Output() refreshNeeded = new EventEmitter<void>();

  search = '';
  sort: TableSortState = { key: 'id', direction: 'asc' };

  quickStockItem: { id: number; nombre: string; cantidadActual: number } | null = null;
  quickStockCantidad = 1;
  quickStockMotivo = 'Recepción de mercancía';
  quickStockSubmitting = false;

  readonly formatCurrency = formatCurrency;

  constructor(private readonly api: ApiService) {}

  getCategoryCount(categoria: string): number {
    if (categoria === 'Medicamento') return this.productos.filter(p => p.tipoProducto === 'MEDICAMENTO').length;
    if (categoria === 'Equipo') return this.productos.filter(p => p.tipoProducto === 'EQUIPO').length;
    return 0;
  }

  toggleCategory(cat: string): void {
    this.selectedCategoryChange.emit(this.selectedCategory === cat ? null : cat);
  }

  limpiarFiltros(): void {
    this.quickFilterChange.emit('none');
    this.selectedCategoryChange.emit(null);
  }

  get quickFilterLabel(): string {
    if (this.quickFilter === 'existencias-bajas') return 'Mostrando: existencias bajas';
    if (this.quickFilter === 'proximos-vencer') return 'Mostrando: próximos a vencer';
    return '';
  }

  get filteredRows(): InventarioRow[] {
    let items: InventarioRow[] = [];
    const showMeds = !this.selectedCategory || this.selectedCategory === 'Medicamento';
    const showEq = !this.selectedCategory || this.selectedCategory === 'Equipo';

    if (showMeds) {
      this.productos.filter(p => p.tipoProducto === 'MEDICAMENTO').forEach(p => {
        const estado = (p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo)
          ? 'Existencias bajas'
          : (p.cantidadDisponible === 0 ? 'Agotado' : 'Normal');
        items.push({
          id: p.idProducto, categoria: 'MEDICAMENTO', nombre: p.nombre, unidadMedida: p.unidadMedida,
          cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
          precioA: p.precioA, precioB: p.precioB, estado, fechaCaducidad: p.fechaCaducidad,
        });
      });
    }

    if (showEq) {
      this.productos.filter(p => p.tipoProducto === 'EQUIPO').forEach(p => {
        items.push({
          id: p.idProducto, categoria: 'EQUIPO', nombre: p.nombre, unidadMedida: p.unidadMedida,
          cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
          precioA: p.precioA, precioB: p.precioB, estado: p.estatusEquipo ?? 'N/A', fechaCaducidad: p.fechaCaducidad,
        });
      });
    }

    if (this.quickFilter !== 'none') {
      items = items.filter(item => this._matchesQuickFilter(item));
    }

    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      items = items.filter(i => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q));
    }

    return sortRows(items, this.sort, (item, key) => {
      switch (key) {
        case 'id': return item.id;
        case 'categoria': return item.categoria;
        case 'nombre': return item.nombre;
        case 'unidad': return item.unidadMedida || '';
        case 'stock': return item.cantidadDisponible ?? -1;
        case 'precioA': return item.precioA ?? -1;
        case 'precioB': return item.precioB ?? -1;
        case 'estado': return item.estado;
        default: return item.id;
      }
    });
  }

  toggleSort(key: string): void {
    if (this.sort.key === key) {
      this.sort = { key, direction: this.sort.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      this.sort = { key, direction: 'asc' };
    }
  }

  sortIndicator(key: string): string {
    if (this.sort.key !== key) return '-';
    return this.sort.direction === 'asc' ? '^' : 'v';
  }

  getCategoryIconBg(categoria: string): string {
    if (categoria === 'MEDICAMENTO') return 'bg-blue-100';
    if (categoria === 'EQUIPO') return 'bg-green-100';
    return 'bg-slate-100';
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Normal': case 'DISPONIBLE': return 'bg-green-100 text-green-700';
      case 'Existencias bajas': case 'Bajo Stock': return 'bg-amber-100 text-amber-700';
      case 'EN_PRESTAMO': return 'bg-blue-100 text-blue-700';
      case 'Agotado': return 'bg-red-100 text-red-700';
      case 'EN_MANTENIMIENTO': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  openQuickStock(item: InventarioRow): void {
    this.quickStockItem = { id: item.id, nombre: item.nombre, cantidadActual: item.cantidadDisponible ?? 0 };
    this.quickStockCantidad = 1;
    this.quickStockMotivo = 'Recepción de mercancía';
  }

  closeQuickStock(): void { this.quickStockItem = null; }
  quickStockDecrement(): void { if (this.quickStockCantidad > 1) this.quickStockCantidad--; }
  quickStockIncrement(): void { this.quickStockCantidad++; }

  confirmQuickStock(): void {
    if (!this.quickStockItem || this.quickStockCantidad < 1 || this.quickStockSubmitting) return;
    this.quickStockSubmitting = true;
    const nuevoStock = this.quickStockItem.cantidadActual + this.quickStockCantidad;
    this.api.ajustarExistencia(this.quickStockItem.id, nuevoStock, this.quickStockMotivo || 'Entrada de stock').subscribe({
      next: () => {
        this.quickStockSubmitting = false;
        this.quickStockItem = null;
        this.refreshNeeded.emit();
      },
      error: () => { this.quickStockSubmitting = false; },
    });
  }

  private _matchesQuickFilter(item: InventarioRow): boolean {
    if (this.quickFilter === 'existencias-bajas') {
      if (this.stockBajoIds.size > 0) return this.stockBajoIds.has(item.id);
      return item.cantidadDisponible !== null && item.nivelMinimo !== null && item.cantidadDisponible < item.nivelMinimo;
    }
    if (this.quickFilter === 'proximos-vencer') {
      if (this.proximosVencerIds.size > 0) return this.proximosVencerIds.has(item.id);
      return this._isCaducidadEnRiesgo(item.fechaCaducidad);
    }
    return true;
  }

  private _isCaducidadEnRiesgo(fechaCaducidad?: string | null): boolean {
    if (!fechaCaducidad) return false;
    const normalized = fechaCaducidad.includes('T') ? fechaCaducidad : `${fechaCaducidad}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return false;
    const fecha = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const hoy = new Date();
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const limite = new Date(base);
    limite.setDate(base.getDate() + 30);
    return fecha <= limite;
  }
}
