import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AutoGrowDirective } from '../../../../shared/directives/auto-grow.directive';
import { ServicioItem, formatCurrency } from '../../almacen.models';

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

  search = '';
  showEditModal = false;
  editId = 0;
  editForm: any = null;
  submitting = false;

  readonly formatCurrency = formatCurrency;

  constructor(private api: ApiService) {}

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
        console.error('Error al actualizar servicio:', err);
        this.submitting = false;
      },
    });
  }
}
