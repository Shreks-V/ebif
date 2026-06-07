import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/toast.service';
import { getApiError } from '../../../../shared/utils/error.utils';
import { AutoGrowDirective } from '../../../../shared/directives/auto-grow.directive';
import { ServicioItem, formatCurrency } from '../../almacen.models';

interface ServicioEditForm {
  nombre: string;
  descripcion: string;
  precio_cuota_a: number | null;
  precio_cuota_b: number | null;
  activo: string;
  categoria: string;
}

@Component({
  selector: 'app-servicios-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoGrowDirective],
  templateUrl: './servicios-tab.component.html',
})
export class ServiciosTabComponent {
  @Input() servicios: ServicioItem[] = [];
  @Input() isAdmin = false;
  @Output() requestAdd = new EventEmitter<void>();
  @Output() requestDelete = new EventEmitter<{ id: number; nombre: string; categoria: string }>();
  @Output() refreshNeeded = new EventEmitter<void>();

  private _search = '';
  get search(): string { return this._search; }
  set search(value: string) { this._search = value; this.page = 1; }

  page = 1;
  readonly pageSize = 10;

  get paginatedFiltered(): ServicioItem[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.ceil(this.filtered.length / this.pageSize) || 1; }
  get start(): number { return (this.page - 1) * this.pageSize; }
  get end(): number { return Math.min(this.start + this.pageSize, this.filtered.length); }

  showEditModal = false;
  editId = 0;
  editForm: ServicioEditForm | null = null;
  submitting = false;

  readonly formatCurrency = formatCurrency;
  private readonly toast = inject(ToastService);

  constructor(private readonly api: ApiService) {}

  get filtered(): ServicioItem[] {
    if (!this.search.trim()) return this.servicios;
    const q = this.search.toLowerCase();
    return this.servicios.filter(s =>
      s.nombre.toLowerCase().includes(q) || (s.descripcion || '').toLowerCase().includes(q)
    );
  }

  openEdit(id: number): void {
    const s = this.servicios.find(sv => sv.idServicio === id);
    if (!s) return;
    this.editId = s.idServicio;
    this.editForm = {
      nombre: s.nombre,
      descripcion: s.descripcion || '',
      precio_cuota_a: s.precioA,
      precio_cuota_b: s.precioB,
      activo: s.activo,
      categoria: s.categoria ?? 'SERVICIO',
    };
    this.showEditModal = true;
  }

  guardar(): void {
    if (!this.editForm?.nombre) return;
    this.submitting = true;
    this.api.updateServicio(this.editId, this.editForm).subscribe({
      next: () => {
        this.showEditModal = false;
        this.submitting = false;
        this.refreshNeeded.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.toast.show(getApiError(err, 'Error al actualizar el servicio. Intenta de nuevo.'), 'error');
      },
    });
  }
}
