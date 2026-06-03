import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AlmacenApiService } from '../../../../services/almacen-api.service';
import {
  ProductoItem,
  TableSortState,
  sortRows,
  formatCurrency,
} from '../../almacen.models';

type QuickFilter = 'none' | 'existencias-bajas';

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

  // Variante modal
  varianteParaProducto: { id: number; nombre: string; tipo: string } | null = null;
  varianteNombre = '';
  varianteCantidad = 0;
  varianteNivelMinimo = 5;
  varianteUnidad = 'pieza';
  varianteSubmitting = false;
  varianteError = '';

  readonly formatCurrency = formatCurrency;

  constructor(
    private readonly api: ApiService,
    private readonly almacenApi: AlmacenApiService,
  ) {}

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
    return '';
  }

  get filteredRows(): InventarioRow[] {
    let items: InventarioRow[] = [];
    const showMeds = !this.selectedCategory || this.selectedCategory === 'Medicamento';
    const showEq = !this.selectedCategory || this.selectedCategory === 'Equipo';

    if (showMeds) {
      this.productos.filter(p => p.tipoProducto === 'MEDICAMENTO' && !p.idProductoPadre).forEach(p => {
        let estado: string;
        if (p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo) {
          estado = 'Existencias bajas';
        } else if (p.cantidadDisponible === 0) {
          estado = 'Agotado';
        } else {
          estado = 'Normal';
        }
        items.push({
          id: p.idProducto, categoria: 'MEDICAMENTO', nombre: p.nombre, unidadMedida: p.unidadMedida,
          cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
          precioA: p.precioA, precioB: p.precioB, estado,
        });
      });
    }

    if (showEq) {
      this.productos.filter(p => p.tipoProducto === 'EQUIPO').forEach(p => {
        let estadoEq: string;
        if (p.cantidadDisponible === 0) {
          estadoEq = 'Agotado';
        } else if (p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo) {
          estadoEq = 'Existencias bajas';
        } else {
          estadoEq = p.estatusEquipo ?? 'N/A';
        }
        items.push({
          id: p.idProducto, categoria: 'EQUIPO', nombre: p.nombre, unidadMedida: p.unidadMedida,
          cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
          precioA: p.precioA, precioB: p.precioB, estado: estadoEq,
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

  // ── Variantes ──────────────────────────────────────────────────────────────
  openVarianteModal(item: InventarioRow): void {
    this.varianteParaProducto = { id: item.id, nombre: item.nombre, tipo: item.categoria };
    this.varianteNombre = '';
    this.varianteCantidad = 0;
    this.varianteNivelMinimo = 5;
    this.varianteUnidad = 'pieza';
    this.varianteError = '';
  }

  closeVarianteModal(): void { this.varianteParaProducto = null; }

  confirmarVariante(): void {
    if (!this.varianteParaProducto || !this.varianteNombre.trim() || this.varianteSubmitting) return;
    this.varianteSubmitting = true;
    this.varianteError = '';
    this.almacenApi.createVariante(this.varianteParaProducto.id, {
      nombre_variante: this.varianteNombre.trim(),
      cantidad_disponible: this.varianteCantidad,
      nivel_minimo: this.varianteNivelMinimo,
      unidad_medida: this.varianteUnidad,
    }).subscribe({
      next: () => {
        this.varianteSubmitting = false;
        this.varianteParaProducto = null;
        this.refreshNeeded.emit();
      },
      error: (err) => {
        this.varianteSubmitting = false;
        this.varianteError = err?.error?.detail || 'Error al crear la variante';
      },
    });
  }

  /** Determina si un producto es padre (standalone sin padre) y puede tener variantes */
  esPadre(row: InventarioRow): boolean {
    const prod = this.productos.find(p => p.idProducto === row.id);
    return !prod?.idProductoPadre && prod?.tipoProducto === 'MEDICAMENTO';
  }

  /** Cuenta variantes de un producto padre */
  contarVariantes(row: InventarioRow): number {
    return this.productos.filter(p => p.idProductoPadre === row.id).length;
  }

  /** Devuelve las variantes de un producto padre */
  getVariantes(idPadre: number): ProductoItem[] {
    return this.productos.filter(p => p.idProductoPadre === idPadre);
  }

  private _matchesQuickFilter(item: InventarioRow): boolean {
    if (this.quickFilter === 'existencias-bajas') {
      if (this.stockBajoIds.size > 0) return this.stockBajoIds.has(item.id);
      return item.cantidadDisponible !== null && item.nivelMinimo !== null && item.cantidadDisponible < item.nivelMinimo;
    }
    return true;
  }
}
